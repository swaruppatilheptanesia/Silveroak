import type { 
  StudentMaster, 
  AcademicProfile, 
  SkillsProfile, 
  Project, 
  Resume, 
  InterestRegistration,
  EligibilityCheck,
  CareerReadinessItem,
  CurrentEmployment
} from '@/types/student';

export const mockStudent: StudentMaster = {
  student_id: 'STU2024001',
  full_name: 'Rahul Sharma',
  roll_number: '21BCE1234',
  email: 'rahul.sharma@university.edu',
  mobile: '+91 98765 43210',
  institute_name: 'Gujarat Technological University',
  course_name: 'B.Tech',
  department: 'Computer Science & Engineering',
  batch_year: '2021-2025',
  date_of_birth: '2003-05-15',
  profile_photo_url: '',
  linkedin_url: 'https://linkedin.com/in/rahulsharma',
  gender: 'male',
  category: 'General',
  permanent_address: '123, Green Valley Apartments, Sector 21, Noida, UP - 201301',
  current_address: 'Room 302, Block A, University Hostel, Campus Road',
  parent_contact: '+91 98765 43211',
  education_medium: 'CBSE',
  profile_completion_percentage: 75,
  profile_blocked: false,
  profile_block_reason: null,
  policy_accepted: true,
  policy_accepted_at: '2024-08-15T10:30:00Z',
  created_at: '2024-07-01T09:00:00Z',
  updated_at: '2024-12-01T14:20:00Z',
};

export const mockAcademicProfile: AcademicProfile = {
  student_id: 'STU2024001',
  cgpa: 8.65,
  tenth_percentage: 92.4,
  twelfth_percentage: 88.6,
  diploma_percentage: undefined,
  backlog_count: 0,
  backlog_history: [],
  semester: 7,
  year: 4,
  certifications: [
    {
      id: 'cert1',
      name: 'AWS Cloud Practitioner',
      issuer: 'Amazon Web Services',
      issue_date: '2024-03-15',
      credential_url: 'https://aws.amazon.com/verify/cert123',
    },
    {
      id: 'cert2',
      name: 'Google Data Analytics',
      issuer: 'Google',
      issue_date: '2024-06-20',
    },
  ],
};

export const mockSkillsProfile: SkillsProfile = {
  student_id: 'STU2024001',
  skill_tags: ['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'AWS', 'Docker', 'Git'],
  domain_interests: ['Full Stack Development', 'Cloud Computing', 'Machine Learning'],
  preferred_locations: ['Bangalore', 'Hyderabad', 'Pune', 'Remote'],
  work_preference: 'both',
};

export const mockProjects: Project[] = [
  {
    id: 'proj1',
    student_id: 'STU2024001',
    title: 'E-Commerce Platform',
    description: 'Built a full-stack e-commerce platform with React, Node.js, and PostgreSQL. Implemented features like user authentication, product catalog, shopping cart, and payment integration.',
    technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe', 'Docker'],
    start_date: '2024-01-01',
    end_date: '2024-04-30',
    github_url: 'https://github.com/rahul/ecommerce',
  },
  {
    id: 'proj2',
    student_id: 'STU2024001',
    title: 'ML-Based Resume Parser',
    description: 'Developed an ML model to parse and extract structured data from resumes using NLP techniques. Achieved 94% accuracy on test dataset.',
    technologies: ['Python', 'TensorFlow', 'spaCy', 'FastAPI'],
    start_date: '2024-05-01',
    end_date: '2024-07-15',
    github_url: 'https://github.com/rahul/resume-parser',
  },
];

export const mockResumes: Resume[] = [
  {
    resume_id: 'res1',
    student_id: 'STU2024001',
    resume_name: 'Software Developer Resume',
    file_url: '/resumes/rahul_sde.pdf',
    ai_score: 85,
    is_default: true,
    uploaded_at: '2024-11-15T08:00:00Z',
    file_size: 245678,
  },
  {
    resume_id: 'res2',
    student_id: 'STU2024001',
    resume_name: 'Data Science Resume',
    file_url: '/resumes/rahul_ds.pdf',
    ai_score: 78,
    is_default: false,
    uploaded_at: '2024-11-20T10:30:00Z',
    file_size: 198432,
  },
];

export const mockInterests: InterestRegistration[] = [
  {
    student_id: 'STU2024001',
    interest_type: 'placement',
    academic_year: '2024-25',
    registered_at: '2024-08-01T09:00:00Z',
  },
  {
    student_id: 'STU2024001',
    interest_type: 'summer_internship',
    academic_year: '2024-25',
    registered_at: '2024-08-01T09:05:00Z',
  },
];

export const mockEligibilityChecks: EligibilityCheck[] = [
  {
    rule_id: 'rule1',
    rule_name: 'TCS Digital',
    status: 'eligible',
    reason: 'Meets all criteria: CGPA 8.65 ≥ 7.5, No backlogs, CSE branch eligible',
  },
  {
    rule_id: 'rule2',
    rule_name: 'Google STEP',
    status: 'eligible',
    reason: 'Meets all criteria: CGPA 8.65 ≥ 8.0, No backlogs',
  },
  {
    rule_id: 'rule3',
    rule_name: 'Microsoft FTE',
    status: 'conditional',
    reason: 'AWS certification required - certification verified',
  },
  {
    rule_id: 'rule4',
    rule_name: 'Amazon SDE',
    status: 'eligible',
    reason: 'Meets all criteria: CGPA 8.65 ≥ 7.0, No backlogs',
  },
];

export const mockReadinessChecklist: CareerReadinessItem[] = [
  {
    id: 'ready1',
    title: 'Complete Profile',
    description: 'Fill in all required profile information',
    completed: true,
    completed_at: '2024-08-10T10:00:00Z',
  },
  {
    id: 'ready2',
    title: 'Upload Resume',
    description: 'Upload at least one professional resume',
    completed: true,
    completed_at: '2024-11-15T08:00:00Z',
  },
  {
    id: 'ready3',
    title: 'Accept Placement Policy',
    description: 'Read and accept the institute placement policy',
    completed: true,
    completed_at: '2024-08-15T10:30:00Z',
  },
  {
    id: 'ready4',
    title: 'Resume Workshop',
    description: 'Attend the resume building workshop',
    completed: true,
    completed_at: '2024-09-20T15:00:00Z',
  },
  {
    id: 'ready5',
    title: 'Mock Interview',
    description: 'Complete at least one mock interview session',
    completed: false,
  },
  {
    id: 'ready6',
    title: 'Aptitude Training',
    description: 'Complete aptitude training modules',
    completed: false,
  },
];

export const mockCurrentEmployment: CurrentEmployment = {
  student_id: 'STU2024001',
  is_currently_working: false,
  employment_type: undefined,
  company_name: undefined,
  designation: undefined,
  offer_letter_url: undefined,
  visiting_card_url: undefined,
  package_lpa: undefined,
  work_profile_description: undefined,
  joining_date: undefined,
};

export const departments = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
];

export const instituteOptions = [
  'Gujarat Technological University',
  'Indian Institute of Technology',
  'National Institute of Technology',
  'Birla Institute of Technology',
  'VIT University',
  'SRM University',
  'BITS Pilani',
];

export const courseOptions = [
  'B.Tech',
  'B.E.',
  'M.Tech',
  'M.E.',
  'MCA',
  'BCA',
  'MBA',
  'Diploma',
];

export const skillOptions = [
  'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js', 'Node.js',
  'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
  'Git', 'CI/CD', 'Agile', 'Scrum',
];

export const domainOptions = [
  'Full Stack Development',
  'Frontend Development',
  'Backend Development',
  'Mobile Development',
  'Cloud Computing',
  'DevOps',
  'Machine Learning',
  'Data Science',
  'Cybersecurity',
  'Blockchain',
  'IoT',
  'Game Development',
];

export const locationOptions = [
  'Ahmedabad',
  'Bangalore',
  'Delhi',
  'Delhi NCR',
  'Gurugram',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Mumbai',
  'Kolkata',
  'Noida',
  'Surat',
  'Vadodara',
  'Remote',
];
