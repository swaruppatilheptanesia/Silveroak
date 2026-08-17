// Mock data for Module 12: Security, Roles & Access Control

export type SystemRole = 'student' | 'recruiter' | 'faculty_coordinator' | 'tpo_employee' | 'tpo_admin' | 'management' | 'super_admin';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  department: string | null;
  status: 'active' | 'inactive';
  lastLogin: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: SystemRole;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'login' | 'logout';
  module: string;
  description: string;
  ipAddress: string;
}

export const SYSTEM_ROLE_CONFIG: Record<SystemRole, { label: string; color: string }> = {
  student: { label: 'Student', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
  recruiter: { label: 'Recruiter', color: 'text-orange-600 bg-orange-500/10 border-orange-500/20' },
  faculty_coordinator: { label: 'Faculty Coordinator', color: 'text-purple-600 bg-purple-500/10 border-purple-500/20' },
  tpo_employee: { label: 'TPO Employee', color: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20' },
  tpo_admin: { label: 'TPO Admin', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  management: { label: 'Management', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
  super_admin: { label: 'Super Admin', color: 'text-red-600 bg-red-500/10 border-red-500/20' },
};

export const PERMISSION_MATRIX: { area: string; student: string[]; recruiter: string[]; faculty_coordinator: string[]; tpo_employee: string[]; tpo_admin: string[]; management: string[]; super_admin: string[] }[] = [
  { area: 'Student Profile', student: ['view', 'edit'], recruiter: [], faculty_coordinator: ['view'], tpo_employee: ['view'], tpo_admin: ['view', 'edit'], management: [], super_admin: ['view', 'edit'] },
  { area: 'Applications', student: ['view', 'create'], recruiter: ['view'], faculty_coordinator: ['view'], tpo_employee: ['view'], tpo_admin: ['view', 'edit', 'approve'], management: [], super_admin: ['view', 'edit', 'approve'] },
  { area: 'Postings', student: ['view'], recruiter: ['view'], faculty_coordinator: ['view'], tpo_employee: ['view', 'create'], tpo_admin: ['view', 'create', 'edit', 'approve'], management: [], super_admin: ['view', 'create', 'edit', 'approve'] },
  { area: 'Offers & Joining', student: ['view'], recruiter: ['view'], faculty_coordinator: ['view'], tpo_employee: ['view'], tpo_admin: ['view', 'create', 'edit'], management: ['view'], super_admin: ['view', 'create', 'edit'] },
  { area: 'NOC Management', student: ['view', 'create'], recruiter: [], faculty_coordinator: ['view', 'approve'], tpo_employee: ['view'], tpo_admin: ['view', 'approve'], management: [], super_admin: ['view', 'approve'] },
  { area: 'Drives & Events', student: ['view'], recruiter: ['view'], faculty_coordinator: ['view'], tpo_employee: ['view', 'create'], tpo_admin: ['view', 'create', 'edit'], management: [], super_admin: ['view', 'create', 'edit'] },
  { area: 'Internships', student: ['view'], recruiter: ['view'], faculty_coordinator: ['view'], tpo_employee: ['view'], tpo_admin: ['view', 'create', 'edit'], management: ['view'], super_admin: ['view', 'create', 'edit'] },
  { area: 'Reports & Analytics', student: [], recruiter: [], faculty_coordinator: ['view'], tpo_employee: ['view'], tpo_admin: ['view', 'export'], management: ['view'], super_admin: ['view', 'export'] },
  { area: 'Company Management', student: [], recruiter: ['view'], faculty_coordinator: ['view'], tpo_employee: ['view'], tpo_admin: ['view', 'create', 'edit'], management: [], super_admin: ['view', 'create', 'edit'] },
  { area: 'User Management', student: [], recruiter: [], faculty_coordinator: [], tpo_employee: [], tpo_admin: [], management: [], super_admin: ['view', 'create', 'edit'] },
  { area: 'Audit Logs', student: [], recruiter: [], faculty_coordinator: [], tpo_employee: [], tpo_admin: ['view'], management: [], super_admin: ['view'] },
  { area: 'Policies', student: ['view'], recruiter: [], faculty_coordinator: ['view'], tpo_employee: ['view'], tpo_admin: ['view', 'create', 'edit'], management: ['view'], super_admin: ['view', 'create', 'edit'] },
];

export const mockSystemUsers: SystemUser[] = [
  { id: 'USR001', name: 'Rahul Sharma', email: 'rahul.sharma@sou.edu.in', role: 'student', department: 'Computer Science', status: 'active', lastLogin: '2025-01-15T10:30:00', createdAt: '2024-07-01' },
  { id: 'USR002', name: 'Priya Patel', email: 'priya.patel@sou.edu.in', role: 'student', department: 'Information Technology', status: 'active', lastLogin: '2025-01-15T09:15:00', createdAt: '2024-07-01' },
  { id: 'USR003', name: 'Amit Kumar', email: 'amit.kumar@sou.edu.in', role: 'student', department: 'Electronics', status: 'inactive', lastLogin: '2024-12-20T14:00:00', createdAt: '2024-07-01' },
  { id: 'USR004', name: 'Dr. Priya Mehta', email: 'priya.mehta@sou.edu.in', role: 'tpo_admin', department: null, status: 'active', lastLogin: '2025-01-15T08:00:00', createdAt: '2023-06-01' },
  { id: 'USR005', name: 'Sneha Reddy', email: 'sneha.reddy@sou.edu.in', role: 'tpo_employee', department: null, status: 'active', lastLogin: '2025-01-15T09:00:00', createdAt: '2024-01-15' },
  { id: 'USR006', name: 'Prof. Ramesh Kumar', email: 'ramesh.kumar@sou.edu.in', role: 'faculty_coordinator', department: 'Computer Science', status: 'active', lastLogin: '2025-01-14T16:00:00', createdAt: '2023-06-01' },
  { id: 'USR007', name: 'Prof. Anita Desai', email: 'anita.desai@sou.edu.in', role: 'faculty_coordinator', department: 'Electronics', status: 'active', lastLogin: '2025-01-13T11:30:00', createdAt: '2023-08-01' },
  { id: 'USR008', name: 'Vikram Singh', email: 'vikram@techcorp.com', role: 'recruiter', department: null, status: 'active', lastLogin: '2025-01-14T10:00:00', createdAt: '2024-09-01' },
  { id: 'USR009', name: 'Neha Gupta', email: 'neha@infosys.com', role: 'recruiter', department: null, status: 'active', lastLogin: '2025-01-12T15:30:00', createdAt: '2024-10-01' },
  { id: 'USR010', name: 'Dr. Rajesh Patel', email: 'rajesh.patel@sou.edu.in', role: 'management', department: null, status: 'active', lastLogin: '2025-01-10T10:00:00', createdAt: '2023-01-01' },
  { id: 'USR011', name: 'Admin Root', email: 'admin@sou.edu.in', role: 'super_admin', department: null, status: 'active', lastLogin: '2025-01-15T07:00:00', createdAt: '2023-01-01' },
  { id: 'USR012', name: 'Meera Joshi', email: 'meera.joshi@sou.edu.in', role: 'student', department: 'Mechanical', status: 'active', lastLogin: '2025-01-15T11:00:00', createdAt: '2024-07-01' },
  { id: 'USR013', name: 'Karan Verma', email: 'karan.verma@sou.edu.in', role: 'tpo_employee', department: null, status: 'inactive', lastLogin: '2024-11-30T09:00:00', createdAt: '2024-03-01' },
  { id: 'USR014', name: 'Prof. Sunil Rao', email: 'sunil.rao@sou.edu.in', role: 'faculty_coordinator', department: 'Mechanical', status: 'active', lastLogin: '2025-01-14T14:00:00', createdAt: '2024-01-01' },
  { id: 'USR015', name: 'Ravi Menon', email: 'ravi@wipro.com', role: 'recruiter', department: null, status: 'inactive', lastLogin: '2024-10-15T12:00:00', createdAt: '2024-06-01' },
];

export const mockAuditLogs: AuditLogEntry[] = [
  { id: 'AUD001', timestamp: '2025-01-15T10:32:00', userId: 'USR004', userName: 'Dr. Priya Mehta', userRole: 'tpo_admin', action: 'create', module: 'Postings', description: 'Created new posting: TCS Campus Drive 2025', ipAddress: '192.168.1.10' },
  { id: 'AUD002', timestamp: '2025-01-15T10:15:00', userId: 'USR001', userName: 'Rahul Sharma', userRole: 'student', action: 'update', module: 'Profile', description: 'Updated profile: Added new certification', ipAddress: '10.0.0.45' },
  { id: 'AUD003', timestamp: '2025-01-15T09:45:00', userId: 'USR004', userName: 'Dr. Priya Mehta', userRole: 'tpo_admin', action: 'status_change', module: 'Applications', description: 'Changed application status: Shortlisted → Selected for USR001', ipAddress: '192.168.1.10' },
  { id: 'AUD004', timestamp: '2025-01-15T09:30:00', userId: 'USR006', userName: 'Prof. Ramesh Kumar', userRole: 'faculty_coordinator', action: 'update', module: 'NOC', description: 'Approved NOC request NOC-2025-045', ipAddress: '192.168.2.15' },
  { id: 'AUD005', timestamp: '2025-01-15T09:00:00', userId: 'USR005', userName: 'Sneha Reddy', userRole: 'tpo_employee', action: 'login', module: 'Auth', description: 'User logged in', ipAddress: '192.168.1.22' },
  { id: 'AUD006', timestamp: '2025-01-14T17:30:00', userId: 'USR008', userName: 'Vikram Singh', userRole: 'recruiter', action: 'update', module: 'Pipeline', description: 'Moved 5 candidates to interview stage', ipAddress: '203.0.113.50' },
  { id: 'AUD007', timestamp: '2025-01-14T16:00:00', userId: 'USR004', userName: 'Dr. Priya Mehta', userRole: 'tpo_admin', action: 'create', module: 'Offers', description: 'Created offer letter for Rahul Sharma – TCS', ipAddress: '192.168.1.10' },
  { id: 'AUD008', timestamp: '2025-01-14T15:00:00', userId: 'USR011', userName: 'Admin Root', userRole: 'super_admin', action: 'status_change', module: 'Users', description: 'Deactivated user account: USR013 (Karan Verma)', ipAddress: '192.168.1.1' },
  { id: 'AUD009', timestamp: '2025-01-14T14:30:00', userId: 'USR011', userName: 'Admin Root', userRole: 'super_admin', action: 'create', module: 'Users', description: 'Created new user: Prof. Sunil Rao (Faculty Coordinator)', ipAddress: '192.168.1.1' },
  { id: 'AUD010', timestamp: '2025-01-14T12:00:00', userId: 'USR004', userName: 'Dr. Priya Mehta', userRole: 'tpo_admin', action: 'update', module: 'Drives', description: 'Updated drive schedule: Infosys Pool Campus', ipAddress: '192.168.1.10' },
  { id: 'AUD011', timestamp: '2025-01-14T11:00:00', userId: 'USR001', userName: 'Rahul Sharma', userRole: 'student', action: 'create', module: 'Applications', description: 'Applied to posting: Infosys SDE Role', ipAddress: '10.0.0.45' },
  { id: 'AUD012', timestamp: '2025-01-14T10:00:00', userId: 'USR009', userName: 'Neha Gupta', userRole: 'recruiter', action: 'login', module: 'Auth', description: 'User logged in', ipAddress: '203.0.113.75' },
  { id: 'AUD013', timestamp: '2025-01-13T16:00:00', userId: 'USR011', userName: 'Admin Root', userRole: 'super_admin', action: 'update', module: 'Users', description: 'Changed role for USR005 from Student to TPO Employee', ipAddress: '192.168.1.1' },
  { id: 'AUD014', timestamp: '2025-01-13T14:00:00', userId: 'USR004', userName: 'Dr. Priya Mehta', userRole: 'tpo_admin', action: 'delete', module: 'Postings', description: 'Cancelled posting: Outdated Internship Listing', ipAddress: '192.168.1.10' },
  { id: 'AUD015', timestamp: '2025-01-13T11:00:00', userId: 'USR010', userName: 'Dr. Rajesh Patel', userRole: 'management', action: 'login', module: 'Auth', description: 'User logged in', ipAddress: '192.168.3.5' },
];
