import type { InternshipRecord, InternshipIssue } from '@/types/internship';

export const mockInternships: InternshipRecord[] = [
  {
    id: 'intern-001',
    student_id: 'STU2024001',
    student_name: 'Rahul Sharma',
    enrollment_number: '21BCE1234',
    department: 'Computer Science',
    batch: '2025',
    offer_id: 'offer-003',
    company_id: 'comp-002',
    company_name: 'InnovateTech Pvt Ltd',
    role: 'AI/ML Intern',
    internship_type: 'stipend_based',
    start_date: '2026-03-01',
    end_date: '2026-08-31',
    status: 'ongoing',
    stipend_amount: 25000,
    stipend_frequency: 'monthly',
    receiving_stipend: true,
    completion_certificate_uploaded: false,
    certificate_due_date: '2026-08-06',
    created_at: '2026-02-10T10:00:00Z',
    created_by: 'Dr. Priya Mehta',
    updated_at: '2026-02-10T10:00:00Z',
  },
  {
    id: 'intern-002',
    student_id: 'STU2024008',
    student_name: 'Kavya Nair',
    enrollment_number: '22BCE2002',
    department: 'Artificial Intelligence',
    batch: '2026',
    offer_id: 'offer-005',
    company_id: 'comp-002',
    company_name: 'InnovateTech Pvt Ltd',
    role: 'Data Science Intern',
    internship_type: 'stipend_based',
    start_date: '2026-06-01',
    end_date: '2026-11-30',
    status: 'discontinued',
    stipend_amount: 20000,
    stipend_frequency: 'monthly',
    receiving_stipend: false,
    stipend_remarks: 'Discontinued due to health reasons',
    completion_certificate_uploaded: false,
    created_at: '2026-02-10T11:00:00Z',
    created_by: 'Dr. Priya Mehta',
    updated_at: '2026-06-05T10:30:00Z',
  },
  {
    id: 'intern-003',
    student_id: 'STU2024010',
    student_name: 'Arjun Desai',
    enrollment_number: '21BCE1240',
    department: 'Computer Science',
    batch: '2025',
    offer_id: 'offer-006',
    company_id: 'comp-003',
    company_name: 'GlobalSoft Inc.',
    role: 'Backend Developer Intern',
    internship_type: 'paid',
    start_date: '2026-01-15',
    end_date: '2026-06-15',
    status: 'completed',
    stipend_amount: 30000,
    stipend_frequency: 'monthly',
    receiving_stipend: true,
    completion_certificate_uploaded: true,
    created_at: '2026-01-10T09:00:00Z',
    created_by: 'Dr. Priya Mehta',
    updated_at: '2026-06-16T09:00:00Z',
  },
  {
    id: 'intern-004',
    student_id: 'STU2024011',
    student_name: 'Meera Joshi',
    enrollment_number: '21BIT1050',
    department: 'Information Technology',
    batch: '2025',
    offer_id: 'offer-007',
    company_id: 'comp-001',
    company_name: 'TechCorp Solutions',
    role: 'QA Intern',
    internship_type: 'unpaid',
    start_date: '2026-02-01',
    end_date: '2026-05-31',
    status: 'ongoing',
    receiving_stipend: false,
    completion_certificate_uploaded: false,
    certificate_due_date: '2026-05-06',
    created_at: '2026-01-28T14:00:00Z',
    created_by: 'Dr. Priya Mehta',
    updated_at: '2026-01-28T14:00:00Z',
  },
  {
    id: 'intern-005',
    student_id: 'STU2024012',
    student_name: 'Vikram Singh',
    enrollment_number: '21BCE1245',
    department: 'Computer Science',
    batch: '2025',
    offer_id: 'offer-008',
    company_id: 'comp-002',
    company_name: 'InnovateTech Pvt Ltd',
    role: 'Frontend Intern',
    internship_type: 'stipend_based',
    start_date: '2026-03-01',
    end_date: '2026-08-31',
    status: 'ongoing',
    stipend_amount: 15000,
    stipend_frequency: 'monthly',
    receiving_stipend: true,
    completion_certificate_uploaded: false,
    certificate_due_date: '2026-08-06',
    created_at: '2026-02-15T10:00:00Z',
    created_by: 'Dr. Priya Mehta',
    updated_at: '2026-02-15T10:00:00Z',
  },
  {
    id: 'intern-006',
    student_id: 'STU2024013',
    student_name: 'Ananya Kulkarni',
    enrollment_number: '21BCE1248',
    department: 'Computer Science',
    batch: '2025',
    offer_id: 'offer-009',
    company_id: 'comp-003',
    company_name: 'GlobalSoft Inc.',
    role: 'DevOps Intern',
    internship_type: 'stipend_based',
    start_date: '2026-01-10',
    end_date: '2026-07-10',
    status: 'ongoing',
    stipend_amount: 22000,
    stipend_frequency: 'monthly',
    receiving_stipend: true,
    completion_certificate_uploaded: false,
    certificate_due_date: '2026-06-15',
    created_at: '2026-01-05T10:00:00Z',
    created_by: 'Dr. Priya Mehta',
    updated_at: '2026-01-05T10:00:00Z',
  },
  {
    id: 'intern-007',
    student_id: 'STU2024014',
    student_name: 'Rohan Kapoor',
    enrollment_number: '22BAI1010',
    department: 'Artificial Intelligence',
    batch: '2026',
    offer_id: 'offer-010',
    company_id: 'comp-001',
    company_name: 'TechCorp Solutions',
    role: 'ML Research Intern',
    internship_type: 'stipend_based',
    start_date: '2026-02-15',
    end_date: '2026-08-15',
    status: 'ongoing',
    stipend_amount: 18000,
    stipend_frequency: 'monthly',
    receiving_stipend: true,
    completion_certificate_uploaded: false,
    certificate_due_date: '2026-07-21',
    created_at: '2026-02-10T09:00:00Z',
    created_by: 'Dr. Priya Mehta',
    updated_at: '2026-02-10T09:00:00Z',
  },
];

export const mockInternshipIssues: InternshipIssue[] = [
  {
    id: 'issue-001',
    internship_id: 'intern-002',
    description: 'Student not receiving stipend for the past 2 months',
    status: 'resolved',
    resolution_remarks: 'Contacted company HR, stipend cleared',
    logged_by: 'Dr. Priya Mehta',
    logged_at: '2026-04-10T10:00:00Z',
    resolved_at: '2026-04-15T11:00:00Z',
  },
  {
    id: 'issue-002',
    internship_id: 'intern-004',
    description: 'Student reports hostile work environment',
    status: 'open',
    logged_by: 'Prof. Ramesh Kumar',
    logged_at: '2026-03-20T14:00:00Z',
  },
  {
    id: 'issue-003',
    internship_id: 'intern-005',
    description: 'Stipend amount less than minimum guideline - company paying ₹15,000 instead of ₹5,000 minimum',
    status: 'resolved',
    resolution_remarks: 'Verified with company - they increased to meet guidelines',
    logged_by: 'Dr. Priya Mehta',
    logged_at: '2026-03-10T09:00:00Z',
    resolved_at: '2026-03-15T10:00:00Z',
  },
];

// Helper functions
export const getInternshipsByStudent = (studentId: string): InternshipRecord[] =>
  mockInternships.filter(i => i.student_id === studentId);

export const getInternshipsByCompany = (companyId: string): InternshipRecord[] =>
  mockInternships.filter(i => i.company_id === companyId);

export const getInternshipsByDepartment = (department: string): InternshipRecord[] =>
  mockInternships.filter(i => i.department === department);

export const getIssuesByInternship = (internshipId: string): InternshipIssue[] =>
  mockInternshipIssues.filter(i => i.internship_id === internshipId);

export const getOpenIssuesCount = (): number =>
  mockInternshipIssues.filter(i => i.status === 'open').length;

export const getInternshipStats = () => ({
  total: mockInternships.length,
  ongoing: mockInternships.filter(i => i.status === 'ongoing').length,
  completed: mockInternships.filter(i => i.status === 'completed').length,
  discontinued: mockInternships.filter(i => i.status === 'discontinued').length,
  receivingStipend: mockInternships.filter(i => i.receiving_stipend).length,
  openIssues: getOpenIssuesCount(),
  certificatesPending: mockInternships.filter(i => !i.completion_certificate_uploaded && i.status !== 'discontinued').length,
});

export const getCertificateDueAlerts = (): InternshipRecord[] => {
  const now = new Date();
  const in25Days = new Date();
  in25Days.setDate(now.getDate() + 25);
  return mockInternships.filter(i => {
    if (i.status !== 'ongoing' || i.completion_certificate_uploaded) return false;
    const endDate = new Date(i.end_date);
    return endDate <= in25Days;
  });
};
