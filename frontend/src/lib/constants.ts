// Centralized constants and status configurations
import {
  UserCheck,
  Clock,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  FileX,
  Building2,
  type LucideIcon,
} from 'lucide-react';

// ============================================
// VERIFICATION STATUS
// ============================================
export type VerificationStatus = 'verified' | 'pending' | 'rejected';

export const VERIFICATION_STATUS_CONFIG: Record<VerificationStatus, {
  icon: LucideIcon;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  className: string;
}> = {
  verified: {
    icon: UserCheck,
    label: 'Verified',
    variant: 'success',
    className: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    variant: 'warning',
    className: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    variant: 'destructive',
    className: 'text-red-600 bg-red-500/10 border-red-500/20',
  },
};

// ============================================
// ELIGIBILITY STATUS
// ============================================
export type EligibilityStatus = 'eligible' | 'not_eligible' | 'conditional';

export const ELIGIBILITY_STATUS_CONFIG: Record<EligibilityStatus, {
  icon: LucideIcon;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  className: string;
}> = {
  eligible: {
    icon: CheckCircle2,
    label: 'Eligible',
    variant: 'success',
    className: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
  },
  not_eligible: {
    icon: XCircle,
    label: 'Not Eligible',
    variant: 'destructive',
    className: 'text-red-600 bg-red-500/10 border-red-500/20',
  },
  conditional: {
    icon: AlertTriangle,
    label: 'Conditional',
    variant: 'warning',
    className: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
  },
};

// ============================================
// POSTING STATUS
// ============================================
export type PostingStatus = 'draft' | 'published' | 'closed' | 'cancelled';

export const POSTING_STATUS_CONFIG: Record<PostingStatus, {
  icon: LucideIcon;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  className: string;
}> = {
  draft: {
    icon: FileX,
    label: 'Draft',
    variant: 'secondary',
    className: 'text-muted-foreground bg-muted/50 border-muted',
  },
  published: {
    icon: FileCheck,
    label: 'Published',
    variant: 'success',
    className: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
  },
  closed: {
    icon: XCircle,
    label: 'Closed',
    variant: 'outline',
    className: 'text-muted-foreground bg-muted/30 border-muted',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    variant: 'destructive',
    className: 'text-red-600 bg-red-500/10 border-red-500/20',
  },
};

// ============================================
// COMPANY CLASSIFICATION
// ============================================
export type CompanyClassification = 'dream' | 'super_dream' | 'regular' | 'startup';

export const COMPANY_CLASSIFICATION_CONFIG: Record<CompanyClassification, {
  icon: LucideIcon;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  className: string;
}> = {
  dream: {
    icon: Building2,
    label: 'Dream',
    variant: 'default',
    className: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  },
  super_dream: {
    icon: Building2,
    label: 'Super Dream',
    variant: 'default',
    className: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
  },
  regular: {
    icon: Building2,
    label: 'Regular',
    variant: 'secondary',
    className: 'text-muted-foreground bg-muted/50 border-muted',
  },
  startup: {
    icon: Building2,
    label: 'Startup',
    variant: 'outline',
    className: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
  },
};

// ============================================
// WORK MODE
// ============================================
export type WorkMode = 'onsite' | 'remote' | 'hybrid';

export const WORK_MODE_CONFIG: Record<WorkMode, {
  label: string;
  variant: 'default' | 'secondary' | 'outline';
}> = {
  onsite: { label: 'On-site', variant: 'outline' },
  remote: { label: 'Remote', variant: 'secondary' },
  hybrid: { label: 'Hybrid', variant: 'default' },
};

// ============================================
// COMMON DROPDOWN OPTIONS
// ============================================
export const DEPARTMENT_OPTIONS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Electrical',
  'Mechanical',
  'Civil',
  'Chemical',
  'Biotechnology',
] as const;

export const BATCH_YEAR_OPTIONS = [
  '2024',
  '2025',
  '2026',
  '2027',
] as const;

export const LOCATION_OPTIONS = [
  'Bangalore',
  'Mumbai',
  'Delhi NCR',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Kolkata',
  'Remote',
] as const;

export const DOMAIN_OPTIONS = [
  'Software Development',
  'Data Science',
  'Machine Learning',
  'Web Development',
  'Mobile Development',
  'DevOps',
  'Cloud Computing',
  'Cybersecurity',
  'UI/UX Design',
  'Product Management',
] as const;

// ============================================
// PAGINATION DEFAULTS
// ============================================
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// ============================================
// PROFILE COMPLETION
// ============================================
export const MIN_PROFILE_COMPLETION = 80;
export const PROFILE_COMPLETION_THRESHOLDS = {
  excellent: 100,
  good: 80,
  fair: 50,
  poor: 0,
} as const;
