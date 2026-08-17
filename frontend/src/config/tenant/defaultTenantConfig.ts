import type { TenantConfig } from './types';
import souLogo from '@/assets/sou-logo.png';

/**
 * Default tenant configuration — Silver Oak University.
 * This is the single source of truth for all university-specific settings.
 * Replace or override this config to onboard a different university.
 */
export const defaultTenantConfig: TenantConfig = {
  tenantId: 'sou-default',
  slug: import.meta.env.VITE_TENANT_SLUG || 'silver-oak-university',

  branding: {
    universityName: 'Silver Oak University',
    shortName: 'SOU',
    logoUrl: souLogo,
    tagline: 'Training & Placement Cell',
    contactEmail: 'tpo@silveroakuniversity.ac.in',
    contactPhone: '+91 79 6186 1000',
    websiteUrl: 'https://silveroakuniversity.ac.in',
  },

  policyRules: {
    minProfileCompletionPercent: 80,
    singleActiveOfferEnabled: true,
    mockRoundGatekeepingEnabled: true,
    nocNumberFormat: 'NOC/{{YEAR}}/{{DEPT}}/{{SEQ}}',
    piiBlockingEnabled: true,
  },

  academic: {
    departments: [
      'Computer Science & Engineering',
      'Information Technology',
      'Electronics & Communication',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Chemical Engineering',
    ],
    batches: ['2021-2025', '2022-2026', '2023-2027', '2024-2028'],
    courses: ['B.Tech', 'B.E.', 'M.Tech', 'M.E.', 'MCA', 'BCA', 'MBA', 'Diploma'],
    institutes: [
      'Gujarat Technological University',
      'Indian Institute of Technology',
      'National Institute of Technology',
      'Birla Institute of Technology',
      'VIT University',
      'SRM University',
      'BITS Pilani',
    ],
    gradingSystem: 'cgpa_10',
    maxCgpa: 10,
  },

  placement: {
    categories: [
      { value: 'dream', label: 'Dream' },
      { value: 'super_dream', label: 'Super Dream' },
      { value: 'regular', label: 'Regular' },
      { value: 'startup', label: 'Startup' },
    ],
    defaultAcademicYear: '2025-26',
    interestTypes: [
      { value: 'placement', label: 'Campus Placement' },
      { value: 'summer_internship', label: 'Summer Internship' },
      { value: 'winter_internship', label: 'Winter Internship' },
      { value: 'final_semester_internship', label: 'Final Semester Internship' },
      { value: 'nep_internship', label: 'NEP Internship' },
      { value: 'stipend_internship', label: 'Stipend Internship' },
      { value: 'dissertation', label: 'Dissertation' },
    ],
  },

  features: {
    portfolioEnabled: true,
    nocEnabled: true,
    circularsEnabled: true,
    announcementsEnabled: true,
    internshipsEnabled: true,
    reportsEnabled: true,
  },
};
