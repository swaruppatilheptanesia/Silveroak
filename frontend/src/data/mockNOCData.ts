import type { NOCRequest } from '@/types/noc';

export const mockNOCRequests: NOCRequest[] = [
  {
    id: 'noc-001',
    student_id: 'STU2024001',
    student_name: 'Rahul Sharma',
    enrollment_number: '21BCE1234',
    department: 'Computer Science & Engineering',
    semester: 7,
    batch: '2021-2025',
    email: 'rahul.sharma@university.edu',
    mobile: '+91 98765 43210',
    parent_mobile: '+91 98765 43211',
    
    noc_type: 'internship',
    program: 'summer_internship',
    placement_source: 'self_sourced',
    
    company_id: 'comp-new-001',
    company_name: 'InnovateTech Solutions Pvt. Ltd.',
    company_address: '4th Floor, Tech Park, Satellite Road',
    company_city: 'Ahmedabad',
    company_state: 'Gujarat',
    company_pincode: '380015',
    company_verification_status: 'verified',
    
    contact_person_name: 'Vikram Patel',
    contact_person_phone: '+91 99887 76655',
    contact_person_email: 'vikram.patel@innovatetech.com',
    contact_person_designation: 'HR Manager',
    
    company_reference_by: 'alumni',
    company_reference_details: 'Referenced by senior batch alumnus',
    
    role_title: 'Software Development Intern',
    technology_domain: 'Full Stack Development',
    job_description: 'Working on React.js and Node.js based web applications',
    stipend_amount: 15000,
    stipend_currency: 'INR',
    start_date: '2026-05-15',
    end_date: '2026-07-15',
    duration_weeks: 8,
    
    offer_letter_url: '/documents/offer_rahul.pdf',
    
    status: 'pending_faculty',
    
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 'noc-002',
    student_id: 'STU2024002',
    student_name: 'Priya Patel',
    enrollment_number: '21BIT5678',
    department: 'Information Technology',
    semester: 7,
    batch: '2021-2025',
    email: 'priya.patel@university.edu',
    mobile: '+91 87654 32109',
    
    noc_type: 'internship',
    program: 'final_semester_internship',
    placement_source: 'university_drive',
    drive_id: 'drive-001',
    drive_name: 'TCS Campus Recruitment 2025',
    offer_id: 'offer-001',
    
    company_id: 'comp-001',
    company_name: 'TCS',
    company_address: 'TCS House, Raveline Street',
    company_city: 'Mumbai',
    company_state: 'Maharashtra',
    company_pincode: '400001',
    company_verification_status: 'verified',
    
    contact_person_name: 'Suresh Kumar',
    contact_person_phone: '+91 22 6778 9900',
    contact_person_email: 'campus.recruitment@tcs.com',
    contact_person_designation: 'Campus Recruitment Lead',
    
    company_reference_by: 'placement_cell',
    
    role_title: 'Graduate Trainee',
    technology_domain: 'Enterprise Solutions',
    stipend_amount: 21000,
    stipend_currency: 'INR',
    start_date: '2026-01-10',
    end_date: '2026-06-10',
    duration_weeks: 22,
    
    status: 'pending_tpo',
    
    faculty_approver_id: 'fac-001',
    faculty_approver_name: 'Prof. Ramesh Kumar',
    faculty_approved_at: '2026-01-22T14:30:00Z',
    faculty_remarks: 'Good opportunity. Approved.',
    faculty_decision: 'approved',
    
    created_at: '2026-01-18T09:00:00Z',
    updated_at: '2026-01-22T14:30:00Z',
  },
  {
    id: 'noc-003',
    student_id: 'STU2024003',
    student_name: 'Amit Kumar',
    enrollment_number: '21BCE9876',
    department: 'Computer Science & Engineering',
    semester: 6,
    batch: '2021-2025',
    email: 'amit.kumar@university.edu',
    mobile: '+91 76543 21098',
    
    noc_type: 'training',
    program: 'industrial_training',
    placement_source: 'self_sourced',
    
    company_name: 'CloudNine Technologies',
    company_address: '2nd Floor, Business Hub',
    company_city: 'Gandhinagar',
    company_state: 'Gujarat',
    company_pincode: '382007',
    company_verification_status: 'pending',
    
    contact_person_name: 'Neha Shah',
    contact_person_phone: '+91 88776 65544',
    contact_person_email: 'neha@cloudnine.in',
    contact_person_designation: 'Technical Lead',
    
    company_reference_by: 'faculty',
    company_reference_details: 'Referred by Prof. Sharma',
    
    role_title: 'Cloud Computing Trainee',
    technology_domain: 'AWS, Cloud Infrastructure',
    job_description: 'Learning AWS services and cloud deployment',
    stipend_amount: 10000,
    stipend_currency: 'INR',
    start_date: '2026-06-01',
    end_date: '2026-07-31',
    duration_weeks: 8,
    
    status: 'pending_company_verification',
    
    faculty_approver_id: 'fac-002',
    faculty_approver_name: 'Dr. Anjali Desai',
    faculty_approved_at: '2026-01-25T11:00:00Z',
    faculty_remarks: 'Approved pending company verification.',
    faculty_decision: 'approved',
    
    created_at: '2026-01-23T08:00:00Z',
    updated_at: '2026-01-25T11:00:00Z',
  },
  {
    id: 'noc-004',
    student_id: 'STU2024004',
    student_name: 'Sneha Reddy',
    enrollment_number: '21BEC4567',
    department: 'Electronics & Communication',
    semester: 8,
    batch: '2021-2025',
    email: 'sneha.reddy@university.edu',
    mobile: '+91 65432 10987',
    
    noc_type: 'project',
    program: 'dissertation',
    placement_source: 'self_sourced',
    
    company_id: 'comp-002',
    company_name: 'Infosys',
    company_address: 'Electronics City',
    company_city: 'Bangalore',
    company_state: 'Karnataka',
    company_pincode: '560100',
    company_verification_status: 'verified',
    
    contact_person_name: 'Rajesh Menon',
    contact_person_phone: '+91 80 2852 0000',
    contact_person_email: 'rajesh.menon@infosys.com',
    contact_person_designation: 'Project Manager',
    
    company_reference_by: 'self',
    
    role_title: 'IoT Research Intern',
    technology_domain: 'Internet of Things, Embedded Systems',
    job_description: 'Research project on IoT-based smart agriculture systems',
    stipend_amount: 25000,
    stipend_currency: 'INR',
    start_date: '2026-02-01',
    end_date: '2026-05-31',
    duration_weeks: 17,
    
    offer_letter_url: '/documents/offer_sneha.pdf',
    
    status: 'issued',
    
    faculty_approver_id: 'fac-003',
    faculty_approver_name: 'Prof. Vijay Singh',
    faculty_approved_at: '2026-01-10T09:00:00Z',
    faculty_remarks: 'Excellent research opportunity.',
    faculty_decision: 'approved',
    
    tpo_approver_id: 'admin-001',
    tpo_approver_name: 'Dr. Priya Mehta',
    tpo_approved_at: '2026-01-12T15:00:00Z',
    tpo_remarks: 'Approved. NOC issued.',
    tpo_decision: 'approved',
    
    noc_number: 'NOC/2026/ECE/0001',
    issued_at: '2026-01-12T15:30:00Z',
    certificate_url: '/certificates/noc_sneha.pdf',
    
    created_at: '2026-01-05T10:00:00Z',
    updated_at: '2026-01-12T15:30:00Z',
  },
  {
    id: 'noc-005',
    student_id: 'STU2024005',
    student_name: 'Karan Mehta',
    enrollment_number: '21BCE3456',
    department: 'Computer Science & Engineering',
    semester: 6,
    batch: '2021-2025',
    email: 'karan.mehta@university.edu',
    mobile: '+91 54321 09876',
    
    noc_type: 'internship',
    program: 'nep_internship',
    placement_source: 'self_sourced',
    
    company_name: 'StartupXYZ',
    company_address: '10th Floor, Co-working Space',
    company_city: 'Surat',
    company_state: 'Gujarat',
    company_pincode: '395007',
    company_verification_status: 'verified',
    
    contact_person_name: 'Rohan Joshi',
    contact_person_phone: '+91 77665 54433',
    contact_person_email: 'rohan@startupxyz.com',
    contact_person_designation: 'CTO',
    
    company_reference_by: 'other',
    company_reference_details: 'Found through LinkedIn',
    
    role_title: 'Backend Developer Intern',
    technology_domain: 'Python, Django, PostgreSQL',
    job_description: 'Building RESTful APIs and database management',
    stipend_amount: 12000,
    stipend_currency: 'INR',
    start_date: '2026-03-01',
    end_date: '2026-04-30',
    duration_weeks: 8,
    
    status: 'rejected',
    rejection_reason: 'Company does not meet minimum employee criteria for NEP internship.',
    
    faculty_approver_id: 'fac-002',
    faculty_approver_name: 'Dr. Anjali Desai',
    faculty_approved_at: '2026-01-28T10:00:00Z',
    faculty_remarks: 'Company seems small. Please verify.',
    faculty_decision: 'approved',
    
    tpo_approver_id: 'admin-001',
    tpo_approver_name: 'Dr. Priya Mehta',
    tpo_approved_at: '2026-01-29T16:00:00Z',
    tpo_remarks: 'Rejected - Company does not meet NEP criteria (min 50 employees required).',
    tpo_decision: 'rejected',
    
    created_at: '2026-01-26T08:00:00Z',
    updated_at: '2026-01-29T16:00:00Z',
  },
];

// Helper functions
export const getStudentNOCRequests = (studentId: string): NOCRequest[] => {
  return mockNOCRequests.filter(r => r.student_id === studentId);
};

export const getPendingFacultyApprovals = (department: string): NOCRequest[] => {
  return mockNOCRequests.filter(
    r => r.status === 'pending_faculty' && r.department === department
  );
};

export const getPendingTPOApprovals = (): NOCRequest[] => {
  return mockNOCRequests.filter(r => r.status === 'pending_tpo');
};

export const getPendingCompanyVerifications = (): NOCRequest[] => {
  return mockNOCRequests.filter(r => r.status === 'pending_company_verification');
};

export const getIssuedNOCs = (): NOCRequest[] => {
  return mockNOCRequests.filter(r => r.status === 'issued');
};

export const getNOCStats = () => {
  return {
    total: mockNOCRequests.length,
    pending_faculty: mockNOCRequests.filter(r => r.status === 'pending_faculty').length,
    pending_tpo: mockNOCRequests.filter(r => r.status === 'pending_tpo').length,
    pending_verification: mockNOCRequests.filter(r => r.status === 'pending_company_verification').length,
    issued: mockNOCRequests.filter(r => r.status === 'issued').length,
    rejected: mockNOCRequests.filter(r => r.status === 'rejected').length,
  };
};

// Mock university drives for dropdown
export const mockUniversityDrives = [
  { id: 'drive-001', name: 'TCS Campus Recruitment 2025', company: 'TCS' },
  { id: 'drive-002', name: 'Infosys InStep 2025', company: 'Infosys' },
  { id: 'drive-003', name: 'Wipro Elite 2025', company: 'Wipro' },
];

// Mock verified companies for search
export const mockVerifiedCompanies = [
  { id: 'comp-001', name: 'TCS', city: 'Mumbai', verified: true },
  { id: 'comp-002', name: 'Infosys', city: 'Bangalore', verified: true },
  { id: 'comp-003', name: 'Wipro', city: 'Bangalore', verified: true },
  { id: 'comp-004', name: 'Tech Mahindra', city: 'Pune', verified: true },
  { id: 'comp-005', name: 'HCL Technologies', city: 'Noida', verified: true },
];
