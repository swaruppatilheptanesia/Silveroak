import { prisma } from '../../config/database';
import { NotFoundError, ValidationError, BusinessRuleError, ConflictError } from '../../shared/errors';
import { findDuplicateCompany } from '../../shared/utils/company-name';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { normalizeSpreadsheetHeader, parseSpreadsheetRows } from '../../shared/utils/spreadsheet';
import { buildDateRangeCondition } from '../../shared/utils/student-scope-filter';
import { logger } from '../../config/logger';
import { generateTemporaryPassword, hashPassword } from '../../shared/utils/password';
import type {
  CreateCompanyInput,
  UpdateCompanyInput,
  ClassifyCompanyInput,
  QueryCompaniesInput,
  QueryRecruitersInput,
  CreateRecruiterInput,
  UpdateRecruiterInput,
  VerifyRecruiterInput,
  CreateEngagementInput,
} from './employer.schema';
import { EngagementType, VerificationStatus, Prisma } from '@prisma/client';
import { createNotification } from '../notifications/notification.service';

// =========================================================
// Companies
// =========================================================

const companyImportHeaderAliases = {
  name: new Set(['name', 'company', 'companyname']),
  industry: new Set(['industry', 'sector']),
  website: new Set(['website', 'websitelink', 'url', 'companywebsite']),
  address: new Set(['address', 'companyaddress', 'location']),
  description: new Set(['description', 'about', 'aboutcompany', 'companydescription']),
  recruiter_name: new Set(['recruitername', 'recruiter', 'contactname', 'recruiter_name']),
  recruiter_email: new Set(['recruiteremail', 'contactemail', 'recruiter_email']),
  recruiter_phone: new Set(['recruiterphone', 'contactphone', 'recruiter_phone', 'phone']),
  recruiter_designation: new Set(['recruiterdesignation', 'contactdesignation', 'designation', 'recruiter_designation']),
};

const companyImportHeaderGroups = Object.values(companyImportHeaderAliases);

function normalizeOptionalText(value: string | undefined) {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
}

function normalizeWebsite(value: string | undefined) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function findImportColumn(headers: string[], aliases: Set<string>) {
  return headers.findIndex((header) => aliases.has(header));
}

function getHeaderMatchScore(headers: string[]) {
  return headers.reduce((count, header) => (
    companyImportHeaderGroups.some((aliases) => aliases.has(header)) ? count + 1 : count
  ), 0);
}

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
function getCompanyOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.CompanyOrderByWithRelationInput {
  switch (sortBy) {
    case 'name': return { name: sortOrder };
    case 'industry': return { industry: sortOrder };
    case 'status': return { status: sortOrder };
    case 'classification': return { classification: sortOrder };
    case 'created_at': return { created_at: sortOrder };
    default: return { name: sortOrder };
  }
}

export async function getCompanies(tenantId: string, filters: QueryCompaniesInput) {
  const { page, limit, search, status, classification, sort_by, sort_order, industry, date_from, date_to } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };

  if (status) where.status = status;
  if (classification) where.classification = classification;
  if (industry) where.industry = { contains: industry, mode: 'insensitive' };
  const companyDateRange = buildDateRangeCondition(date_from, date_to);
  if (companyDateRange) where.created_at = companyDateRange;
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: getCompanyOrderBy(sort_by, sort_order),
    }),
    prisma.company.count({ where }),
  ]);

  return { data: companies, pagination: paginate(page, limit, total) };
}

export async function getCompanyById(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      _count: {
        select: {
          recruiters: true,
          engagements: true,
          postings: true,
          offers: true,
        },
      },
    },
  });

  if (!company) throw new NotFoundError('Company');
  return company;
}

export async function createCompany(tenantId: string, data: CreateCompanyInput, userId?: string) {
  // Reject a name that already exists ignoring case/spacing/punctuation. The UI warns first,
  // but this is the authoritative check (it also covers direct API callers).
  const duplicate = await findDuplicateCompany(tenantId, data.name);
  if (duplicate) {
    throw new ConflictError(
      `A company named "${duplicate.name}" already exists. Select it instead of creating a new one.`,
      'COMPANY_ALREADY_EXISTS'
    );
  }

  const company = await prisma.company.create({
    data: { tenant_id: tenantId, ...data },
  });

  if (userId) {
    prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        action: 'create',
        module: 'companies',
        target_type: 'companies',
        target_id: company.id,
        details: `Created company: ${company.name}`,
      },
    }).catch(err => logger.error({ err }, 'Audit log failed'));
  }

  return company;
}

export async function importCompanies(
  tenantId: string,
  actor: Express.AuthUser,
  file: Express.Multer.File | undefined
) {
  if (!file) {
    throw new ValidationError('Upload a CSV or XLSX file');
  }

  const rows = await parseSpreadsheetRows(file.path, file.originalname);
  if (rows.length === 0) {
    throw new ValidationError('The uploaded file does not contain any rows');
  }

  const headerRowCandidates = rows
    .slice(0, Math.min(rows.length, 10))
    .map((row, index) => ({
      index,
      headers: row.map(normalizeSpreadsheetHeader),
    }));

  const bestHeaderCandidate = headerRowCandidates.reduce<{
    index: number;
    headers: string[];
    score: number;
  } | null>((best, candidate) => {
    const score = getHeaderMatchScore(candidate.headers);
    if (!best || score > best.score) {
      return { index: candidate.index, headers: candidate.headers, score };
    }
    return best;
  }, null);

  const headerRowIndex = bestHeaderCandidate?.score ? bestHeaderCandidate.index : 0;
  const headers = rows[headerRowIndex].map(normalizeSpreadsheetHeader);
  const nameIndex = findImportColumn(headers, companyImportHeaderAliases.name);
  if (nameIndex < 0) {
    throw new ValidationError('The company import file must include a name or company_name column');
  }

  const columnIndexes = {
    name: nameIndex,
    industry: findImportColumn(headers, companyImportHeaderAliases.industry),
    website: findImportColumn(headers, companyImportHeaderAliases.website),
    address: findImportColumn(headers, companyImportHeaderAliases.address),
    description: findImportColumn(headers, companyImportHeaderAliases.description),
    recruiter_name: findImportColumn(headers, companyImportHeaderAliases.recruiter_name),
    recruiter_email: findImportColumn(headers, companyImportHeaderAliases.recruiter_email),
    recruiter_phone: findImportColumn(headers, companyImportHeaderAliases.recruiter_phone),
    recruiter_designation: findImportColumn(headers, companyImportHeaderAliases.recruiter_designation),
  };

  const [existingCompanies, existingRecruiters] = await Promise.all([
    prisma.company.findMany({
      where: { tenant_id: tenantId },
      select: { name: true },
    }),
    prisma.recruiter.findMany({
      where: { tenant_id: tenantId },
      select: { email: true },
    }),
  ]);
  const knownNames = new Set(existingCompanies.map((company) => company.name.trim().toLowerCase()));
  const knownRecruiterEmails = new Set(existingRecruiters.map((recruiter) => recruiter.email.trim().toLowerCase()));
  const skipped_duplicates: string[] = [];
  const skipped_invalid_rows: number[] = [];
  const skipped_duplicate_recruiters: string[] = [];
  const skipped_invalid_recruiter_rows: number[] = [];
  let created_count = 0;
  let created_recruiter_count = 0;

  for (const [rowIndex, row] of rows.slice(headerRowIndex + 1).entries()) {
    const name = normalizeOptionalText(row[columnIndexes.name]);
    const displayRowNumber = rowIndex + headerRowIndex + 2;

    if (!name) {
      skipped_invalid_rows.push(displayRowNumber);
      continue;
    }

    const normalizedName = name.toLowerCase();
    if (knownNames.has(normalizedName)) {
      skipped_duplicates.push(name);
      continue;
    }

    knownNames.add(normalizedName);
    const company = await prisma.company.create({
      data: {
        tenant_id: tenantId,
        name,
        industry: columnIndexes.industry >= 0 ? normalizeOptionalText(row[columnIndexes.industry]) : null,
        website: columnIndexes.website >= 0 ? normalizeWebsite(row[columnIndexes.website]) : null,
        address: columnIndexes.address >= 0 ? normalizeOptionalText(row[columnIndexes.address]) : null,
        description: columnIndexes.description >= 0 ? normalizeOptionalText(row[columnIndexes.description]) : null,
      },
    });
    created_count += 1;

    const recruiterName = columnIndexes.recruiter_name >= 0
      ? normalizeOptionalText(row[columnIndexes.recruiter_name])
      : null;
    const recruiterEmail = columnIndexes.recruiter_email >= 0
      ? normalizeOptionalText(row[columnIndexes.recruiter_email])
      : null;
    const recruiterPhone = columnIndexes.recruiter_phone >= 0
      ? normalizeOptionalText(row[columnIndexes.recruiter_phone])
      : null;
    const recruiterDesignation = columnIndexes.recruiter_designation >= 0
      ? normalizeOptionalText(row[columnIndexes.recruiter_designation])
      : null;
    const hasRecruiterPayload = Boolean(
      recruiterName || recruiterEmail || recruiterPhone || recruiterDesignation,
    );

    if (!hasRecruiterPayload) {
      continue;
    }

    if (!recruiterName || !recruiterEmail) {
      skipped_invalid_recruiter_rows.push(displayRowNumber);
      continue;
    }

    const normalizedRecruiterEmail = recruiterEmail.toLowerCase();
    if (knownRecruiterEmails.has(normalizedRecruiterEmail)) {
      skipped_duplicate_recruiters.push(recruiterEmail);
      continue;
    }

    await prisma.recruiter.create({
      data: {
        name: recruiterName,
        tenant_id: tenantId,
        company_id: company.id,
        email: recruiterEmail,
        phone: recruiterPhone,
        designation: recruiterDesignation,
      },
    });
    knownRecruiterEmails.add(normalizedRecruiterEmail);
    created_recruiter_count += 1;
  }

  await prisma.auditLog.create({
    data: {
      tenant_id: tenantId,
      user_id: actor.id,
      user_name: actor.name,
      action: 'import_companies',
      module: 'companies',
      details: `Imported ${created_count} companies and ${created_recruiter_count} recruiters from ${file.originalname}`,
    },
  }).catch(err => logger.error({ err }, 'Audit log failed'));

  return {
    file_name: file.originalname,
    created_count,
    created_recruiter_count,
    skipped_duplicate_count: skipped_duplicates.length,
    skipped_invalid_row_count: skipped_invalid_rows.length,
    skipped_duplicates,
    skipped_invalid_rows,
    skipped_duplicate_recruiter_count: skipped_duplicate_recruiters.length,
    skipped_invalid_recruiter_row_count: skipped_invalid_recruiter_rows.length,
    skipped_duplicate_recruiters,
    skipped_invalid_recruiter_rows,
  };
}

export async function updateCompany(companyId: string, data: UpdateCompanyInput, userId?: string) {
  const existing = await prisma.company.findUnique({ where: { id: companyId } });
  if (!existing) throw new NotFoundError('Company');

  // Same guard as createCompany, so a rename can't collide with another company.
  // Only when a name is supplied, and always excluding this row (else saving an
  // unchanged name would match itself).
  if (data.name) {
    const duplicate = await findDuplicateCompany(existing.tenant_id, data.name, companyId);
    if (duplicate) {
      throw new ConflictError(
        `A company named "${duplicate.name}" already exists. Select it instead of creating a new one.`,
        'COMPANY_ALREADY_EXISTS'
      );
    }
  }

  const company = await prisma.company.update({
    where: { id: companyId },
    data,
  });

  if (userId) {
    prisma.auditLog.create({
      data: {
        tenant_id: existing.tenant_id,
        user_id: userId,
        action: 'update',
        module: 'companies',
        target_type: 'companies',
        target_id: companyId,
        details: `Updated company: ${company.name}`,
      },
    }).catch(err => logger.error({ err }, 'Audit log failed'));
  }

  return company;
}

export async function classifyCompany(companyId: string, data: ClassifyCompanyInput, userId?: string) {
  const existing = await prisma.company.findUnique({ where: { id: companyId } });
  if (!existing) throw new NotFoundError('Company');

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      classification: data.classification,
      internal_remarks: data.internal_remarks,
    },
  });

  if (userId) {
    prisma.auditLog.create({
      data: {
        tenant_id: existing.tenant_id,
        user_id: userId,
        action: 'classify',
        module: 'companies',
        target_type: 'companies',
        target_id: companyId,
        details: `Classified ${company.name} as ${data.classification}`,
      },
    }).catch(err => logger.error({ err }, 'Audit log failed'));
  }

  return company;
}

// =========================================================
// Recruiters
// =========================================================

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
function getRecruiterOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.RecruiterOrderByWithRelationInput {
  switch (sortBy) {
    case 'name': return { name: sortOrder };
    case 'email': return { email: sortOrder };
    case 'verification_status': return { verification_status: sortOrder };
    case 'company': return { company: { name: sortOrder } };
    case 'created_at': return { created_at: sortOrder };
    default: return { created_at: sortOrder };
  }
}

export async function getRecruiters(tenantId: string, filters: QueryRecruitersInput) {
  const { page, limit, search, sort_by, sort_order, verification_status, company_id } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };

  if (verification_status) where.verification_status = verification_status;
  if (company_id) where.company_id = company_id;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const orderBy = getRecruiterOrderBy(sort_by, sort_order);

  const [recruiters, total] = await Promise.all([
    prisma.recruiter.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.recruiter.count({ where }),
  ]);

  return { data: recruiters, pagination: paginate(page, limit, total) };
}

export async function getRecruitersByCompany(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('Company');

  return prisma.recruiter.findMany({
    where: { company_id: companyId },
    orderBy: { name: 'asc' },
  });
}

export async function createRecruiter(
  companyId: string,
  tenantId: string,
  data: CreateRecruiterInput,
  actorUserId: string,
) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenant_id: tenantId },
  });
  if (!company) throw new NotFoundError('Company');

  const email = data.email.trim();
  const lowerEmail = email.toLowerCase();

  const existingUser = await prisma.user.findFirst({
    where: { tenant_id: tenantId, email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existingUser) {
    throw new BusinessRuleError(
      'A user with this email already exists in this tenant',
      'EMAIL_EXISTS',
    );
  }

  const existingRecruiter = await prisma.recruiter.findUnique({
    where: { tenant_id_email: { tenant_id: tenantId, email } },
    select: { id: true, user_id: true },
  });
  if (existingRecruiter && existingRecruiter.user_id) {
    throw new BusinessRuleError(
      'A recruiter with this email is already linked to a user',
      'RECRUITER_ALREADY_LINKED',
    );
  }

  const temporaryPassword = generateTemporaryPassword(16);
  const passwordHash = await hashPassword(temporaryPassword);
  const now = new Date();

  const recruiter = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        tenant_id: tenantId,
        email,
        password_hash: passwordHash,
        role: 'recruiter',
        name: data.name,
        phone: data.phone ?? null,
        designation: data.designation ?? null,
        is_active: true,
      },
      select: { id: true },
    });

    if (existingRecruiter) {
      return tx.recruiter.update({
        where: { id: existingRecruiter.id },
        data: {
          user_id: user.id,
          company_id: companyId,
          name: data.name,
          phone: data.phone ?? null,
          designation: data.designation ?? null,
          verification_status: 'verified',
          verified_by: actorUserId,
          verified_at: now,
        },
      });
    }

    return tx.recruiter.create({
      data: {
        company_id: companyId,
        tenant_id: tenantId,
        user_id: user.id,
        name: data.name,
        email,
        phone: data.phone ?? null,
        designation: data.designation ?? null,
        verification_status: 'verified',
        verified_by: actorUserId,
        verified_at: now,
      },
    });
  });

  void lowerEmail;
  return { recruiter, temporary_password: temporaryPassword };
}

export async function updateRecruiter(recruiterId: string, data: UpdateRecruiterInput) {
  const existing = await prisma.recruiter.findUnique({ where: { id: recruiterId } });
  if (!existing) throw new NotFoundError('Recruiter');

  return prisma.recruiter.update({
    where: { id: recruiterId },
    data,
  });
}

export async function verifyRecruiter(recruiterId: string, data: VerifyRecruiterInput, userId: string) {
  const existing = await prisma.recruiter.findUnique({ where: { id: recruiterId } });
  if (!existing) throw new NotFoundError('Recruiter');

  const recruiter = await prisma.recruiter.update({
    where: { id: recruiterId },
    data: {
      verification_status: data.status as VerificationStatus,
      verified_by: userId,
      verified_at: new Date(),
    },
  });

  prisma.auditLog.create({
    data: {
      tenant_id: existing.tenant_id,
      user_id: userId,
      action: `verify_${data.status}`,
      module: 'recruiters',
      target_type: 'recruiters',
      target_id: recruiterId,
      details: `Recruiter ${recruiter.name} ${data.status}`,
    },
  }).catch(err => logger.error({ err }, 'Audit log failed'));

  if (recruiter.user_id) {
    void createNotification({
      userId: recruiter.user_id,
      tenantId: existing.tenant_id,
      type: 'recruiter',
      title: `Your recruiter profile was ${data.status}`,
      priority: 'high',
      actionUrl: '/recruiter',
      payload: { recruiter_id: recruiterId, status: data.status },
    });
  }

  return recruiter;
}

export async function deleteRecruiter(recruiterId: string, userId?: string) {
  const existing = await prisma.recruiter.findUnique({ where: { id: recruiterId } });
  if (!existing) throw new NotFoundError('Recruiter');

  await prisma.recruiter.delete({ where: { id: recruiterId } });

  if (userId) {
    prisma.auditLog.create({
      data: {
        tenant_id: existing.tenant_id,
        user_id: userId,
        action: 'delete',
        module: 'recruiters',
        target_type: 'recruiters',
        target_id: recruiterId,
        details: `Deleted recruiter: ${existing.name}`,
      },
    }).catch(err => logger.error({ err }, 'Audit log failed'));
  }
}

// =========================================================
// Engagements
// =========================================================

export async function getEngagementsByCompany(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('Company');

  return prisma.companyEngagement.findMany({
    where: { company_id: companyId },
    orderBy: { date: 'desc' },
  });
}

export async function createEngagement(
  companyId: string,
  tenantId: string,
  data: CreateEngagementInput,
  userId?: string
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('Company');

  return prisma.companyEngagement.create({
    data: {
      company_id: companyId,
      tenant_id: tenantId,
      visitor_type: data.visitor_type as EngagementType,
      date: data.date,
      remarks: data.remarks,
      students_hired: data.students_hired || 0,
      packages_offered: data.packages_offered,
      academic_year: data.academic_year,
      created_by: userId,
    },
  });
}
