export type NotificationType =
  | 'profile'
  | 'policy'
  | 'readiness'
  | 'placement'
  | 'offer'
  | 'application'
  | 'interest'
  | 'noc'
  | 'event'
  | 'announcement'
  | 'circular'
  | 'no_dues'
  | 'recruiter';
export type NotificationPriority = 'high' | 'medium' | 'low';
export type NotificationOfferType = 'job' | 'internship';

export interface OfferNotificationPayload {
  posting_id: string;
  offer_id: string;
  offered_student_id: string;
  offered_student_name: string;
  offered_student_photo_url: string | null;
  company_name: string;
  role: string;
  offer_type: NotificationOfferType;
  is_target_student: boolean;
}

export interface ApiNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string | null;
  priority: NotificationPriority;
  action_url: string | null;
  payload: OfferNotificationPayload | Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedNotifications {
  data: ApiNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  unread_count: number;
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
}

export interface NotificationPreference {
  category: NotificationType;
  enabled: boolean;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreference[];
}

export const NOTIFICATION_CATEGORY_META: Record<NotificationType, { label: string; description: string }> = {
  offer: { label: 'Offers', description: 'When an offer is released, accepted, rejected, or withdrawn.' },
  application: { label: 'Applications', description: 'New applications, stage moves, mock results, withdrawals.' },
  interest: { label: 'Interest registrations', description: 'When students register interest (admin view).' },
  noc: { label: 'NOC', description: 'NOC requests, approvals, rejections, and issuance.' },
  event: { label: 'Events & Drives', description: 'New events, slot assignments, attendance updates.' },
  no_dues: { label: 'No Dues', description: 'No-Dues submissions, reviews, and issuance.' },
  recruiter: { label: 'Recruiter status', description: 'Recruiter verification verdicts.' },
  announcement: { label: 'Announcements', description: 'New placement announcements (can be noisy).' },
  circular: { label: 'Circulars', description: 'Newly generated circulars (can be noisy).' },
  policy: { label: 'Policies', description: 'Placement policy publications.' },
  placement: { label: 'Placement (legacy)', description: 'Legacy offer broadcasts kept for back-compat.' },
  profile: { label: 'Profile reminders', description: 'Nudges to complete profile (reserved for future use).' },
  readiness: { label: 'Readiness nudges', description: 'Placement-readiness reminders (reserved for future use).' },
};

export const NOTIFICATION_CATEGORY_ORDER: NotificationType[] = [
  'offer',
  'application',
  'interest',
  'noc',
  'event',
  'no_dues',
  'recruiter',
  'announcement',
  'circular',
  'policy',
  'profile',
  'readiness',
  'placement',
];
