// Tenant configuration type definitions for multi-university SaaS readiness

export interface TenantBranding {
  universityName: string;
  shortName: string;
  logoUrl: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
}

export interface TenantPolicyRules {
  /** Minimum profile completion percentage required for placement participation */
  minProfileCompletionPercent: number;
  /** Whether students can hold only one active offer at a time */
  singleActiveOfferEnabled: boolean;
  /** Whether mock round pass is required before shortlisting */
  mockRoundGatekeepingEnabled: boolean;
  /** NOC number format template. Use {{YEAR}}, {{DEPT}}, {{SEQ}} as placeholders */
  nocNumberFormat: string;
  /** Whether PII (email, phone, address) should be blocked from recruiter exports */
  piiBlockingEnabled: boolean;
}

export interface TenantAcademicConfig {
  departments: string[];
  batches: string[];
  courses: string[];
  institutes: string[];
  gradingSystem: 'cgpa_10' | 'cgpa_4' | 'percentage';
  /** Max scale for CGPA (e.g. 10 for Indian system) */
  maxCgpa: number;
}

export interface TenantPlacementConfig {
  categories: { value: string; label: string }[];
  defaultAcademicYear: string;
  interestTypes: { value: string; label: string }[];
}

export interface TenantFeatureFlags {
  portfolioEnabled: boolean;
  nocEnabled: boolean;
  circularsEnabled: boolean;
  announcementsEnabled: boolean;
  internshipsEnabled: boolean;
  reportsEnabled: boolean;
}

export interface TenantConfig {
  tenantId: string;
  slug: string;
  branding: TenantBranding;
  policyRules: TenantPolicyRules;
  academic: TenantAcademicConfig;
  placement: TenantPlacementConfig;
  features: TenantFeatureFlags;
}
