import { StudentMaster, AcademicProfile, EligibilityStatus } from '@/types/student';

// Minimum profile completion required for interest registration
export const MIN_PROFILE_COMPLETION = 80;

// Profile sections and their weights for completion calculation
export const PROFILE_SECTIONS = {
  basicInfo: { weight: 20, fields: ['full_name', 'email', 'mobile', 'date_of_birth', 'gender'] },
  academic: { weight: 25, fields: ['cgpa', 'tenth_percentage', 'semester'] },
  address: { weight: 15, fields: ['permanent_address', 'current_address'] },
  documents: { weight: 20, fields: ['profile_photo_url', 'linkedin_url'] },
  skills: { weight: 20, fields: ['skill_tags', 'domain_interests'] },
} as const;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EligibilityValidation {
  status: EligibilityStatus;
  cgpaCheck: { passed: boolean; value: number; required: number };
  backlogCheck: { passed: boolean; value: number; maxAllowed: number };
  percentageCheck: { passed: boolean; tenthValue: number; twelfthValue?: number; required: number };
}

/**
 * Check if a student can register for interests
 * Requirements: Profile >= 80% complete AND policy accepted
 */
export function canRegisterInterest(
  student: StudentMaster,
  profileCompletion: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (profileCompletion < MIN_PROFILE_COMPLETION) {
    errors.push(`Profile must be at least ${MIN_PROFILE_COMPLETION}% complete. Current: ${profileCompletion}%`);
  }

  if (!student.policy_accepted) {
    errors.push('You must accept the Placement Policy before registering for interests.');
  }

  if (profileCompletion >= 70 && profileCompletion < MIN_PROFILE_COMPLETION) {
    warnings.push(`Your profile is ${profileCompletion}% complete. Complete ${MIN_PROFILE_COMPLETION - profileCompletion}% more to register.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a student is eligible for placement lists
 * Requirements: Must have registered interest for that specific type
 */
export function canBeIncludedInList(
  studentId: string,
  interestType: string,
  registeredInterests: { student_id: string; interest_type: string }[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hasRegistered = registeredInterests.some(
    (i) => i.student_id === studentId && i.interest_type === interestType
  );

  if (!hasRegistered) {
    errors.push(`Student has not registered interest for ${interestType.replace(/_/g, ' ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if policy acceptance is valid
 */
export function validatePolicyAcceptance(student: StudentMaster): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!student.policy_accepted) {
    errors.push('Placement policy must be accepted to proceed.');
  }

  if (student.policy_accepted && !student.policy_accepted_at) {
    warnings.push('Policy acceptance timestamp is missing.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Auto-calculate eligibility based on academic profile
 * This is computed and cannot be manually overridden
 */
export function calculateEligibility(
  academicProfile: AcademicProfile,
  minCgpa: number = 7.0,
  maxBacklogs: number = 0,
  minPercentage: number = 60
): EligibilityValidation {
  const cgpaCheck = {
    passed: academicProfile.cgpa >= minCgpa,
    value: academicProfile.cgpa,
    required: minCgpa,
  };

  const backlogCheck = {
    passed: academicProfile.backlog_count <= maxBacklogs,
    value: academicProfile.backlog_count,
    maxAllowed: maxBacklogs,
  };

  const percentageCheck = {
    passed: academicProfile.tenth_percentage >= minPercentage &&
      (!academicProfile.twelfth_percentage || academicProfile.twelfth_percentage >= minPercentage),
    tenthValue: academicProfile.tenth_percentage,
    twelfthValue: academicProfile.twelfth_percentage,
    required: minPercentage,
  };

  const allPassed = cgpaCheck.passed && backlogCheck.passed && percentageCheck.passed;
  const somePassed = cgpaCheck.passed || backlogCheck.passed;

  let status: EligibilityStatus;
  if (allPassed) {
    status = 'eligible';
  } else if (somePassed && academicProfile.cgpa >= minCgpa - 1) {
    status = 'conditional';
  } else {
    status = 'not_eligible';
  }

  return {
    status,
    cgpaCheck,
    backlogCheck,
    percentageCheck,
  };
}

/**
 * Get profile completion issues
 */
export function getProfileIssues(
  student: StudentMaster,
  profileCompletion: number
): { section: string; issue: string; severity: 'error' | 'warning' }[] {
  const issues: { section: string; issue: string; severity: 'error' | 'warning' }[] = [];

  if (!student.email) {
    issues.push({ section: 'Basic Info', issue: 'Email is required', severity: 'error' });
  }

  if (!student.mobile) {
    issues.push({ section: 'Basic Info', issue: 'Mobile number is required', severity: 'error' });
  }

  if (!student.date_of_birth) {
    issues.push({ section: 'Basic Info', issue: 'Date of birth is required', severity: 'error' });
  }

  if (!student.permanent_address) {
    issues.push({ section: 'Address', issue: 'Permanent address is required', severity: 'error' });
  }

  if (!student.profile_photo_url) {
    issues.push({ section: 'Documents', issue: 'Profile photo is required', severity: 'error' });
  }

  if (!student.linkedin_url) {
    issues.push({ section: 'Documents', issue: 'LinkedIn profile is recommended', severity: 'warning' });
  }

  if (profileCompletion < MIN_PROFILE_COMPLETION) {
    issues.push({
      section: 'Overall',
      issue: `Profile is ${profileCompletion}% complete. ${MIN_PROFILE_COMPLETION}% required for interest registration.`,
      severity: 'error',
    });
  }

  if (!student.policy_accepted) {
    issues.push({
      section: 'Policy',
      issue: 'Placement policy not accepted',
      severity: 'error',
    });
  }

  return issues;
}

/**
 * Check if profile is flagged as incomplete
 */
export function isProfileIncomplete(profileCompletion: number): boolean {
  return profileCompletion < MIN_PROFILE_COMPLETION;
}

/**
 * Get profile status badge info
 */
export function getProfileStatusBadge(profileCompletion: number): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
} {
  if (profileCompletion === 100) {
    return { label: 'Complete', variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  }
  if (profileCompletion >= MIN_PROFILE_COMPLETION) {
    return { label: 'Ready', variant: 'secondary', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
  }
  if (profileCompletion >= 50) {
    return { label: 'Incomplete', variant: 'outline', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
  }
  return { label: 'Incomplete', variant: 'destructive' };
}
