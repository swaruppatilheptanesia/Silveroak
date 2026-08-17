import { Prisma, VerificationStatus, JoiningStatus, OfferStatus, MasterCategory } from '@prisma/client';
import { prisma } from '../../config/database';
import { AuthorizationError, NotFoundError } from '../../shared/errors';
import { paginate } from '../../shared/utils/pagination';
import {
  resolveFacultyScope,
  studentMatchesFacultyScope,
  facultyMatchesPostingTypeMaster,
  type FacultyScope,
} from '../../shared/utils/faculty-scope';
import { normalizeComparable } from '../../shared/utils/student-targeting';
import { buildDateRangeCondition } from '../../shared/utils/student-scope-filter';
import type { QueryFacultyStudentsInput } from './faculty.schema';

const MIN_PROFILE_COMPLETION = 80;
const DEFAULT_MIN_CGPA = 7;
const DEFAULT_MAX_BACKLOGS = 0;
const DEFAULT_MIN_PERCENTAGE = 60;

type FacultyEligibilityStatus = 'eligible' | 'conditional' | 'not_eligible';

const facultyStudentInclude = {
  academic_profile: true,
  skills_profile: true,
  portfolio: true,
} as const;

const facultyStudentDetailInclude = {
  ...facultyStudentInclude,
  interest_registrations: {
    where: { status: { not: 'withdrawn' as const } },
    select: {
      interest_type: true,
      registered_at: true,
    },
  },
} as const;

type FacultyStudentSource = Prisma.StudentGetPayload<{
  include: typeof facultyStudentInclude;
}>;

type FacultyStudentDetailSource = Prisma.StudentGetPayload<{
  include: typeof facultyStudentDetailInclude;
}>;

type DashboardStudentSource = Prisma.StudentGetPayload<{
  include: {
    academic_profile: true;
    offers: {
      select: {
        status: true;
        joining_status: true;
      };
    };
  };
}>;

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value == null ? null : Number(value);
}

function requireFacultyScope(user: Express.AuthUser): FacultyScope {
  const scope = resolveFacultyScope(user);
  if (!scope.hasScope) {
    throw new AuthorizationError(
      'Faculty coordinator scope is not configured',
      'FACULTY_SCOPE_MISSING',
    );
  }
  return scope;
}

// Human-readable label for the faculty's scope (back-compat for the `department` field
// some responses still echo). Prefers the explicit department, else the assignment.
function facultyScopeLabel(user: Express.AuthUser): string {
  return (
    user.department
    ?? user.courses?.[0]
    ?? user.branches?.[0]
    ?? user.institutes?.[0]
    ?? ''
  );
}

function calculateEligibilityStatus(student: FacultyStudentSource | DashboardStudentSource): FacultyEligibilityStatus {
  const academicProfile = student.academic_profile;
  const cgpa = decimalToNumber(academicProfile?.cgpa) ?? 0;
  const backlogCount = academicProfile?.backlog_count ?? 0;
  const tenthPercentage = decimalToNumber(academicProfile?.tenth_percentage) ?? 0;
  const twelfthPercentage = decimalToNumber(academicProfile?.twelfth_percentage);

  const cgpaPassed = cgpa >= DEFAULT_MIN_CGPA;
  const backlogPassed = backlogCount <= DEFAULT_MAX_BACKLOGS;
  const percentagePassed =
    tenthPercentage >= DEFAULT_MIN_PERCENTAGE &&
    (twelfthPercentage == null || twelfthPercentage >= DEFAULT_MIN_PERCENTAGE);

  const allPassed = cgpaPassed && backlogPassed && percentagePassed;
  const somePassed = cgpaPassed || backlogPassed;

  if (allPassed) {
    return 'eligible';
  }

  if (somePassed && cgpa >= DEFAULT_MIN_CGPA - 1) {
    return 'conditional';
  }

  return 'not_eligible';
}

function isPlacementReady(student: FacultyStudentSource | DashboardStudentSource) {
  return (
    calculateEligibilityStatus(student) === 'eligible' &&
    student.profile_completion_percentage >= MIN_PROFILE_COMPLETION &&
    student.policy_accepted &&
    student.verification_status === VerificationStatus.verified
  );
}

function hasAcceptedPlacement(student: DashboardStudentSource) {
  return student.offers.some((offer) =>
    offer.status === OfferStatus.accepted ||
    offer.joining_status === JoiningStatus.joined ||
    offer.joining_status === JoiningStatus.did_not_join,
  );
}

function buildStudentWhere(
  tenantId: string,
  filters: Pick<
    QueryFacultyStudentsInput,
    'batch' | 'verification_status' | 'search' | 'min_cgpa' | 'max_cgpa' | 'institute' | 'branch' | 'semester'
    | 'course' | 'date_from' | 'date_to'
  >,
): Prisma.StudentWhereInput {
  // Faculty scoping is applied in-memory via studentMatchesFacultyScope (tolerant, honours
  // institute/course/branch assignment); this where only carries the user-applied filters.
  const conditions: Prisma.StudentWhereInput[] = [
    { tenant_id: tenantId },
  ];

  if (filters.batch) {
    conditions.push({ batch: filters.batch });
  }

  if (filters.verification_status) {
    conditions.push({ verification_status: filters.verification_status as VerificationStatus });
  }

  if (filters.search) {
    conditions.push({
      OR: [
        { full_name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { enrollment_number: { contains: filters.search, mode: 'insensitive' } },
        { roll_number: { contains: filters.search, mode: 'insensitive' } },
      ],
    });
  }

  if (filters.min_cgpa !== undefined || filters.max_cgpa !== undefined) {
    conditions.push({
      academic_profile: {
        is: {
          cgpa: {
            ...(filters.min_cgpa !== undefined ? { gte: filters.min_cgpa } : {}),
            ...(filters.max_cgpa !== undefined ? { lte: filters.max_cgpa } : {}),
          },
        },
      },
    });
  }

  if (filters.institute?.length) {
    conditions.push({ institute: { in: filters.institute } });
  }

  if (filters.branch?.length) {
    conditions.push({ department: { in: filters.branch } });
  }

  if (filters.semester?.length) {
    conditions.push({
      academic_profile: { is: { semester: { in: filters.semester } } },
    });
  }

  // FILTER COUNTER EXPORT — Course + created_at date range (from the shared ERP filter bar).
  if (filters.course) {
    conditions.push({ course: { contains: filters.course, mode: 'insensitive' } });
  }
  const createdRange = buildDateRangeCondition(filters.date_from, filters.date_to);
  if (createdRange) {
    conditions.push({ created_at: createdRange });
  }

  return { AND: conditions };
}

function getStudentOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.StudentOrderByWithRelationInput {
  switch (sortBy) {
    case 'batch':
      return { batch: sortOrder };
    case 'verification_status':
      return { verification_status: sortOrder };
    case 'profile_completion_percentage':
      return { profile_completion_percentage: sortOrder };
    case 'created_at':
      return { created_at: sortOrder };
    case 'updated_at':
      return { updated_at: sortOrder };
    default:
      return { full_name: sortOrder };
  }
}

function mapFacultyStudent(student: FacultyStudentSource) {
  const eligibilityStatus = calculateEligibilityStatus(student);

  return {
    id: student.id,
    student_id: student.id,
    user_id: student.user_id,
    name: student.full_name,
    full_name: student.full_name,
    rollNumber: student.roll_number ?? student.enrollment_number,
    roll_number: student.roll_number ?? student.enrollment_number,
    enrollment_number: student.enrollment_number,
    email: student.email,
    mobile: student.mobile,
    batch: student.batch,
    department: student.department,
    cgpa: decimalToNumber(student.academic_profile?.cgpa),
    backlogs: student.academic_profile?.backlog_count ?? 0,
    active_backlogs: student.academic_profile?.active_backlogs ?? 0,
    semester: student.academic_profile?.semester ?? null,
    year_of_study: student.academic_profile?.year_of_study ?? null,
    profileCompletion: student.profile_completion_percentage,
    profile_completion_percentage: student.profile_completion_percentage,
    eligibilityStatus,
    eligibility_status: eligibilityStatus,
    placementReady: isPlacementReady(student),
    placement_ready: isPlacementReady(student),
    verificationStatus: student.verification_status,
    verification_status: student.verification_status,
    policyAccepted: student.policy_accepted,
    policy_accepted: student.policy_accepted,
    dateOfBirth: student.date_of_birth?.toISOString() ?? null,
    date_of_birth: student.date_of_birth?.toISOString() ?? null,
    address: student.residential_address ?? student.permanent_address ?? null,
    permanent_address: student.permanent_address,
    residential_address: student.residential_address,
    skills: student.skills_profile?.technical_skills ?? [],
    portfolioStatus: student.portfolio?.status ?? 'missing',
    portfolio_status: student.portfolio?.status ?? 'missing',
    updated_at: student.updated_at.toISOString(),
    created_at: student.created_at.toISOString(),
  };
}

function mapFacultyStudentDetail(student: FacultyStudentDetailSource) {
  const summary = mapFacultyStudent(student);

  return {
    ...summary,
    alternate_phone: student.alternate_phone,
    institute_name: student.institute,
    course_name: student.course,
    linkedin_url: student.linkedin_url,
    gender: student.gender,
    profile_photo_url: student.profile_photo_url,
    verification_remarks: student.verification_remarks,
    verified_at: student.verified_at?.toISOString() ?? null,
    policy_accepted_at: student.policy_accepted_at?.toISOString() ?? null,
    interests: student.interest_registrations.map((interest) => ({
      interest_type: interest.interest_type,
      registered_at: interest.registered_at.toISOString(),
    })),
    academicProfile: {
      cgpa: decimalToNumber(student.academic_profile?.cgpa),
      tenth_percentage: decimalToNumber(student.academic_profile?.tenth_percentage),
      twelfth_percentage: decimalToNumber(student.academic_profile?.twelfth_percentage),
      diploma_percentage: decimalToNumber(student.academic_profile?.diploma_percentage),
      backlog_count: student.academic_profile?.backlog_count ?? 0,
      active_backlogs: student.academic_profile?.active_backlogs ?? 0,
      semester: student.academic_profile?.semester ?? null,
      year_of_study: student.academic_profile?.year_of_study ?? null,
      course_duration: student.academic_profile?.course_duration ?? null,
    },
    skillsProfile: {
      technical_skills: student.skills_profile?.technical_skills ?? [],
      domain_interests: student.skills_profile?.domain_interests ?? [],
      preferred_locations: student.skills_profile?.preferred_locations ?? [],
    },
    portfolioSummary: student.portfolio
      ? {
          id: student.portfolio.id,
          status: student.portfolio.status,
          project_count: student.portfolio.project_count,
          internship_count: student.portfolio.internship_count,
          updated_at: student.portfolio.updated_at.toISOString(),
        }
      : null,
  };
}

export async function getDashboard(user: Express.AuthUser, scope?: Express.ScopeFilters) {
  const facultyScope = requireFacultyScope(user);

  const allStudents = await prisma.student.findMany({
    where: {
      tenant_id: user.tenant_id,
    },
    include: {
      academic_profile: true,
      offers: {
        select: {
          status: true,
          joining_status: true,
        },
      },
    },
    orderBy: { updated_at: 'desc' },
  });

  const students = allStudents.filter((student) => studentMatchesFacultyScope(student, facultyScope));

  const totalStudents = students.length;
  const profilesComplete = students.filter((student) => student.profile_completion_percentage >= MIN_PROFILE_COMPLETION).length;
  const eligibleForPlacements = students.filter(isPlacementReady).length;
  const placedStudents = students.filter(hasAcceptedPlacement).length;

  // FILTER COUNTER EXPORT (Faculty dashboard) — offer tallies over the scoped students' offers.
  const allOffers = students.flatMap((student) => student.offers);
  const offersReleased = allOffers.length;
  const accepted = allOffers.filter((offer) => offer.status === 'accepted').length;
  const joined = allOffers.filter((offer) => offer.joining_status === 'joined').length;

  return {
    departmentStats: {
      department: facultyScopeLabel(user),
      totalStudents,
      profilesComplete,
      eligibleForPlacements,
      placedStudents,
      offersReleased,
      accepted,
      joined,
    },
    recentStudents: students.slice(0, 5).map((student) => ({
      id: student.id,
      name: student.full_name,
      rollNumber: student.roll_number ?? student.enrollment_number,
      cgpa: decimalToNumber(student.academic_profile?.cgpa),
      status: calculateEligibilityStatus(student),
      updated_at: student.updated_at.toISOString(),
    })),
  };
}

export async function getStudents(
  tenantId: string,
  filters: QueryFacultyStudentsInput,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters,
) {
  const facultyScope = requireFacultyScope(user);
  const { page, limit, eligibility_status, sort_by, sort_order } = filters;

  const students = await prisma.student.findMany({
    where: buildStudentWhere(tenantId, filters),
    include: facultyStudentInclude,
    orderBy: getStudentOrderBy(sort_by, sort_order),
  });

  const scopedStudents = students.filter((student) => studentMatchesFacultyScope(student, facultyScope));

  const filteredStudents = eligibility_status
    ? scopedStudents.filter((student) => calculateEligibilityStatus(student) === eligibility_status)
    : scopedStudents;

  const startIndex = (page - 1) * limit;
  const pagedStudents = filteredStudents.slice(startIndex, startIndex + limit);

  return {
    department: facultyScopeLabel(user),
    data: pagedStudents.map(mapFacultyStudent),
    pagination: paginate(page, limit, filteredStudents.length),
  };
}

export async function getStudentFilterOptions(
  tenantId: string,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters,
) {
  const facultyScope = requireFacultyScope(user);

  // Institute + Semester options are derived from the faculty's SCOPED student set (so they
  // populate correctly); Branch options come from the master list.
  const [students, branchRows] = await Promise.all([
    prisma.student.findMany({
      where: { tenant_id: tenantId },
      select: {
        institute: true,
        department: true,
        course: true,
        academic_profile: { select: { semester: true } },
      },
    }),
    prisma.masterOption.findMany({
      where: { tenant_id: tenantId, category: MasterCategory.branch, is_active: true },
      select: { value: true },
      orderBy: { value: 'asc' },
    }),
  ]);

  const scopedStudents = students.filter((student) => studentMatchesFacultyScope(student, facultyScope));

  const institutes = Array.from(
    new Set(
      scopedStudents
        .map((student) => student.institute)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const semesters = Array.from(
    new Set(
      scopedStudents
        .map((student) => student.academic_profile?.semester)
        .filter((value): value is number => value != null),
    ),
  ).sort((a, b) => a - b);

  return {
    institutes,
    branches: branchRows.map((row) => row.value),
    semesters,
  };
}

export async function getStudentById(
  studentId: string,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters,
) {
  const facultyScope = requireFacultyScope(user);

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      tenant_id: user.tenant_id,
    },
    include: facultyStudentDetailInclude,
  });

  if (!student || !studentMatchesFacultyScope(student, facultyScope)) {
    throw new NotFoundError('Student');
  }

  return mapFacultyStudentDetail(student);
}

// =========================================================
// Faculty "My Programs" — posting types that fall under the faculty's institute/course/branch
// scope (derived from the posting-type master's target scope; no explicit assignment exists),
// and the students enrolled in OR interested in each.
// =========================================================

const facultyProgramStudentInclude = {
  academic_profile: true,
  interest_registrations: {
    // Withdrawn registrations no longer count as program membership.
    where: { status: { not: 'withdrawn' as const } },
    select: { interest_type: true, registered_at: true },
  },
  // Applications and offers link to a posting type via the real FK Posting.posting_type_master_id,
  // so a student's engagement with a program is matched on the master id (no string normalization).
  applications: {
    select: { posting: { select: { posting_type_master_id: true } } },
  },
  offers: {
    select: { posting: { select: { posting_type_master_id: true } } },
  },
} as const;

type FacultyProgramStudentSource = Prisma.StudentGetPayload<{
  include: typeof facultyProgramStudentInclude;
}>;

type PostingTypeMaster = {
  id: string;
  value: string;
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
};

// A student is "under" a program only via an EXPLICIT signal for that specific posting type:
// registered interest, an application, or an offer. (The old behaviour also counted every student
// whose course/branch merely fell under the type's targeting, which listed the whole cohort under
// every program — the "common records" bug.) Returns the interest date when present.
function studentUnderProgram(student: FacultyProgramStudentSource, master: PostingTypeMaster) {
  const masterKey = normalizeComparable(master.value);
  const interestMatch = student.interest_registrations.find(
    (interest) => normalizeComparable(interest.interest_type) === masterKey,
  );

  const applied =
    student.applications.some((application) => application.posting?.posting_type_master_id === master.id)
    || student.offers.some((offer) => offer.posting?.posting_type_master_id === master.id);

  return {
    interested: Boolean(interestMatch),
    applied,
    registered_at: interestMatch?.registered_at.toISOString() ?? null,
  };
}

async function loadAssignedPostingTypeMasters(user: Express.AuthUser, scope: FacultyScope) {
  const masters = await prisma.masterOption.findMany({
    where: {
      tenant_id: user.tenant_id,
      category: MasterCategory.posting_type,
      is_active: true,
    },
    select: {
      id: true,
      value: true,
      target_institutes: true,
      target_courses: true,
      target_branches: true,
    },
    orderBy: { value: 'asc' },
  });

  return masters.filter((master) => facultyMatchesPostingTypeMaster(scope, master));
}

function mapProgramStudent(
  student: FacultyProgramStudentSource,
  status: { applied: boolean; interested: boolean; registered_at: string | null },
) {
  const source = status.interested && status.applied ? 'both' : status.interested ? 'interest' : 'applied';

  return {
    student_id: student.id,
    full_name: student.full_name,
    enrollment_number: student.enrollment_number,
    roll_number: student.roll_number ?? student.enrollment_number,
    gender: student.gender ?? null,
    institute_name: student.institute,
    course_name: student.course,
    department: student.department,
    semester: student.academic_profile?.semester ?? null,
    batch: student.batch,
    cgpa: decimalToNumber(student.academic_profile?.cgpa),
    tenth_percentage: decimalToNumber(student.academic_profile?.tenth_percentage),
    twelfth_percentage: decimalToNumber(student.academic_profile?.twelfth_percentage),
    backlog_count: student.academic_profile?.backlog_count ?? 0,
    email: student.email,
    mobile: student.mobile,
    profile_completion_percentage: student.profile_completion_percentage,
    registered_at: status.registered_at,
    source,
  };
}

export async function getAssignedPrograms(user: Express.AuthUser) {
  const facultyScope = requireFacultyScope(user);
  const masters = await loadAssignedPostingTypeMasters(user, facultyScope);
  if (masters.length === 0) {
    return { programs: [] };
  }

  const students = await prisma.student.findMany({
    // Rejected students must not appear in / count toward the program listing.
    where: { tenant_id: user.tenant_id, verification_status: { not: VerificationStatus.rejected } },
    include: facultyProgramStudentInclude,
  });
  const scoped = students.filter((student) => studentMatchesFacultyScope(student, facultyScope));

  const programs = masters.map((master) => {
    const count = scoped.filter((student) => {
      const { interested, applied } = studentUnderProgram(student, master);
      return interested || applied;
    }).length;
    return { posting_type: master.value, count };
  });

  return { programs };
}

export async function getProgramStudents(
  user: Express.AuthUser,
  postingType: string,
  filters: { search?: string },
) {
  const facultyScope = requireFacultyScope(user);
  const masters = await loadAssignedPostingTypeMasters(user, facultyScope);
  const masterKey = normalizeComparable(postingType);
  const master = masters.find((candidate) => normalizeComparable(candidate.value) === masterKey);
  if (!master) {
    throw new AuthorizationError(
      'This posting type is not mapped to your scope',
      'PROGRAM_NOT_ASSIGNED',
    );
  }

  const search = filters.search?.trim();
  const students = await prisma.student.findMany({
    where: {
      tenant_id: user.tenant_id,
      // Rejected students must not appear under a program.
      verification_status: { not: VerificationStatus.rejected },
      ...(search
        ? {
            OR: [
              { full_name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { enrollment_number: { contains: search, mode: 'insensitive' } },
              { roll_number: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: facultyProgramStudentInclude,
    orderBy: { full_name: 'asc' },
  });

  const data = students
    .filter((student) => studentMatchesFacultyScope(student, facultyScope))
    .map((student) => ({ student, status: studentUnderProgram(student, master) }))
    .filter(({ status }) => status.interested || status.applied)
    .map(({ student, status }) => mapProgramStudent(student, status));

  return { posting_type: master.value, data, total: data.length };
}
