import { prisma } from '../../config/database';
import { AuthorizationError, NotFoundError } from '../../shared/errors';
import type { UpdateRecruiterProfileInput } from './recruiter-portal.schema';

async function getLinkedRecruiter(userId: string) {
  const recruiter = await prisma.recruiter.findUnique({
    where: { user_id: userId },
    include: { company: true },
  });

  if (!recruiter) throw new NotFoundError('Recruiter profile');
  return recruiter;
}

function toRecruiterSummary(recruiter: Awaited<ReturnType<typeof getLinkedRecruiter>>) {
  return {
    id: recruiter.id,
    name: recruiter.name,
    email: recruiter.email,
    phone: recruiter.phone,
    designation: recruiter.designation,
    verification_status: recruiter.verification_status,
    verified_at: recruiter.verified_at,
  };
}

function toCompanySummary(company: Awaited<ReturnType<typeof getLinkedRecruiter>>['company']) {
  return {
    id: company.id,
    name: company.name,
    industry: company.industry,
    website: company.website,
  };
}

export async function getRecruiterDashboard(userId: string) {
  const recruiter = await getLinkedRecruiter(userId);

  const [activePostings, totalApplications, totalOffers] = await Promise.all([
    prisma.posting.count({ where: { company_id: recruiter.company_id, status: 'published' } }),
    prisma.application.count({
      where: { posting: { company_id: recruiter.company_id } },
    }),
    prisma.offer.count({ where: { company_id: recruiter.company_id } }),
  ]);

  return {
    recruiter: toRecruiterSummary(recruiter),
    company: toCompanySummary(recruiter.company),
    stats: { active_postings: activePostings, total_applications: totalApplications, total_offers: totalOffers },
  };
}

export async function getRecruiterCompany(userId: string) {
  const recruiter = await getLinkedRecruiter(userId);

  const company = await prisma.company.findUnique({
    where: { id: recruiter.company_id },
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

  const [recruiters, engagements] = await Promise.all([
    prisma.recruiter.findMany({
      where: { company_id: recruiter.company_id },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        verification_status: true,
        verified_at: true,
        company_id: true,
        created_at: true,
      },
    }),
    prisma.companyEngagement.findMany({
      where: { company_id: recruiter.company_id },
      orderBy: { date: 'desc' },
    }),
  ]);

  return {
    recruiter: toRecruiterSummary(recruiter),
    company: {
      id: company.id,
      name: company.name,
      industry: company.industry,
      website: company.website,
      address: company.address,
      description: company.description,
      status: company.status,
      classification: company.classification,
    },
    recruiters,
    engagements,
    stats: {
      recruiters: company._count.recruiters,
      engagements: company._count.engagements,
      postings: company._count.postings,
      offers: company._count.offers,
    },
  };
}

export async function updateRecruiterProfile(userId: string, data: UpdateRecruiterProfileInput) {
  const recruiter = await getLinkedRecruiter(userId);

  return prisma.recruiter.update({
    where: { id: recruiter.id },
    data: {
      phone: data.phone,
      designation: data.designation,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      designation: true,
      verification_status: true,
      verified_at: true,
      company_id: true,
      created_at: true,
    },
  });
}

export async function getRecruiterPostings(userId: string, companyId: string) {
  const recruiter = await getLinkedRecruiter(userId);

  if (recruiter.company_id !== companyId) {
    throw new AuthorizationError('You can only view postings for your company');
  }

  const postings = await prisma.posting.findMany({
    where: { company_id: recruiter.company_id, status: 'published' },
    orderBy: { created_at: 'desc' },
    select: {
      id: true, title: true, role_name: true, location: true, work_mode: true,
      ctc: true, stipend: true, status: true, application_start_date: true, application_end_date: true,
      posting_type_master: { select: { value: true } },
      _count: { select: { applications: true } },
    },
  });
  return postings.map((posting) => ({
    ...posting,
    type: posting.posting_type_master?.value ?? '',
  }));
}

export async function getRecruiterApplications(userId: string, postingId: string) {
  const recruiter = await getLinkedRecruiter(userId);

  const posting = await prisma.posting.findFirst({
    where: { id: postingId, company_id: recruiter.company_id },
    select: { id: true },
  });

  if (!posting) {
    throw new NotFoundError('Posting');
  }

  return prisma.application.findMany({
    where: {
      posting_id: postingId,
      posting: { company_id: recruiter.company_id },
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
          // PII fields excluded: email, mobile, date_of_birth, residential_address
        },
      },
    },
    orderBy: { applied_at: 'desc' },
  });
}
