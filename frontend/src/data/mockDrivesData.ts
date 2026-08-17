import { PlacementEvent } from '@/types/event';

export const mockEvents: PlacementEvent[] = [
  {
    id: 'evt-001',
    type: 'campus_drive',
    title: 'TechCorp Solutions – Campus Placement Drive 2026',
    companyId: 'comp-001',
    companyName: 'TechCorp Solutions',
    opportunityId: 'post-001',
    opportunityTitle: 'Software Engineer - Campus Hiring 2026',
    date: '2026-02-20',
    startTime: '09:00',
    endTime: '17:00',
    venue: 'Main Auditorium, Block A',
    instructions: 'Carry 2 copies of updated resume, college ID card, and all original mark sheets. Formal dress code is mandatory.',
    dressCode: 'Formal (shirt, trousers, formal shoes)',
    documentsRequired: ['Resume (2 copies)', 'College ID', 'Original Mark Sheets', 'Passport-size Photo'],
    reportingTime: '08:30 AM',
    panels: [
      {
        id: 'panel-001',
        panelName: 'Panel A - Technical',
        room: 'Room 101, Block A',
        recruiters: ['Priya Sharma', 'Rahul Verma'],
        startTime: '10:00',
        endTime: '13:00',
      },
      {
        id: 'panel-002',
        panelName: 'Panel B - Technical',
        room: 'Room 102, Block A',
        recruiters: ['Rahul Verma'],
        startTime: '10:00',
        endTime: '13:00',
      },
      {
        id: 'panel-003',
        panelName: 'HR Round',
        room: 'Conference Hall, Block A',
        recruiters: ['Priya Sharma'],
        startTime: '14:00',
        endTime: '17:00',
      },
    ],
    assignedStudents: [
      { studentId: 'stu-001', studentName: 'Rahul Sharma', rollNumber: '21BCE1234', branch: 'Computer Science', panelId: 'panel-001', slotTime: '10:00', attendance: 'present', attendanceMarkedAt: '2026-02-20T09:55:00', attendanceMarkedBy: 'Prof. Ramesh Kumar' },
      { studentId: 'stu-002', studentName: 'Priya Patel', rollNumber: '21BCE1235', branch: 'Computer Science', panelId: 'panel-001', slotTime: '10:30', attendance: 'present', attendanceMarkedAt: '2026-02-20T10:25:00', attendanceMarkedBy: 'Prof. Ramesh Kumar' },
      { studentId: 'stu-003', studentName: 'Amit Kumar', rollNumber: '21BCE1236', branch: 'Information Technology', panelId: 'panel-002', slotTime: '10:00', attendance: 'absent' },
      { studentId: 'stu-004', studentName: 'Sneha Reddy', rollNumber: '21BCE1237', branch: 'Computer Science', panelId: 'panel-002', slotTime: '10:30', attendance: 'late', attendanceMarkedAt: '2026-02-20T10:45:00', attendanceMarkedBy: 'Prof. Ramesh Kumar' },
      { studentId: 'stu-005', studentName: 'Vikram Singh', rollNumber: '21BCE1238', branch: 'Electronics', panelId: 'panel-001', slotTime: '11:00' },
      { studentId: 'stu-006', studentName: 'Ananya Gupta', rollNumber: '21BIT2001', branch: 'Information Technology', panelId: 'panel-002', slotTime: '11:00' },
    ],
    eligibleBranches: ['Computer Science', 'Information Technology', 'Electronics'],
    facultyCoordinators: ['Prof. Ramesh Kumar', 'Prof. Sunita Verma'],
    status: 'published',
    createdAt: '2026-02-01',
    updatedAt: '2026-02-10',
    createdBy: 'Dr. Priya Mehta',
    publishedAt: '2026-02-10',
  },
  {
    id: 'evt-002',
    type: 'ppt',
    title: 'InnovateTech – Pre-Placement Talk',
    companyId: 'comp-002',
    companyName: 'InnovateTech Pvt Ltd',
    opportunityId: 'post-002',
    opportunityTitle: 'Summer Internship Program 2026',
    date: '2026-02-15',
    startTime: '14:00',
    endTime: '15:30',
    venue: 'Seminar Hall, Block B',
    instructions: 'Open to all eligible students. Carry college ID card. Casual attire is acceptable.',
    reportingTime: '01:45 PM',
    panels: [],
    assignedStudents: [
      { studentId: 'stu-001', studentName: 'Rahul Sharma', rollNumber: '21BCE1234', branch: 'Computer Science', attendance: 'present', attendanceMarkedAt: '2026-02-15T14:00:00', attendanceMarkedBy: 'Prof. Ramesh Kumar' },
      { studentId: 'stu-002', studentName: 'Priya Patel', rollNumber: '21BCE1235', branch: 'Computer Science', attendance: 'present', attendanceMarkedAt: '2026-02-15T14:02:00', attendanceMarkedBy: 'Prof. Ramesh Kumar' },
      { studentId: 'stu-006', studentName: 'Ananya Gupta', rollNumber: '21BIT2001', branch: 'Information Technology', attendance: 'present', attendanceMarkedAt: '2026-02-15T14:05:00', attendanceMarkedBy: 'Prof. Ramesh Kumar' },
    ],
    eligibleBranches: ['Computer Science', 'Information Technology', 'Artificial Intelligence'],
    facultyCoordinators: ['Prof. Ramesh Kumar'],
    status: 'completed',
    createdAt: '2026-02-05',
    updatedAt: '2026-02-15',
    createdBy: 'Dr. Priya Mehta',
    publishedAt: '2026-02-07',
    completedAt: '2026-02-15',
  },
  {
    id: 'evt-003',
    type: 'test_assessment',
    title: 'Global Finance Corp – Aptitude Test',
    companyId: 'comp-003',
    companyName: 'Global Finance Corp',
    opportunityId: 'post-004',
    opportunityTitle: 'Business Analyst - Campus Recruitment',
    date: '2026-03-05',
    startTime: '10:00',
    endTime: '12:00',
    venue: 'Computer Lab 1 & 2, Block C',
    instructions: 'Online test. Bring your laptop fully charged. Stable internet will be provided. No electronic devices other than laptop.',
    documentsRequired: ['College ID', 'Admit Card (to be emailed)'],
    reportingTime: '09:30 AM',
    panels: [],
    assignedStudents: [
      { studentId: 'stu-001', studentName: 'Rahul Sharma', rollNumber: '21BCE1234', branch: 'Computer Science' },
      { studentId: 'stu-004', studentName: 'Sneha Reddy', rollNumber: '21BCE1237', branch: 'Computer Science' },
      { studentId: 'stu-005', studentName: 'Vikram Singh', rollNumber: '21BCE1238', branch: 'Electronics' },
    ],
    eligibleBranches: ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical'],
    facultyCoordinators: ['Prof. Sunita Verma'],
    status: 'draft',
    createdAt: '2026-02-08',
    updatedAt: '2026-02-08',
    createdBy: 'Dr. Priya Mehta',
  },
  {
    id: 'evt-004',
    type: 'internship_drive',
    title: 'DataDriven Analytics – Internship Drive',
    companyId: 'comp-006',
    companyName: 'DataDriven Analytics',
    opportunityId: 'post-003',
    opportunityTitle: 'Final Year Project Internship',
    date: '2026-02-25',
    startTime: '09:30',
    endTime: '16:00',
    venue: 'Placement Cell Office, Admin Block',
    instructions: 'Carry resume, laptop with Python environment set up, and college ID. Portfolio review will be conducted.',
    dressCode: 'Smart Casual',
    documentsRequired: ['Resume', 'College ID', 'Laptop with Python'],
    reportingTime: '09:00 AM',
    panels: [
      {
        id: 'panel-004',
        panelName: 'Technical + Portfolio Review',
        room: 'Meeting Room 1, Admin Block',
        recruiters: ['Amit Kumar'],
        startTime: '10:00',
        endTime: '14:00',
      },
    ],
    assignedStudents: [
      { studentId: 'stu-002', studentName: 'Priya Patel', rollNumber: '21BCE1235', branch: 'Computer Science', panelId: 'panel-004', slotTime: '10:00' },
      { studentId: 'stu-004', studentName: 'Sneha Reddy', rollNumber: '21BCE1237', branch: 'Computer Science', panelId: 'panel-004', slotTime: '10:45' },
    ],
    eligibleBranches: ['Computer Science', 'Information Technology', 'Data Science'],
    facultyCoordinators: ['Prof. Ramesh Kumar'],
    status: 'published',
    createdAt: '2026-02-05',
    updatedAt: '2026-02-12',
    createdBy: 'Dr. Priya Mehta',
    publishedAt: '2026-02-12',
  },
  {
    id: 'evt-005',
    type: 'interview_round',
    title: 'TechCorp Solutions – HR Interview Round',
    companyId: 'comp-001',
    companyName: 'TechCorp Solutions',
    opportunityId: 'post-001',
    opportunityTitle: 'Software Engineer - Campus Hiring 2026',
    date: '2026-02-22',
    startTime: '10:00',
    endTime: '15:00',
    venue: 'Conference Hall, Block A',
    instructions: 'Only shortlisted students from technical round. Carry original documents for verification.',
    dressCode: 'Formal',
    reportingTime: '09:45 AM',
    panels: [
      {
        id: 'panel-005',
        panelName: 'HR Panel',
        room: 'Conference Hall, Block A',
        recruiters: ['Priya Sharma'],
        startTime: '10:00',
        endTime: '15:00',
      },
    ],
    assignedStudents: [
      { studentId: 'stu-001', studentName: 'Rahul Sharma', rollNumber: '21BCE1234', branch: 'Computer Science', panelId: 'panel-005', slotTime: '10:00' },
      { studentId: 'stu-002', studentName: 'Priya Patel', rollNumber: '21BCE1235', branch: 'Computer Science', panelId: 'panel-005', slotTime: '10:30' },
    ],
    eligibleBranches: ['Computer Science', 'Information Technology'],
    facultyCoordinators: ['Prof. Ramesh Kumar'],
    status: 'published',
    createdAt: '2026-02-15',
    updatedAt: '2026-02-18',
    createdBy: 'Dr. Priya Mehta',
    publishedAt: '2026-02-18',
  },
];

// Helper functions
export const getEventById = (id: string) => mockEvents.find(e => e.id === id);

export const getEventsByStatus = (status: PlacementEvent['status']) =>
  mockEvents.filter(e => e.status === status);

export const getEventsByCompany = (companyId: string) =>
  mockEvents.filter(e => e.companyId === companyId);

export const getEventsForStudent = (studentId: string) =>
  mockEvents.filter(e =>
    e.status !== 'draft' &&
    e.assignedStudents.some(s => s.studentId === studentId)
  );

export const getEventsForRecruiter = (companyId: string) =>
  mockEvents.filter(e =>
    e.companyId === companyId && (e.status === 'published' || e.status === 'ongoing' || e.status === 'completed')
  );

export const getEventStats = () => {
  const total = mockEvents.length;
  const draft = mockEvents.filter(e => e.status === 'draft').length;
  const published = mockEvents.filter(e => e.status === 'published').length;
  const completed = mockEvents.filter(e => e.status === 'completed').length;
  const upcoming = mockEvents.filter(e => e.status === 'published' && new Date(e.date) >= new Date()).length;
  return { total, draft, published, completed, upcoming };
};
