// Company and Recruiter Types
export interface Company {
  id: string;
  name: string;
  industry: string;
  address: string;
  website: string;
  description: string;
  status: 'active' | 'inactive';
  classification: 'preferred' | 'blacklisted' | 'normal';
  internalRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recruiter {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  companyId: string;
  companyName: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementRecord {
  id: string;
  companyId: string;
visitorType: 'campus_visit' | 'internship' | 'placement' | 'guest_lecture' | 'workshop';
  academicYear: string;
  date: string;
  remarks: string;
  studentsHired?: number;
  packagesOffered?: string;
}

// Mock Companies
export const mockCompanies: Company[] = [
  {
    id: 'comp-001',
    name: 'TechCorp Solutions',
    industry: 'Information Technology',
    address: '123 Tech Park, Bangalore, Karnataka 560001',
    website: 'https://techcorp.com',
    description: 'Leading IT services and consulting company specializing in digital transformation.',
    status: 'active',
    classification: 'preferred',
    internalRemarks: 'Excellent partner, consistent hirer since 2018',
    createdAt: '2020-01-15',
    updatedAt: '2024-01-10'
  },
  {
    id: 'comp-002',
    name: 'InnovateTech Pvt Ltd',
    industry: 'Software Development',
    address: '456 Innovation Hub, Hyderabad, Telangana 500032',
    website: 'https://innovatetech.io',
    description: 'Product-based startup focused on AI/ML solutions for healthcare.',
    status: 'active',
    classification: 'normal',
    createdAt: '2021-06-20',
    updatedAt: '2024-02-15'
  },
  {
    id: 'comp-003',
    name: 'Global Finance Corp',
    industry: 'Banking & Finance',
    address: '789 Financial District, Mumbai, Maharashtra 400001',
    website: 'https://globalfinance.com',
    description: 'Multinational banking corporation with presence in 50+ countries.',
    status: 'active',
    classification: 'preferred',
    internalRemarks: 'Top recruiter for MBA students',
    createdAt: '2019-03-10',
    updatedAt: '2024-01-25'
  },
  {
    id: 'comp-004',
    name: 'QuickHire Solutions',
    industry: 'Staffing & Recruitment',
    address: '321 Business Center, Delhi 110001',
    website: 'https://quickhire.in',
    description: 'Staffing agency providing contract-based hiring solutions.',
    status: 'inactive',
    classification: 'blacklisted',
    internalRemarks: 'Multiple complaints about delayed payments and poor working conditions',
    createdAt: '2022-01-05',
    updatedAt: '2023-08-20'
  },
  {
    id: 'comp-005',
    name: 'GreenEnergy Systems',
    industry: 'Renewable Energy',
    address: '555 Eco Park, Chennai, Tamil Nadu 600001',
    website: 'https://greenenergy.co.in',
    description: 'Renewable energy solutions provider for industrial and residential sectors.',
    status: 'active',
    classification: 'normal',
    createdAt: '2023-02-28',
    updatedAt: '2024-03-01'
  },
  {
    id: 'comp-006',
    name: 'DataDriven Analytics',
    industry: 'Data Science',
    address: '777 Analytics Tower, Pune, Maharashtra 411001',
    website: 'https://datadriven.ai',
    description: 'Data analytics and business intelligence consultancy.',
    status: 'active',
    classification: 'preferred',
    internalRemarks: 'Great for data science and analytics placements',
    createdAt: '2021-09-15',
    updatedAt: '2024-02-20'
  }
];

// Mock Recruiters
export const mockRecruiters: Recruiter[] = [
  {
    id: 'rec-001',
    name: 'Priya Sharma',
    email: 'priya.sharma@techcorp.com',
    phone: '+91 9876543210',
    designation: 'HR Manager',
    companyId: 'comp-001',
    companyName: 'TechCorp Solutions',
    verificationStatus: 'verified',
    createdAt: '2020-02-01',
    updatedAt: '2024-01-15'
  },
  {
    id: 'rec-002',
    name: 'Rahul Verma',
    email: 'rahul.verma@techcorp.com',
    phone: '+91 9876543211',
    designation: 'Technical Recruiter',
    companyId: 'comp-001',
    companyName: 'TechCorp Solutions',
    verificationStatus: 'verified',
    createdAt: '2021-03-15',
    updatedAt: '2024-02-01'
  },
  {
    id: 'rec-003',
    name: 'Anjali Patel',
    email: 'anjali@innovatetech.io',
    phone: '+91 9876543212',
    designation: 'Talent Acquisition Lead',
    companyId: 'comp-002',
    companyName: 'InnovateTech Pvt Ltd',
    verificationStatus: 'verified',
    createdAt: '2022-01-20',
    updatedAt: '2024-01-10'
  },
  {
    id: 'rec-004',
    name: 'Vikram Singh',
    email: 'vikram.singh@globalfinance.com',
    phone: '+91 9876543213',
    designation: 'Campus Relations Manager',
    companyId: 'comp-003',
    companyName: 'Global Finance Corp',
    verificationStatus: 'verified',
    createdAt: '2019-05-10',
    updatedAt: '2024-02-25'
  },
  {
    id: 'rec-005',
    name: 'Neha Gupta',
    email: 'neha@greenenergy.co.in',
    phone: '+91 9876543214',
    designation: 'HR Executive',
    companyId: 'comp-005',
    companyName: 'GreenEnergy Systems',
    verificationStatus: 'pending',
    verificationRemarks: 'Awaiting document verification',
    createdAt: '2024-02-28',
    updatedAt: '2024-02-28'
  },
  {
    id: 'rec-006',
    name: 'Amit Kumar',
    email: 'amit@datadriven.ai',
    phone: '+91 9876543215',
    designation: 'Senior HR Manager',
    companyId: 'comp-006',
    companyName: 'DataDriven Analytics',
    verificationStatus: 'pending',
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01'
  }
];

// Mock Engagement History
export const mockEngagements: EngagementRecord[] = [
  {
    id: 'eng-001',
    companyId: 'comp-001',
    visitorType: 'placement',
    academicYear: '2023-24',
    date: '2024-01-15',
    remarks: 'Conducted placement drive for CSE and IT branches',
    studentsHired: 25,
    packagesOffered: '8-12 LPA'
  },
  {
    id: 'eng-002',
    companyId: 'comp-001',
    visitorType: 'internship',
    academicYear: '2023-24',
    date: '2023-06-10',
    remarks: 'Summer internship program for pre-final year students',
    studentsHired: 15,
    packagesOffered: '25,000/month'
  },
  {
    id: 'eng-003',
    companyId: 'comp-001',
    visitorType: 'guest_lecture',
    academicYear: '2022-23',
    date: '2023-02-20',
    remarks: 'Technical session on Cloud Computing by CTO'
  },
  {
    id: 'eng-004',
    companyId: 'comp-002',
    visitorType: 'placement',
    academicYear: '2023-24',
    date: '2024-02-01',
    remarks: 'Off-campus drive for AI/ML roles',
    studentsHired: 8,
    packagesOffered: '10-15 LPA'
  },
  {
    id: 'eng-005',
    companyId: 'comp-003',
    visitorType: 'placement',
    academicYear: '2023-24',
    date: '2024-01-20',
    remarks: 'Campus recruitment for analyst roles',
    studentsHired: 12,
    packagesOffered: '12-18 LPA'
  },
  {
    id: 'eng-006',
    companyId: 'comp-003',
    visitorType: 'workshop',
    academicYear: '2023-24',
    date: '2023-09-15',
    remarks: 'Financial modeling workshop for MBA students'
  },
  {
    id: 'eng-007',
    companyId: 'comp-006',
    visitorType: 'campus_visit',
    academicYear: '2023-24',
    date: '2023-11-10',
    remarks: 'Initial campus visit and MOU discussion'
  },
  {
    id: 'eng-008',
    companyId: 'comp-006',
    visitorType: 'internship',
    academicYear: '2023-24',
    date: '2024-01-05',
    remarks: 'Data science internship program',
    studentsHired: 10,
    packagesOffered: '30,000/month'
  }
];

// Helper functions
export const getCompanyById = (id: string): Company | undefined => {
  return mockCompanies.find(c => c.id === id);
};

export const getRecruitersByCompany = (companyId: string): Recruiter[] => {
  return mockRecruiters.filter(r => r.companyId === companyId);
};

export const getEngagementsByCompany = (companyId: string): EngagementRecord[] => {
  return mockEngagements.filter(e => e.companyId === companyId).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const getCompanyStats = () => {
  const total = mockCompanies.length;
  const active = mockCompanies.filter(c => c.status === 'active').length;
  const preferred = mockCompanies.filter(c => c.classification === 'preferred').length;
  const blacklisted = mockCompanies.filter(c => c.classification === 'blacklisted').length;
  
  return { total, active, preferred, blacklisted };
};

export const getRecruiterStats = () => {
  const total = mockRecruiters.length;
  const verified = mockRecruiters.filter(r => r.verificationStatus === 'verified').length;
  const pending = mockRecruiters.filter(r => r.verificationStatus === 'pending').length;
  
  return { total, verified, pending };
};
