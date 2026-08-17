// Job & Internship Posting Types

export type PostingType = 'job' | 'internship' | 'stipend_internship';
export type PostingStatus = 'draft' | 'published' | 'closed';
export type WorkMode = 'onsite' | 'remote' | 'hybrid';

export interface EligibilityCriteria {
  branches: string[];
  batches: string[]; // e.g., ['2024', '2025']
  minCgpa: number;
  maxBacklogs: number;
  skillRequirements?: string;
}

export interface SelectionProcess {
  hasWrittenTest: boolean;
  writtenTestDetails?: string;
  hasGroupDiscussion: boolean;
  gdDetails?: string;
  technicalRounds: number;
  hrRounds: number;
  additionalDetails?: string;
}

export interface JobPosting {
  id: string;
  type: PostingType;
  title: string;
  companyId: string;
  companyName: string;
  academicYear: string;
  
  // Role Details
  roleName: string;
  location: string;
  workMode: WorkMode;
  duration?: string; // For internships
  stipend?: string;
  ctc?: string;
  bondDetails?: string;
  roleDescription: string;
  
  // Eligibility
  eligibility: EligibilityCriteria;
  
  // Selection Process
  selectionProcess: SelectionProcess;
  
  // Timeline
  applicationStartDate: string;
  applicationEndDate: string;
  
  // Status
  status: PostingStatus;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  publishedAt?: string;
  closedAt?: string;
}

// Mock Postings Data
export const mockPostings: JobPosting[] = [
  {
    id: 'post-001',
    type: 'job',
    title: 'Software Engineer - Campus Hiring 2026',
    companyId: 'comp-001',
    companyName: 'TechCorp Solutions',
    academicYear: '2025-26',
    roleName: 'Software Engineer',
    location: 'Bangalore, Karnataka',
    workMode: 'hybrid',
    ctc: '8-12 LPA',
    bondDetails: '2 years service agreement',
    roleDescription: 'Join our engineering team to build scalable web applications. Work with modern technologies like React, Node.js, and AWS.',
    eligibility: {
      branches: ['Computer Science', 'Information Technology', 'Electronics'],
      batches: ['2025'],
      minCgpa: 7.0,
      maxBacklogs: 0,
      skillRequirements: 'Proficiency in JavaScript, React, or Node.js. Good problem-solving skills.'
    },
    selectionProcess: {
      hasWrittenTest: true,
      writtenTestDetails: 'Online coding test - 90 minutes, 3 coding problems',
      hasGroupDiscussion: false,
      technicalRounds: 2,
      hrRounds: 1,
      additionalDetails: 'Technical interviews will focus on DSA and system design basics.'
    },
    applicationStartDate: '2026-01-15',
    applicationEndDate: '2026-02-28',
    status: 'published',
    createdAt: '2026-01-10',
    updatedAt: '2026-01-15',
    createdBy: 'TPO Admin',
    publishedAt: '2026-01-15'
  },
  {
    id: 'post-002',
    type: 'internship',
    title: 'Summer Internship Program 2026',
    companyId: 'comp-002',
    companyName: 'InnovateTech Pvt Ltd',
    academicYear: '2025-26',
    roleName: 'AI/ML Intern',
    location: 'Hyderabad, Telangana',
    workMode: 'onsite',
    duration: '2 months (May - June 2026)',
    stipend: '25,000/month',
    roleDescription: 'Work on cutting-edge AI/ML projects in healthcare. Assist in developing and training machine learning models.',
    eligibility: {
      branches: ['Computer Science', 'Information Technology', 'Artificial Intelligence'],
      batches: ['2026'],
      minCgpa: 7.5,
      maxBacklogs: 0,
      skillRequirements: 'Basic knowledge of Python, ML fundamentals. Familiarity with TensorFlow or PyTorch is a plus.'
    },
    selectionProcess: {
      hasWrittenTest: true,
      writtenTestDetails: 'Online aptitude and ML basics test - 60 minutes',
      hasGroupDiscussion: true,
      gdDetails: 'Group discussion on AI ethics and applications',
      technicalRounds: 1,
      hrRounds: 1
    },
    applicationStartDate: '2026-01-20',
    applicationEndDate: '2026-03-15',
    status: 'published',
    createdAt: '2026-01-10',
    updatedAt: '2026-01-20',
    createdBy: 'TPO Admin',
    publishedAt: '2026-01-20'
  },
  {
    id: 'post-003',
    type: 'stipend_internship',
    title: 'Final Year Project Internship',
    companyId: 'comp-006',
    companyName: 'DataDriven Analytics',
    academicYear: '2025-26',
    roleName: 'Data Science Intern',
    location: 'Pune, Maharashtra',
    workMode: 'hybrid',
    duration: '6 months (Feb - July 2026)',
    stipend: '30,000/month + PPO opportunity',
    roleDescription: 'Work on real-world data analytics projects. Opportunity for Pre-Placement Offer based on performance.',
    eligibility: {
      branches: ['Computer Science', 'Information Technology', 'Data Science'],
      batches: ['2025'],
      minCgpa: 8.0,
      maxBacklogs: 0,
      skillRequirements: 'Strong in Python, SQL, and statistics. Experience with data visualization tools.'
    },
    selectionProcess: {
      hasWrittenTest: false,
      hasGroupDiscussion: false,
      technicalRounds: 2,
      hrRounds: 1,
      additionalDetails: 'Portfolio review and live coding session included.'
    },
    applicationStartDate: '2026-01-01',
    applicationEndDate: '2026-01-25',
    status: 'closed',
    createdAt: '2025-12-15',
    updatedAt: '2026-01-26',
    createdBy: 'TPO Admin',
    publishedAt: '2026-01-01',
    closedAt: '2026-01-26'
  },
  {
    id: 'post-004',
    type: 'job',
    title: 'Business Analyst - Campus Recruitment',
    companyId: 'comp-003',
    companyName: 'Global Finance Corp',
    academicYear: '2025-26',
    roleName: 'Business Analyst',
    location: 'Mumbai, Maharashtra',
    workMode: 'onsite',
    ctc: '12-18 LPA',
    bondDetails: 'No bond',
    roleDescription: 'Analyze business requirements and translate them into technical solutions. Work with cross-functional teams on strategic initiatives.',
    eligibility: {
      branches: ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical'],
      batches: ['2025'],
      minCgpa: 7.5,
      maxBacklogs: 0,
      skillRequirements: 'Strong analytical skills, proficiency in Excel, SQL. Communication skills essential.'
    },
    selectionProcess: {
      hasWrittenTest: true,
      writtenTestDetails: 'Aptitude test covering quantitative, verbal, and logical reasoning - 60 minutes',
      hasGroupDiscussion: true,
      gdDetails: 'Case study based group discussion',
      technicalRounds: 1,
      hrRounds: 2,
      additionalDetails: 'Final round with senior management.'
    },
    applicationStartDate: '2026-02-01',
    applicationEndDate: '2026-02-28',
    status: 'draft',
    createdAt: '2026-01-20',
    updatedAt: '2026-01-20',
    createdBy: 'TPO Admin'
  },
  {
    id: 'post-005',
    type: 'internship',
    title: 'Winter Internship - Cloud Engineering',
    companyId: 'comp-001',
    companyName: 'TechCorp Solutions',
    academicYear: '2025-26',
    roleName: 'Cloud Engineering Intern',
    location: 'Remote',
    workMode: 'remote',
    duration: '1 month (March 2026)',
    stipend: '20,000/month',
    roleDescription: 'Learn and work on AWS/Azure cloud infrastructure. Assist in deployment automation and monitoring.',
    eligibility: {
      branches: ['Computer Science', 'Information Technology'],
      batches: ['2026', '2027'],
      minCgpa: 6.5,
      maxBacklogs: 1,
      skillRequirements: 'Basic understanding of cloud concepts. Linux knowledge is a plus.'
    },
    selectionProcess: {
      hasWrittenTest: false,
      hasGroupDiscussion: false,
      technicalRounds: 1,
      hrRounds: 0,
      additionalDetails: 'Simple technical discussion based on resume.'
    },
    applicationStartDate: '2026-01-25',
    applicationEndDate: '2026-02-15',
    status: 'published',
    createdAt: '2026-01-20',
    updatedAt: '2026-01-25',
    createdBy: 'TPO Admin',
    publishedAt: '2026-01-25'
  }
];

// Helper Functions
export const getPostingById = (id: string): JobPosting | undefined => {
  return mockPostings.find(p => p.id === id);
};

export const getPostingsByStatus = (status: PostingStatus): JobPosting[] => {
  return mockPostings.filter(p => p.status === status);
};

export const getPostingsByCompany = (companyId: string): JobPosting[] => {
  return mockPostings.filter(p => p.companyId === companyId);
};

export const getPostingsByType = (type: PostingType): JobPosting[] => {
  return mockPostings.filter(p => p.type === type);
};

export const getPostingStats = () => {
  const total = mockPostings.length;
  const draft = mockPostings.filter(p => p.status === 'draft').length;
  const published = mockPostings.filter(p => p.status === 'published').length;
  const closed = mockPostings.filter(p => p.status === 'closed').length;
  const jobs = mockPostings.filter(p => p.type === 'job').length;
  const internships = mockPostings.filter(p => p.type === 'internship' || p.type === 'stipend_internship').length;
  
  return { total, draft, published, closed, jobs, internships };
};

export const getEligiblePostingsForStudent = (
  studentBranch: string,
  studentBatch: string,
  studentCgpa: number,
  studentBacklogs: number
): JobPosting[] => {
  return mockPostings.filter(posting => {
    if (posting.status !== 'published') return false;
    
    const { eligibility } = posting;
    const branchMatch = eligibility.branches.includes(studentBranch);
    const batchMatch = eligibility.batches.includes(studentBatch);
    const cgpaMatch = studentCgpa >= eligibility.minCgpa;
    const backlogMatch = studentBacklogs <= eligibility.maxBacklogs;
    
    return branchMatch && batchMatch && cgpaMatch && backlogMatch;
  });
};

export const getPostingTypeLabel = (type: PostingType): string => {
  switch (type) {
    case 'job': return 'Placement (Job)';
    case 'internship': return 'Internship';
    case 'stipend_internship': return 'Stipend-Based Internship';
  }
};

export const getWorkModeLabel = (mode: WorkMode): string => {
  switch (mode) {
    case 'onsite': return 'On-site';
    case 'remote': return 'Remote';
    case 'hybrid': return 'Hybrid';
  }
};

export const branches = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Electrical',
  'Mechanical',
  'Civil',
  'Chemical',
  'Artificial Intelligence',
  'Data Science'
];

export const batches = ['2025', '2026', '2027', '2028'];
