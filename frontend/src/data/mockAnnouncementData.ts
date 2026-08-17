import { Announcement, AnnouncementReceipt } from '@/types/announcement';

export const mockAnnouncements: Announcement[] = [
  {
    id: 'ANN001',
    title: 'Campus Placement Drive – TCS Digital',
    content: 'TCS Digital is visiting our campus on 15th March 2025 for recruitment. All eligible students from CSE, IT, ECE, and EE departments with CGPA ≥ 7.0 and no active backlogs are requested to register before 10th March. Carry 2 copies of your resume, ID card, and all original mark sheets. Dress code: Formal.',
    priority: 'high',
    status: 'published',
    targetAudience: { type: 'department', filters: { departments: ['CSE', 'IT', 'ECE', 'EE'] } },
    createdBy: 'Dr. Priya Mehta',
    createdAt: '2025-03-01T10:00:00',
    publishedAt: '2025-03-01T10:30:00',
    totalRecipients: 1250,
    readCount: 980,
    consentCount: 0,
    requiresConsent: false,
    linkedCircularId: 'circ_002',
  },
  {
    id: 'ANN002',
    title: 'Placement Policy Acceptance – 2024-25 Batch',
    content: 'All students of the 2024-25 graduating batch must read and accept the updated Placement Policy before registering for any placement or internship drives. The policy document is available under the Policy section. Failure to accept the policy will result in ineligibility for all upcoming drives.',
    priority: 'high',
    status: 'published',
    targetAudience: { type: 'batch', filters: { batches: ['2025'] } },
    createdBy: 'Dr. Priya Mehta',
    createdAt: '2025-02-15T09:00:00',
    publishedAt: '2025-02-15T09:15:00',
    totalRecipients: 3200,
    readCount: 2800,
    consentCount: 2650,
    requiresConsent: true,
  },
  {
    id: 'ANN003',
    title: 'Resume Building Workshop – 22nd Feb',
    content: 'The TPO Cell is organizing a Resume Building Workshop on 22nd February 2025 from 10:00 AM to 1:00 PM in Seminar Hall 3. Industry experts from Infosys will guide students on crafting effective resumes. Open to all departments and batches. Limited seats – register early!',
    priority: 'medium',
    status: 'published',
    targetAudience: { type: 'all' },
    createdBy: 'Dr. Priya Mehta',
    createdAt: '2025-02-10T14:00:00',
    publishedAt: '2025-02-10T14:30:00',
    totalRecipients: 5000,
    readCount: 3100,
    consentCount: 0,
    requiresConsent: false,
  },
  {
    id: 'ANN004',
    title: 'Internship Opportunity – Wipro Summer Internship',
    content: 'Wipro is offering Summer Internship positions for pre-final year students. Stipend: ₹15,000/month. Duration: 2 months (May-June 2025). Eligible branches: CSE, IT, ME. Apply through the Opportunities section before 28th February.',
    priority: 'medium',
    status: 'published',
    targetAudience: { type: 'department', filters: { departments: ['CSE', 'IT', 'ME'] } },
    createdBy: 'Dr. Priya Mehta',
    createdAt: '2025-02-08T11:00:00',
    publishedAt: '2025-02-08T11:15:00',
    totalRecipients: 1800,
    readCount: 1200,
    consentCount: 0,
    requiresConsent: false,
  },
  {
    id: 'ANN005',
    title: 'Mock Interview Schedule – March 2025',
    content: 'Mock interviews for placement readiness assessment will be held from 3rd-7th March 2025. Department-wise schedules will be shared via your faculty coordinator. Participation is mandatory for all students registered for campus placements.',
    priority: 'low',
    status: 'published',
    targetAudience: { type: 'all' },
    createdBy: 'Dr. Priya Mehta',
    createdAt: '2025-02-05T16:00:00',
    publishedAt: '2025-02-05T16:30:00',
    totalRecipients: 4500,
    readCount: 2100,
    consentCount: 0,
    requiresConsent: false,
  },
  {
    id: 'ANN006',
    title: 'Important: Profile Completion Deadline',
    content: 'All students must complete their profile (including photo, LinkedIn URL, and resume upload) by 20th February 2025. Incomplete profiles will not be visible to recruiters. Check your profile completion status on the Dashboard.',
    priority: 'high',
    status: 'published',
    targetAudience: { type: 'all' },
    createdBy: 'Dr. Priya Mehta',
    createdAt: '2025-02-01T08:00:00',
    publishedAt: '2025-02-01T08:30:00',
    totalRecipients: 5000,
    readCount: 4200,
    consentCount: 0,
    requiresConsent: false,
  },
  {
    id: 'ANN007',
    title: 'Draft: Upcoming Hackathon Announcement',
    content: 'A 48-hour coding hackathon is being planned for April 2025 in collaboration with Google Developer Student Clubs. More details to follow.',
    priority: 'low',
    status: 'draft',
    targetAudience: { type: 'all' },
    createdBy: 'Dr. Priya Mehta',
    createdAt: '2025-02-14T10:00:00',
    totalRecipients: 0,
    readCount: 0,
    consentCount: 0,
    requiresConsent: false,
  },
  {
    id: 'ANN008',
    title: 'Aptitude Training Module 3 – Deadline Extended',
    content: 'The deadline for completing Aptitude Training Module 3 has been extended to 25th February 2025. Students who have not completed the module are advised to finish it at the earliest.',
    priority: 'medium',
    status: 'archived',
    targetAudience: { type: 'batch', filters: { batches: ['2025', '2026'] } },
    createdBy: 'Dr. Priya Mehta',
    createdAt: '2025-01-20T09:00:00',
    publishedAt: '2025-01-20T09:30:00',
    archivedAt: '2025-02-26T00:00:00',
    totalRecipients: 6400,
    readCount: 5800,
    consentCount: 0,
    requiresConsent: false,
  },
];

export const mockAnnouncementReceipts: AnnouncementReceipt[] = [
  // Receipts for ANN002 (consent-required)
  { announcementId: 'ANN002', studentId: 'STU2024001', studentName: 'Rahul Sharma', rollNumber: '21BCE1234', department: 'CSE', readAt: '2025-02-15T10:00:00', consentGiven: true, consentAt: '2025-02-15T10:05:00' },
  { announcementId: 'ANN002', studentId: 'STU2024002', studentName: 'Priya Patel', rollNumber: '21BIT5678', department: 'IT', readAt: '2025-02-15T11:30:00', consentGiven: true, consentAt: '2025-02-15T11:35:00' },
  { announcementId: 'ANN002', studentId: 'STU2024003', studentName: 'Amit Kumar', rollNumber: '21BME2345', department: 'ME', readAt: '2025-02-16T09:00:00', consentGiven: false, consentAt: undefined },
  { announcementId: 'ANN002', studentId: 'STU2024004', studentName: 'Sneha Joshi', rollNumber: '21BCE3456', department: 'CSE', readAt: '2025-02-15T14:00:00', consentGiven: true, consentAt: '2025-02-15T14:10:00' },
  { announcementId: 'ANN002', studentId: 'STU2024005', studentName: 'Ravi Desai', rollNumber: '21BEE6789', department: 'EE', readAt: undefined, consentGiven: false, consentAt: undefined },
  // Receipts for ANN001
  { announcementId: 'ANN001', studentId: 'STU2024001', studentName: 'Rahul Sharma', rollNumber: '21BCE1234', department: 'CSE', readAt: '2025-03-01T11:00:00', consentGiven: false, consentAt: undefined },
  { announcementId: 'ANN001', studentId: 'STU2024002', studentName: 'Priya Patel', rollNumber: '21BIT5678', department: 'IT', readAt: '2025-03-01T12:00:00', consentGiven: false, consentAt: undefined },
  { announcementId: 'ANN001', studentId: 'STU2024004', studentName: 'Sneha Joshi', rollNumber: '21BCE3456', department: 'CSE', readAt: '2025-03-02T09:00:00', consentGiven: false, consentAt: undefined },
];

export function getAnnouncementStats() {
  const total = mockAnnouncements.length;
  const published = mockAnnouncements.filter(a => a.status === 'published').length;
  const draft = mockAnnouncements.filter(a => a.status === 'draft').length;
  const archived = mockAnnouncements.filter(a => a.status === 'archived').length;
  const highPriority = mockAnnouncements.filter(a => a.priority === 'high' && a.status === 'published').length;
  const avgReadRate = Math.round(
    mockAnnouncements
      .filter(a => a.status === 'published' && a.totalRecipients > 0)
      .reduce((sum, a) => sum + (a.readCount / a.totalRecipients) * 100, 0) /
    Math.max(mockAnnouncements.filter(a => a.status === 'published' && a.totalRecipients > 0).length, 1)
  );
  return { total, published, draft, archived, highPriority, avgReadRate };
}

// Student-facing: filtered announcements for the logged-in student
export function getStudentAnnouncements(studentDepartment: string, studentBatch: string) {
  return mockAnnouncements
    .filter(a => a.status === 'published')
    .filter(a => {
      if (a.targetAudience.type === 'all') return true;
      if (a.targetAudience.type === 'department' && a.targetAudience.filters?.departments?.includes(studentDepartment)) return true;
      if (a.targetAudience.type === 'batch' && a.targetAudience.filters?.batches?.includes(studentBatch)) return true;
      return false;
    });
}

export function getReceiptsForAnnouncement(announcementId: string) {
  return mockAnnouncementReceipts.filter(r => r.announcementId === announcementId);
}
