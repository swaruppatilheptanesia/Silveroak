// Large student pool for bulk allocation (simulates 10,000+ students)
// Uses mockAllStudents as base and generates additional records

import { mockAllStudents } from '@/data/mockAdminData';
import { departments } from '@/data/mockStudentData';

export interface StudentPoolEntry {
  studentId: string;
  studentName: string;
  rollNumber: string;
  branch: string;
  batchYear: string;
  cgpa: number;
  backlogs: number;
  profileCompletion: number;
  policyAccepted: boolean;
  verified: boolean;
}

// Convert existing admin data
const baseStudents: StudentPoolEntry[] = mockAllStudents.map(s => ({
  studentId: s.student_id,
  studentName: s.full_name,
  rollNumber: s.roll_number,
  branch: s.department,
  batchYear: s.batch_year,
  cgpa: s.academicProfile.cgpa,
  backlogs: s.academicProfile.backlog_count,
  profileCompletion: s.profile_completion_percentage,
  policyAccepted: s.policy_accepted,
  verified: s.verificationStatus === 'verified',
}));

// Generate additional students for realistic scale
const firstNames = [
  'Aarav', 'Aditi', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Manav', 'Nisha', 'Rohan', 'Sanya',
  'Tanvi', 'Vivek', 'Zara', 'Karthik', 'Meera', 'Harsh', 'Pooja', 'Ravi', 'Simran', 'Aakash',
  'Bhavna', 'Chirag', 'Deepa', 'Gaurav', 'Hema', 'Jayesh', 'Komal', 'Lakshmi', 'Mohit', 'Nandini',
  'Omkar', 'Pallavi', 'Rajesh', 'Shruti', 'Tushar', 'Uma', 'Varun', 'Yamini', 'Pranav', 'Ritika',
];
const lastNames = [
  'Agarwal', 'Bansal', 'Choudhary', 'Dubey', 'Eshwar', 'Fernandes', 'Ghosh', 'Hegde', 'Iyengar', 'Jain',
  'Khanna', 'Luthra', 'Malhotra', 'Naik', 'Oberoi', 'Pandey', 'Rathore', 'Saxena', 'Trivedi', 'Upadhyay',
  'Verma', 'Wadhwa', 'Yadav', 'Zaveri', 'Pillai', 'Nair', 'Kulkarni', 'Deshmukh', 'Patil', 'Bhatt',
];
const batches = ['2021-2025', '2022-2026', '2023-2027', '2024-2028'];
const branchKeys = departments;

function generateStudents(count: number): StudentPoolEntry[] {
  const students: StudentPoolEntry[] = [];
  for (let i = 0; i < count; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const batch = batches[i % batches.length];
    const batchPrefix = batch.slice(2, 4);
    const branch = branchKeys[i % branchKeys.length];
    const branchCode = branch.includes('Computer') ? 'BCE' : branch.includes('Information') ? 'BIT' : branch.includes('Electronics') ? 'BEC' : branch.includes('Electrical') ? 'BEE' : branch.includes('Mechanical') ? 'BME' : branch.includes('Civil') ? 'BCI' : 'BCH';
    
    students.push({
      studentId: `STU-GEN-${String(i + 1).padStart(4, '0')}`,
      studentName: `${fn} ${ln}`,
      rollNumber: `${batchPrefix}${branchCode}${String(1000 + i)}`,
      branch,
      batchYear: batch,
      cgpa: parseFloat((5.5 + Math.random() * 4.5).toFixed(2)),
      backlogs: Math.random() > 0.85 ? Math.floor(Math.random() * 3) + 1 : 0,
      profileCompletion: Math.floor(50 + Math.random() * 51),
      policyAccepted: Math.random() > 0.2,
      verified: Math.random() > 0.15,
    });
  }
  return students;
}

// Total ~200 students for demo (in prod this would be 10,000+)
const generatedStudents = generateStudents(192);
export const fullStudentPool: StudentPoolEntry[] = [...baseStudents, ...generatedStudents];

// Helper: get eligible students for a given opportunity's criteria
export function getEligibleStudentsForOpportunity(
  branches: string[],
  batchYears: string[],
  minCgpa: number,
  maxBacklogs: number
): StudentPoolEntry[] {
  // Normalize branch matching (posting uses short names, pool uses full department names)
  const normalizeBranch = (b: string) => b.toLowerCase().replace(/[&\s]+/g, '');
  const normalizedBranches = branches.map(normalizeBranch);

  return fullStudentPool.filter(s => {
    const branchMatch = normalizedBranches.some(nb => normalizeBranch(s.branch).includes(nb) || nb.includes(normalizeBranch(s.branch).slice(0, 6)));
    const batchMatch = batchYears.some(by => s.batchYear.includes(by));
    const cgpaMatch = s.cgpa >= minCgpa;
    const backlogMatch = s.backlogs <= maxBacklogs;
    const ready = s.profileCompletion >= 80 && s.policyAccepted && s.verified;
    return branchMatch && batchMatch && cgpaMatch && backlogMatch && ready;
  });
}
