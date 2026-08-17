import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../config/database';
import { NotFoundError, BusinessRuleError, AuthorizationError, ValidationError } from '../../shared/errors';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import type {
  UpdatePersonalInput,
  UpdateAcademicInput,
  UpdateSkillsInput,
  CreateProjectInput,
  UpdateProjectInput,
  CreateCertificationInput,
  CreateEmploymentInput,
  PolicyAcceptanceInput,
  InterestRegistrationInput,
  GlobalPlacementOptOutInput,
  PostingTypePreferenceInput,
} from './student.schema';
import { Prisma } from '@prisma/client';
import { assertNoExistingOffer } from '../../shared/utils/offer-block';
import { getSelfPlacedNocProgramValues } from '../../shared/utils/self-placed-noc-block';
import { assertPostingTypePolicyAccepted } from '../../shared/utils/posting-type-policy';
import { notifyTpoAudience } from '../notifications/notification.service';

const PROFILE_PHOTO_UPLOAD_PREFIX = '/uploads/profile-photos/';
const NO_POLICY_MATCH = '__policy_no_match__';
export const POSTING_TYPE_INTEREST_MAP: Record<string, string> = {
  job: 'placement',
  internship: 'final_semester_internship',
  stipend_internship: 'stipend_internship',
};

type StudentPolicyContext = {
  id: string;
  tenant_id: string;
  institute: string | null;
  department: string | null;
  course: string | null;
  policy_accepted_at: Date | null;
};

type VisiblePolicy = {
  id: string;
  version: string;
  updated_at: Date;
};

function buildVisiblePolicyWhere(student: StudentPolicyContext): Prisma.PolicyWhereInput {
  return {
    tenant_id: student.tenant_id,
    // Only GLOBAL policies (no posting-type link) gate placement eligibility and are
    // surfaced to students. Posting-type-linked policies are not yet acceptable anywhere,
    // so counting them here would permanently block applying (deadlock).
    posting_type_master_id: null,
    AND: [
      {
        OR: [
          { target_institutes: { isEmpty: true } },
          { target_institutes: { has: student.institute ?? NO_POLICY_MATCH } },
        ],
      },
      {
        OR: [
          { target_branches: { isEmpty: true } },
          { target_branches: { has: student.department ?? NO_POLICY_MATCH } },
        ],
      },
      {
        OR: [
          { target_courses: { isEmpty: true } },
          { target_courses: { has: student.course ?? NO_POLICY_MATCH } },
        ],
      },
    ],
  };
}

// Audience-scoped policy match WITHOUT the global-only (posting_type_master_id: null) clamp —
// used when accepting a policy by id so a posting-type-LINKED policy can be accepted too.
function buildAudiencePolicyWhere(student: StudentPolicyContext): Prisma.PolicyWhereInput {
  return {
    tenant_id: student.tenant_id,
    AND: [
      {
        OR: [
          { target_institutes: { isEmpty: true } },
          { target_institutes: { has: student.institute ?? NO_POLICY_MATCH } },
        ],
      },
      {
        OR: [
          { target_branches: { isEmpty: true } },
          { target_branches: { has: student.department ?? NO_POLICY_MATCH } },
        ],
      },
      {
        OR: [
          { target_courses: { isEmpty: true } },
          { target_courses: { has: student.course ?? NO_POLICY_MATCH } },
        ],
      },
    ],
  };
}

function hasCurrentAcceptance(
  policy: VisiblePolicy,
  acceptances: Array<{ policy_id: string | null; policy_updated_at: Date | null }>,
  legacyAcceptedAt: Date | null
) {
  const explicitAcceptance = acceptances.some((acceptance) => {
    return acceptance.policy_id === policy.id
      && acceptance.policy_updated_at?.getTime() === policy.updated_at.getTime();
  });

  if (explicitAcceptance) return true;

  // Preserve older student-level acceptances until a policy is updated after that timestamp.
  return Boolean(legacyAcceptedAt && legacyAcceptedAt.getTime() >= policy.updated_at.getTime());
}

async function areAllVisiblePoliciesAccepted(student: StudentPolicyContext) {
  const policies = await prisma.policy.findMany({
    where: buildVisiblePolicyWhere(student),
    select: { id: true, version: true, updated_at: true },
  });

  if (policies.length === 0) {
    return false;
  }

  const acceptances = await prisma.policyAcceptance.findMany({
    where: {
      student_id: student.id,
      policy_id: { in: policies.map((policy) => policy.id) },
    },
    select: {
      policy_id: true,
      policy_updated_at: true,
    },
  });

  return policies.every((policy) => hasCurrentAcceptance(policy, acceptances, student.policy_accepted_at));
}

// Number of global (visible) policies this student has NOT yet accepted in their current
// version. Drives the registration gate + the My Profile "Policies" tab. 0 when there are
// no global policies at all (so the gate never loops on a tenant with none published).
async function countPendingVisiblePolicies(student: StudentPolicyContext) {
  const policies = await prisma.policy.findMany({
    where: buildVisiblePolicyWhere(student),
    select: { id: true, version: true, updated_at: true },
  });

  if (policies.length === 0) return 0;

  const acceptances = await prisma.policyAcceptance.findMany({
    where: {
      student_id: student.id,
      policy_id: { in: policies.map((policy) => policy.id) },
    },
    select: { policy_id: true, policy_updated_at: true },
  });

  return policies.filter(
    (policy) => !hasCurrentAcceptance(policy, acceptances, student.policy_accepted_at),
  ).length;
}

// =========================================================
// Profile
// =========================================================

export async function getMyProfile(userId: string) {
  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    include: {
      academic_profile: true,
      skills_profile: true,
      employments: { orderBy: { created_at: 'desc' } },
    },
  });

  if (!student) throw new NotFoundError('Student profile');

  const policyAccepted = await areAllVisiblePoliciesAccepted(student);
  if (student.policy_accepted !== policyAccepted) {
    await prisma.student.update({
      where: { id: student.id },
      data: { policy_accepted: policyAccepted },
    });
    student.policy_accepted = policyAccepted;
  }

  const pendingPolicyCount = await countPendingVisiblePolicies(student);

  return {
    student,
    academic: student.academic_profile,
    skills: student.skills_profile,
    employments: student.employments,
    pending_policy_count: pendingPolicyCount,
  };
}

export async function updatePersonal(userId: string, data: UpdatePersonalInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  await prisma.student.update({
    where: { id: student.id },
    data,
  });

  await recalcProfileCompletion(student.id);

  return prisma.student.findUnique({ where: { id: student.id } });
}

export async function uploadProfilePhoto(userId: string, data: { file_url: string }) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const previousPhotoUrl = student.profile_photo_url;
  await prisma.student.update({
    where: { id: student.id },
    data: {
      profile_photo_url: data.file_url,
    },
  });

  await recalcProfileCompletion(student.id);

  if (previousPhotoUrl && previousPhotoUrl !== data.file_url) {
    await deletePreviousProfilePhoto(previousPhotoUrl);
  }

  return prisma.student.findUnique({ where: { id: student.id } });
}

export async function updateAcademic(userId: string, data: UpdateAcademicInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');
  void data;

  throw new AuthorizationError(
    'Academic records are institute-managed and cannot be edited by students',
    'ACADEMIC_RECORDS_READ_ONLY'
  );
}

export async function updateSkills(userId: string, data: UpdateSkillsInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const skills = await prisma.skillsProfile.upsert({
    where: { student_id: student.id },
    create: { student_id: student.id, ...data },
    update: data,
  });

  await recalcProfileCompletion(student.id);

  return skills;
}

// =========================================================
// Projects
// =========================================================

export async function getProjects(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  return prisma.studentProject.findMany({
    where: { student_id: student.id },
    orderBy: [
      { display_order: 'asc' },
      { created_at: 'desc' },
    ] as Prisma.StudentProjectOrderByWithRelationInput[],
  });
}

export async function createProject(userId: string, data: CreateProjectInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const portfolio = await prisma.portfolio.findUnique({
    where: { student_id: student.id },
  }) ?? await prisma.portfolio.create({
    data: {
      student_id: student.id,
      status: 'published',
    },
  });

  const project = await prisma.studentProject.create({
    data: {
      student_id: student.id,
      portfolio_id: portfolio.id,
      ...data,
    } as Prisma.StudentProjectUncheckedCreateInput,
  });

  await recalcProfileCompletion(student.id);
  await syncPortfolioProjectCount(student.id, portfolio.id);
  return project;
}

export async function updateProject(userId: string, projectId: string, data: UpdateProjectInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const existing = await prisma.studentProject.findFirst({
    where: { id: projectId, student_id: student.id },
  });
  if (!existing) throw new NotFoundError('Project');

  return prisma.studentProject.update({
    where: { id: projectId },
    data: data as Prisma.StudentProjectUncheckedUpdateInput,
  });
}

export async function deleteProject(userId: string, projectId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const existing = await prisma.studentProject.findFirst({
    where: { id: projectId, student_id: student.id },
  });
  if (!existing) throw new NotFoundError('Project');

  await prisma.studentProject.delete({ where: { id: projectId } });
  await recalcProfileCompletion(student.id);
  await syncPortfolioProjectCount(student.id);
}

// =========================================================
// Certifications
// =========================================================

export async function getCertifications(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  return prisma.certification.findMany({
    where: { student_id: student.id },
    orderBy: { created_at: 'desc' },
  });
}

export async function createCertification(userId: string, data: CreateCertificationInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const cert = await prisma.certification.create({
    data: { student_id: student.id, ...data },
  });

  await recalcProfileCompletion(student.id);
  return cert;
}

export async function deleteCertification(userId: string, certId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const existing = await prisma.certification.findFirst({
    where: { id: certId, student_id: student.id },
  });
  if (!existing) throw new NotFoundError('Certification');

  await prisma.certification.delete({ where: { id: certId } });
  await recalcProfileCompletion(student.id);
}

// =========================================================
// Employment
// =========================================================

export async function listEmployments(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  return prisma.currentEmployment.findMany({
    where: { student_id: student.id },
    orderBy: { created_at: 'desc' },
  });
}

export async function createEmployment(userId: string, data: CreateEmploymentInput, offerLetterUrl: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  return prisma.currentEmployment.create({
    data: {
      student_id: student.id,
      employment_type: data.employment_type,
      company_name: data.company_name,
      designation: data.designation,
      package_lpa: data.package_lpa ?? null,
      status: 'active',
      is_currently_working: true,
      offer_letter_url: offerLetterUrl,
    },
  });
}

// Close an employment entry. The completion-proof document is mandatory (enforced at the controller).
export async function closeEmployment(userId: string, employmentId: string, fileUrl: string, fileName: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const existing = await prisma.currentEmployment.findFirst({
    where: { id: employmentId, student_id: student.id },
  });
  if (!existing) throw new NotFoundError('Employment');
  if (existing.status === 'closed') {
    throw new BusinessRuleError('This employment is already closed', 'EMPLOYMENT_ALREADY_CLOSED');
  }

  return prisma.currentEmployment.update({
    where: { id: existing.id },
    data: {
      status: 'closed',
      closed_at: new Date(),
      is_currently_working: false,
      completion_proof_url: fileUrl,
      completion_proof_name: fileName,
    },
  });
}

export async function deleteEmployment(userId: string, employmentId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const existing = await prisma.currentEmployment.findFirst({
    where: { id: employmentId, student_id: student.id },
  });
  if (!existing) throw new NotFoundError('Employment');

  await prisma.currentEmployment.delete({ where: { id: existing.id } });
}

// =========================================================
// Resumes
// =========================================================

export async function getResumes(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  return prisma.resume.findMany({
    where: { student_id: student.id },
    orderBy: { uploaded_at: 'desc' },
  });
}

export async function createResume(
  userId: string,
  data: { name: string; file_url: string; file_size?: number; mime_type?: string }
) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  // Check max resumes (default 5)
  const count = await prisma.resume.count({ where: { student_id: student.id } });
  if (count >= 5) {
    throw new BusinessRuleError('Maximum of 5 resumes allowed', 'MAX_RESUMES_REACHED');
  }

  // First resume is automatically default
  const isFirst = count === 0;

  const resume = await prisma.resume.create({
    data: {
      student_id: student.id,
      name: data.name,
      file_url: data.file_url,
      file_size: data.file_size,
      mime_type: data.mime_type,
      is_default: isFirst,
    },
  });

  await recalcProfileCompletion(student.id);
  return resume;
}

export async function setDefaultResume(userId: string, resumeId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, student_id: student.id },
  });
  if (!resume) throw new NotFoundError('Resume');

  // Transaction: unset old default, set new default
  await prisma.$transaction([
    prisma.resume.updateMany({
      where: { student_id: student.id, is_default: true },
      data: { is_default: false },
    }),
    prisma.resume.update({
      where: { id: resumeId },
      data: { is_default: true },
    }),
  ]);

  return { message: 'Default resume updated' };
}

export async function deleteResume(userId: string, resumeId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, student_id: student.id },
  });
  if (!resume) throw new NotFoundError('Resume');

  await prisma.resume.delete({ where: { id: resumeId } });

  // If deleted was default, make the most recent one default
  if (resume.is_default) {
    const latest = await prisma.resume.findFirst({
      where: { student_id: student.id },
      orderBy: { uploaded_at: 'desc' },
    });
    if (latest) {
      await prisma.resume.update({ where: { id: latest.id }, data: { is_default: true } });
    }
  }

  await recalcProfileCompletion(student.id);
}

// =========================================================
// Policy Acceptance
// =========================================================

export async function acceptPolicy(userId: string, data: PolicyAcceptanceInput, ipAddress?: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const { policy_id, ...acceptanceData } = data;
  const policy = policy_id
    // Accept by id — allow global OR posting-type-linked, as long as it's audience-visible.
    ? await prisma.policy.findFirst({
        where: { id: policy_id, ...buildAudiencePolicyWhere(student) },
        select: { id: true, version: true, updated_at: true, posting_type_master_id: true },
      })
    // Accept latest — the global registration policy only.
    : await prisma.policy.findFirst({
        where: buildVisiblePolicyWhere(student),
        orderBy: [{ effective_date: 'desc' }, { updated_at: 'desc' }],
        select: { id: true, version: true, updated_at: true, posting_type_master_id: true },
      });

  if (policy_id && !policy) {
    throw new NotFoundError('Policy');
  }

  if (policy) {
    const existingAcceptance = await prisma.policyAcceptance.findFirst({
      where: {
        student_id: student.id,
        policy_id: policy.id,
        policy_updated_at: policy.updated_at,
      },
      select: { id: true },
    });

    if (existingAcceptance) {
      throw new BusinessRuleError('Policy already accepted', 'POLICY_ALREADY_ACCEPTED');
    }
  } else if (student.policy_accepted) {
    throw new BusinessRuleError('Policy already accepted', 'POLICY_ALREADY_ACCEPTED');
  }

  const acceptedAt = new Date();

  await prisma.policyAcceptance.create({
    data: {
      student_id: student.id,
      policy_id: policy?.id,
      policy_version: policy?.version,
      policy_updated_at: policy?.updated_at,
      ...acceptanceData,
      ip_address: ipAddress,
    },
  });

  // A posting-type-LINKED policy acceptance must NOT touch the global `policy_accepted`
  // boolean (it reflects only global policies; mixing would deadlock the placement gate).
  const isLinkedPolicy = Boolean(policy && policy.posting_type_master_id !== null);
  let policyAccepted = student.policy_accepted;
  if (!isLinkedPolicy) {
    policyAccepted = policy ? await areAllVisiblePoliciesAccepted(student) : true;
    await prisma.student.update({
      where: { id: student.id },
      data: {
        policy_accepted: policyAccepted,
        policy_accepted_at: policyAccepted ? acceptedAt : null,
      },
    });
  }

  // Audit (fire and forget)
  prisma.auditLog
    .create({
      data: {
        tenant_id: student.tenant_id,
        user_id: userId,
        action: 'accept_policy',
        module: 'students',
        target_type: 'students',
        target_id: student.id,
        details: policy
          ? `Student accepted placement policy ${policy.id} (${policy.version})`
          : 'Student accepted placement policy',
        ip_address: ipAddress,
      },
    })
    .catch((err) => logger.error({ err }, 'Failed to write policy audit log'));

  return {
    message: policyAccepted
      ? 'Policy accepted successfully'
      : 'Policy accepted successfully. Additional policy acceptance is still pending.',
    policy_accepted: policyAccepted,
  };
}

// =========================================================
// Interest Registration
// =========================================================

export async function getInterests(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  return prisma.interestRegistration.findMany({
    where: { student_id: student.id },
    orderBy: { registered_at: 'desc' },
  });
}

export async function registerInterests(userId: string, data: InterestRegistrationInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  await assertNoExistingOffer(student.id);

  const cleanedInterestTypes = Array.from(
    new Set(data.interest_types.map((value) => cleanInterestRegistrationValue(value)))
  );

  const normalizedInterestTypes = cleanedInterestTypes.map((value) => normalizeMasterValue(value));
  const masterOptions = await prisma.masterOption.findMany({
    where: {
      tenant_id: student.tenant_id,
      category: 'posting_type',
      is_active: true,
      normalized_value: { in: normalizedInterestTypes },
    },
    select: {
      id: true,
      value: true,
      normalized_value: true,
      accepting_applications: true,
    },
  });

  const masterOptionsByNormalizedValue = new Map(
    masterOptions.map((option) => [option.normalized_value, option.value] as const)
  );
  const missingValues = cleanedInterestTypes.filter(
    (value) => !masterOptionsByNormalizedValue.has(normalizeMasterValue(value))
  );

  if (missingValues.length > 0) {
    throw new ValidationError(`Unsupported posting type(s): ${missingValues.join(', ')}`);
  }

  // Application Receiving must be ON: a posting type toggled off stays visible but cannot be enrolled in.
  const closedTypes = masterOptions.filter((option) => option.accepting_applications === false);
  if (closedTypes.length > 0) {
    const names = closedTypes.map((option) => option.value).join(', ');
    throw new BusinessRuleError(
      `Applications are currently closed for posting type(s): ${names}.`,
      'POSTING_TYPE_NOT_RECEIVING',
    );
  }

  // Cannot register interest in a posting type you've opted out of (global or per-type).
  if (student.placement_opt_out) {
    throw new BusinessRuleError(
      'You have opted out of placement. Re-enable it in Profile → Placement to continue.',
      'PLACEMENT_OPT_OUT',
    );
  }
  const requestedMasterIds = masterOptions.map((option) => option.id);
  if (requestedMasterIds.length > 0) {
    const optedOut = await prisma.studentPostingTypePreference.findMany({
      where: { student_id: student.id, posting_type_master_id: { in: requestedMasterIds }, interested: false },
      select: { posting_type_master: { select: { value: true } } },
    });
    if (optedOut.length > 0) {
      const names = optedOut.map((row) => row.posting_type_master.value).join(', ');
      throw new BusinessRuleError(
        `You have opted out of posting type(s): ${names}. Re-enable in Profile → Placement to continue.`,
        'POSTING_TYPE_OPT_OUT',
      );
    }
  }

  // A non-rejected self-sourced NOC for a requested posting type blocks registering interest in it.
  const selfPlacedPrograms = await getSelfPlacedNocProgramValues(student.id);
  if (selfPlacedPrograms.size > 0) {
    const blockedNames = masterOptions
      .filter((option) => selfPlacedPrograms.has(option.value.trim().toLowerCase()))
      .map((option) => option.value);
    if (blockedNames.length > 0) {
      throw new BusinessRuleError(
        `You have a self-placed NOC for posting type(s): ${blockedNames.join(', ')}. Interest/applications for those are blocked.`,
        'SELF_PLACED_NOC_BLOCK',
      );
    }
  }

  // The policy linked to each requested posting type (if any) must be accepted first.
  for (const option of masterOptions) {
    await assertPostingTypePolicyAccepted(student.id, option.id);
  }

  const postingTypeValues = Array.from(
    new Set(
      cleanedInterestTypes
        .map((value) => masterOptionsByNormalizedValue.get(normalizeMasterValue(value)))
        .filter((value): value is string => Boolean(value))
    )
  );

  // Register each interest type. New registrations require TPO approval, so they start as
  // `pending`; an existing `pending`/`approved` row is left untouched (re-registering must not reset
  // an approval). A `withdrawn` row is TERMINAL for the student — only a TPO admin can reinstate it
  // (via approve); the student cannot re-register it here.
  const existingRegistrations = await prisma.interestRegistration.findMany({
    where: { student_id: student.id, interest_type: { in: postingTypeValues } },
    select: { id: true, interest_type: true, status: true },
  });
  const existingByType = new Map(existingRegistrations.map((row) => [row.interest_type, row]));

  if (existingRegistrations.some((row) => row.status === 'withdrawn')) {
    throw new BusinessRuleError(
      'You have been withdrawn from this posting type by the TPO cell and can no longer register for it. Contact the TPO cell to be reinstated.',
      'INTEREST_WITHDRAWN',
    );
  }

  const results = await Promise.all(
    postingTypeValues.map((type) => {
      const existing = existingByType.get(type);
      if (!existing) {
        return prisma.interestRegistration.create({
          data: { student_id: student.id, interest_type: type, status: 'pending' },
        });
      }
      return prisma.interestRegistration.findUnique({ where: { id: existing.id } });
    })
  );

  void notifyTpoAudience({
    tenantId: student.tenant_id,
    type: 'interest',
    title: `${student.full_name} registered interest`,
    description: `Interest types: ${postingTypeValues.join(', ')}`,
    priority: 'low',
    actionUrl: '/admin/interests',
    payload: {
      student_id: student.id,
      enrollment_number: student.enrollment_number,
      interest_types: postingTypeValues,
    },
  });

  return results;
}

function cleanInterestRegistrationValue(value: string) {
  const cleanedValue = value.trim().replace(/\s+/g, ' ');
  if (!cleanedValue) {
    throw new ValidationError('Interest type is required');
  }

  return cleanedValue;
}

function normalizeMasterValue(value: string) {
  return cleanMasterValue(value).toLowerCase();
}

function cleanMasterValue(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

// =========================================================
// Profile Completion Calculator
// =========================================================

function calculateProfileCompletion(student: Record<string, unknown>): number {
  const fields = [
    { key: 'full_name', weight: 10 },
    { key: 'mobile', weight: 5 },
    { key: 'date_of_birth', weight: 5 },
    { key: 'gender', weight: 5 },
    { key: 'department', weight: 5 },
    { key: 'batch', weight: 5 },
    { key: 'linkedin_url', weight: 5 },
    { key: 'profile_photo_url', weight: 5 },
    { key: 'residential_address', weight: 5 },
  ];

  let total = 0;
  let filled = 0;

  for (const f of fields) {
    total += f.weight;
    if (student[f.key] != null && student[f.key] !== '') {
      filled += f.weight;
    }
  }

  // Academic adds 20%, skills adds 15%, resume adds 10%, projects adds 5%
  // These are checked separately via relations
  return Math.min(100, Math.round((filled / total) * 55));
}

export async function recalcProfileCompletion(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      academic_profile: true,
      skills_profile: true,
      resumes: { select: { id: true } },
      projects: { select: { id: true } },
      certifications: { select: { id: true } },
    },
  });

  if (!student) return;

  let completion = calculateProfileCompletion(student as unknown as Record<string, unknown>);

  // Academic profile filled
  if (student.academic_profile) {
    const ap = student.academic_profile;
    if (ap.cgpa != null || ap.tenth_percentage != null || ap.twelfth_percentage != null) {
      completion += 20;
    }
  }

  // Skills profile filled
  if (student.skills_profile) {
    const sp = student.skills_profile;
    if (sp.technical_skills.length > 0 || sp.domain_interests.length > 0) {
      completion += 15;
    }
  }

  // At least one resume
  if (student.resumes.length > 0) completion += 10;

  // At least one project
  if (student.projects.length > 0) completion += 5;

  completion = Math.min(100, completion);

  await prisma.student.update({
    where: { id: studentId },
    data: { profile_completion_percentage: completion },
  });
}

async function deletePreviousProfilePhoto(fileUrl: string) {
  if (!fileUrl.startsWith(PROFILE_PHOTO_UPLOAD_PREFIX)) {
    return;
  }

  const relativePath = fileUrl.replace('/uploads/', '');
  const filePath = path.resolve(env.uploadDir, relativePath);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn({ err: error, filePath }, 'Failed to delete previous profile photo');
    }
  }
}

async function syncPortfolioProjectCount(studentId: string, portfolioId?: string) {
  const portfolio = portfolioId
    ? { id: portfolioId }
    : await prisma.portfolio.findUnique({ where: { student_id: studentId }, select: { id: true } });

  if (!portfolio) {
    return;
  }

  const projectCount = await prisma.studentProject.count({
    where: { student_id: studentId },
  });

  await prisma.portfolio.update({
    where: { id: portfolio.id },
    data: { project_count: projectCount },
  });
}

// =========================================================
// Placement preferences (opt-out: global + per posting type)
// =========================================================

export async function getPlacementPreferences(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const [postingTypes, preferences, history] = await Promise.all([
    prisma.masterOption.findMany({
      where: { tenant_id: student.tenant_id, category: 'posting_type', is_active: true },
      select: { id: true, value: true },
      orderBy: { value: 'asc' },
    }),
    prisma.studentPostingTypePreference.findMany({
      where: { student_id: student.id },
      select: { posting_type_master_id: true, interested: true, reason: true, updated_at: true },
    }),
    prisma.studentPlacementPreferenceHistory.findMany({
      where: { student_id: student.id },
      orderBy: { created_at: 'desc' },
      take: 100,
      select: {
        id: true, scope: true, posting_type_master_id: true, posting_type_label: true,
        interested: true, reason: true, created_at: true,
      },
    }),
  ]);

  const prefByMaster = new Map(preferences.map((pref) => [pref.posting_type_master_id, pref]));

  return {
    global: {
      opted_out: student.placement_opt_out,
      reason: student.placement_opt_out_reason,
      updated_at: student.placement_opt_out_at,
    },
    posting_types: postingTypes.map((postingType) => {
      const pref = prefByMaster.get(postingType.id);
      return {
        posting_type_master_id: postingType.id,
        value: postingType.value,
        interested: pref ? pref.interested : true,
        reason: pref?.reason ?? null,
        updated_at: pref?.updated_at ?? null,
      };
    }),
    history,
  };
}

export async function updateGlobalPlacementOptOut(
  userId: string,
  data: GlobalPlacementOptOutInput,
  ipAddress?: string,
) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  // Re-enabling (reopen) is TPO-admin-only. Students may opt out but not opt back in.
  if (!data.opted_out) {
    throw new BusinessRuleError(
      'Placement can only be re-enabled by the T&P office. Please contact them.',
      'PLACEMENT_REOPEN_ADMIN_ONLY',
    );
  }

  const reason = data.opted_out ? data.reason ?? null : null;

  await prisma.$transaction([
    prisma.student.update({
      where: { id: student.id },
      data: {
        placement_opt_out: data.opted_out,
        placement_opt_out_reason: reason,
        placement_opt_out_at: data.opted_out ? new Date() : null,
      },
    }),
    prisma.studentPlacementPreferenceHistory.create({
      data: {
        tenant_id: student.tenant_id,
        student_id: student.id,
        scope: 'global',
        interested: !data.opted_out,
        reason,
      },
    }),
  ]);

  prisma.auditLog
    .create({
      data: {
        tenant_id: student.tenant_id,
        user_id: userId,
        action: data.opted_out ? 'placement_opt_out' : 'placement_opt_in',
        module: 'students',
        target_type: 'students',
        target_id: student.id,
        details: `Global placement ${data.opted_out ? 'opt-out' : 'opt-in'}`,
        ip_address: ipAddress,
      },
    })
    .catch((err) => logger.error({ err }, 'Failed to write placement audit log'));

  return getPlacementPreferences(userId);
}

export async function updatePostingTypePreference(
  userId: string,
  data: PostingTypePreferenceInput,
  ipAddress?: string,
) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  // Re-enabling (reopen) a posting type is TPO-admin-only. Students may opt out but not opt back in.
  if (data.interested) {
    throw new BusinessRuleError(
      'Placement can only be re-enabled by the T&P office. Please contact them.',
      'PLACEMENT_REOPEN_ADMIN_ONLY',
    );
  }

  const master = await prisma.masterOption.findFirst({
    where: {
      id: data.posting_type_master_id,
      tenant_id: student.tenant_id,
      category: 'posting_type',
      is_active: true,
    },
    select: { id: true, value: true },
  });
  if (!master) throw new NotFoundError('Posting type');

  const reason = data.interested ? null : data.reason ?? null;

  await prisma.$transaction([
    prisma.studentPostingTypePreference.upsert({
      where: {
        student_id_posting_type_master_id: { student_id: student.id, posting_type_master_id: master.id },
      },
      create: { student_id: student.id, posting_type_master_id: master.id, interested: data.interested, reason },
      update: { interested: data.interested, reason },
    }),
    prisma.studentPlacementPreferenceHistory.create({
      data: {
        tenant_id: student.tenant_id,
        student_id: student.id,
        scope: 'posting_type',
        posting_type_master_id: master.id,
        posting_type_label: master.value,
        interested: data.interested,
        reason,
      },
    }),
  ]);

  prisma.auditLog
    .create({
      data: {
        tenant_id: student.tenant_id,
        user_id: userId,
        action: data.interested ? 'posting_type_opt_in' : 'posting_type_opt_out',
        module: 'students',
        target_type: 'students',
        target_id: student.id,
        details: `Posting type "${master.value}" ${data.interested ? 'opt-in' : 'opt-out'}`,
        ip_address: ipAddress,
      },
    })
    .catch((err) => logger.error({ err }, 'Failed to write placement audit log'));

  return getPlacementPreferences(userId);
}
