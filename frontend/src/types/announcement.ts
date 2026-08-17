export type AnnouncementPriority = 'high' | 'medium' | 'low';
export type AnnouncementStatus = 'draft' | 'published' | 'archived';

export type TargetAudienceType = 'all' | 'batch' | 'department' | 'semester' | 'eligible_for_posting';

export interface TargetAudience {
  type: TargetAudienceType;
  filters?: {
    institutes?: string[];
    courses?: string[];
    branches?: string[];
    batches?: string[];
    departments?: string[];
    postingId?: string;
  };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  targetAudience: TargetAudience;
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
  archivedAt?: string;
  totalRecipients: number;
  readCount: number;
  consentCount: number;
  requiresConsent: boolean;
  linkedCircularId?: string;
}

export interface AnnouncementReceipt {
  announcementId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  department: string;
  readAt?: string;
  consentGiven: boolean;
  consentAt?: string;
}

export interface ApiAnnouncementAuthor {
  id: string;
  name: string | null;
}

export interface ApiAnnouncementMyReceipt {
  is_read: boolean;
  read_at: string | null;
  has_consented: boolean;
  consented_at: string | null;
}

export interface ApiAnnouncementLinkedCircular {
  id: string;
  company_name: string;
  role_name: string;
  type: string | null;
  template: {
    id: string;
    name: string;
  } | null;
}

export interface ApiAnnouncementReceiptEntry {
  id: string;
  is_read: boolean;
  read_at: string | null;
  has_consented: boolean;
  consented_at: string | null;
  student: {
    id: string;
    full_name: string;
    enrollment_number: string;
    department: string;
    batch: string;
    email: string;
  };
}

export interface ApiAnnouncementListItem {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  target_audience_type: TargetAudienceType;
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
  target_batches: string[];
  target_departments: string[];
  target_semesters: string[];
  target_posting_id: string | null;
  requires_consent: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime_type: string | null;
  attachment_size: number | null;
  linked_circular_id: string | null;
  total_recipients: number;
  read_count: number;
  consent_count: number;
  created_by: string | null;
  created_at: string;
  published_at: string | null;
  archived_at: string | null;
  created_by_user: ApiAnnouncementAuthor | null;
  my_receipt: ApiAnnouncementMyReceipt | null;
}

export interface ApiAnnouncementDetail extends ApiAnnouncementListItem {
  linked_circular: ApiAnnouncementLinkedCircular | null;
  receipts: ApiAnnouncementReceiptEntry[];
}

export interface PaginatedAnnouncements {
  data: ApiAnnouncementListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AnnouncementQueryParams {
  status?: AnnouncementStatus;
  priority?: AnnouncementPriority;
  page?: number;
  limit?: number;
  sort_by?: 'title' | 'priority' | 'status' | 'published_at' | 'created_at';
  sort_order?: 'asc' | 'desc';
  // FILTER COUNTER EXPORT — target-scope (institute/course/branch) + date range
  institute?: string;
  course?: string;
  branch?: string;
  date_from?: string;
  date_to?: string;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  target_audience_type?: TargetAudienceType;
  target_institutes?: string[];
  target_courses?: string[];
  target_branches?: string[];
  target_batches?: string[];
  target_departments?: string[];
  target_semesters?: string[];
  target_posting_id?: string | null;
  requires_consent?: boolean;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_mime_type?: string | null;
  attachment_size?: number | null;
  linked_circular_id?: string | null;
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

export interface AnnouncementAttachmentUpload {
  attachment_url: string;
  attachment_name: string;
  attachment_mime_type: string;
  attachment_size: number;
}

/** Institute/Course/Branch scope the semester options are derived for. */
export interface AnnouncementAudienceScopeParams {
  institutes?: string[];
  courses?: string[];
  branches?: string[];
}

/**
 * Semesters that actually exist among students in the selected scope. Derived from student records
 * (no course→semester mapping exists), which is what prevents cross-course semester selection.
 */
export interface AnnouncementAudienceSemesterOptions {
  semesters: { semester: string; students: number }[];
  total_students: number;
}
