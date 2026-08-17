import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMasterValues } from '@/hooks/use-master-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { 
  Download, 
  FileSpreadsheet, 
  Filter,
  Users,
  Briefcase,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  ClipboardList,
  BarChart3,
  PieChart,
  Building2,
  UserCog,
  History,
  Star,
  Ban,
  ChevronRight,
  FileText,
  Send,
  Archive,
  MapPin,
  Clock,
  FolderKanban,
  TrendingUp,
  Megaphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useActivePostingsReport,
  useCompanyMasterReport,
  useEngagementHistoryReport,
  useEligibilityReport,
  useInterestedStudentsReport,
  usePostingHistoryReport,
  usePostingSummaryReport,
  useProfileCompletionReport,
  useRegistrationSummaryReport,
  useRecruiterListReport,
} from '@/hooks/use-report-analytics-api';
import EventAttendanceReport from '@/components/reports/EventAttendanceReport';
import DriveCompletionSummary from '@/components/reports/DriveCompletionSummary';
import StudentParticipationHistory from '@/components/reports/StudentParticipationHistory';
import PendingNOCReport from '@/components/reports/PendingNOCReport';
import IssuedNOCRegister from '@/components/reports/IssuedNOCRegister';
import NOCByDepartmentReport from '@/components/reports/NOCByDepartmentReport';
import ApplicantListReport from '@/components/reports/ApplicantListReport';
import StageWiseReport from '@/components/reports/StageWiseReport';
import ShortlistRejectionReport from '@/components/reports/ShortlistRejectionReport';
import OfferAcceptanceSummary from '@/components/reports/OfferAcceptanceSummary';
import JoiningStatusSummary from '@/components/reports/JoiningStatusSummary';
import ComplianceReport from '@/components/reports/ComplianceReport';
import InternshipStatusSummary from '@/components/reports/InternshipStatusSummary';
import CertificatePendingReport from '@/components/reports/CertificatePendingReport';
import CompanyInternshipSummary from '@/components/reports/CompanyInternshipSummary';
import PortfolioCompletionReport from '@/components/reports/PortfolioCompletionReport';
import PublishedPortfoliosReport from '@/components/reports/PublishedPortfoliosReport';
import AnnouncementHistoryReport from '@/components/reports/AnnouncementHistoryReport';
import ConsentTrackingReport from '@/components/reports/ConsentTrackingReport';
import PlacementCellReport from '@/components/reports/PlacementCellReport';
import PlacementSummaryReport from '@/components/reports/PlacementSummaryReport';
import CompanyPerformanceReport from '@/components/reports/CompanyPerformanceReport';
import OfferToJoinFunnelReport from '@/components/reports/OfferToJoinFunnelReport';
import UnplacedStudentsReport from '@/components/reports/UnplacedStudentsReport';
import PlacementCountReport from '@/components/reports/PlacementCountReport';
import PlacementListingReport from '@/components/reports/PlacementListingReport';
import InternshipNocCountReport from '@/components/reports/InternshipNocCountReport';
import InternshipNocListingReport from '@/components/reports/InternshipNocListingReport';
import NoDuesCountReport from '@/components/reports/NoDuesCountReport';
import NoDuesListingReport from '@/components/reports/NoDuesListingReport';
import CompanyCountReport from '@/components/reports/CompanyCountReport';
import CompanyStageReport from '@/components/reports/CompanyStageReport';

// Module definitions for scalability
// NOTE: Reports removed per the "EXISTING REPORTS REMARK" meeting sheet are unregistered here
// (their render guards + components remain as unreachable dead code). Employer / Internships /
// Portfolio / Communication modules were emptied entirely and dropped.
const reportModules = [
  {
    id: 'student',
    name: 'Student Management',
    icon: Users,
    reports: [
      { id: 'eligibility', name: 'Eligibility Report', icon: CheckCircle },
      { id: 'profile', name: 'Profile Completion', icon: PieChart },
      { id: 'registration', name: 'Registration Summary', icon: BarChart3 },
    ]
  },
  {
    id: 'postings',
    name: 'Job & Internship Postings',
    icon: Briefcase,
    reports: [
      { id: 'posting-history', name: 'Posting History by Year', icon: History },
    ]
  },
  {
    id: 'events',
    name: 'Events & Campus Drives',
    icon: Calendar,
    reports: [
      { id: 'student-participation', name: 'Student Participation History', icon: UserCheck },
    ]
  },
  {
    id: 'noc',
    name: 'NOC & Documents',
    icon: FileText,
    reports: [
      { id: 'noc-by-dept', name: 'NOC by Department / Batch', icon: Building2 },
      { id: 'noc-count', name: 'Internship / NOC Count', icon: FileText },
      { id: 'noc-listing', name: 'Internship / NOC Listing', icon: FileText },
    ]
  },
  {
    id: 'ats',
    name: 'Applications & ATS',
    icon: ClipboardList,
    reports: [
      { id: 'stage-wise', name: 'Stage-wise Application Count', icon: BarChart3 },
      { id: 'shortlist-rejection', name: 'Shortlist vs Rejection', icon: UserCheck },
      { id: 'company-count', name: 'Company Data Count', icon: Building2 },
      { id: 'company-stage', name: 'Company Stage-wise', icon: BarChart3 },
    ]
  },
  {
    id: 'offers',
    name: 'Offers & Joining',
    icon: CheckCircle,
    reports: [
      { id: 'offer-acceptance', name: 'Offer Acceptance Summary', icon: CheckCircle },
    ]
  },
  {
    id: 'placement-analytics',
    name: 'Placement Analytics',
    icon: TrendingUp,
    reports: [
      { id: 'unplaced-students', name: 'Unplaced Students', icon: AlertCircle },
      { id: 'placement-count', name: 'Placement Count', icon: TrendingUp },
      { id: 'placement-listing', name: 'Placement Data Listing', icon: Users },
    ]
  },
  {
    id: 'no-dues',
    name: 'No Dues',
    icon: ClipboardList,
    reports: [
      { id: 'no-dues-count', name: 'No-Due Count', icon: ClipboardList },
      { id: 'no-dues-listing', name: 'No-Due Listing', icon: ClipboardList },
    ]
  }
];

const interestTypes = [
  { value: 'placement', label: 'Campus Placement' },
  { value: 'summer_internship', label: 'Summer Internship' },
  { value: 'winter_internship', label: 'Winter Internship' },
  { value: 'final_semester_internship', label: 'Final Semester Internship' },
];

const profileBands = [
  { label: '100%', min: 100, max: 100, color: 'bg-green-500' },
  { label: '80-99%', min: 80, max: 99, color: 'bg-blue-500' },
  { label: '50-79%', min: 50, max: 79, color: 'bg-yellow-500' },
  { label: 'Below 50%', min: 0, max: 49, color: 'bg-red-500' },
];

function getPostingTypeLabel(type: string) {
  switch (type) {
    case 'job':
      return 'Placements (Jobs)';
    case 'internship':
      return 'Internships';
    case 'stipend_internship':
      return 'Stipend Internships';
    default:
      return type.replace(/_/g, ' ');
  }
}

function getWorkModeLabel(mode: string) {
  switch (mode) {
    case 'on_campus':
      return 'On Campus';
    case 'remote':
      return 'Remote';
    case 'hybrid':
      return 'Hybrid';
    default:
      return mode.replace(/_/g, ' ');
  }
}

export default function ReportsAnalytics() {
  const { toast } = useToast();
  const [activeModule, setActiveModule] = useState('student');
  const [activeReport, setActiveReport] = useState('eligibility');
  
  // Student Report filters
  const [selectedInterest, setSelectedInterest] = useState('placement');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [minCgpa, setMinCgpa] = useState('all');
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Employer Report filters
  const [companyStatusFilter, setCompanyStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');

  // Postings Report filters
  const [postingYearFilter, setPostingYearFilter] = useState('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');
  const academicYearQuery = useMasterValues('academic_year');
  const { options: reportPostingTypeOptions, isLoading: reportPostingTypesLoading, isEmpty: reportPostingTypesEmpty } = usePostingTypeOptions();

  const interestedStudentsQuery = useInterestedStudentsReport(
    { interest_type: selectedInterest },
    activeModule === 'student' && activeReport === 'interested'
  );
  const registrationQuery = useRegistrationSummaryReport(
    {},
    activeModule === 'student' && (activeReport === 'interested' || activeReport === 'registration')
  );
  const eligibilityQuery = useEligibilityReport(
    {},
    activeModule === 'student' && activeReport === 'eligibility'
  );
  const profileQuery = useProfileCompletionReport(
    {},
    activeModule === 'student' && activeReport === 'profile'
  );

  const companyQuery = useCompanyMasterReport(
    {},
    activeModule === 'employer' && (activeReport === 'company-master' || activeReport === 'company-classification')
  );
  const recruiterQuery = useRecruiterListReport(
    {},
    activeModule === 'employer' && activeReport === 'recruiter-list'
  );
  const engagementQuery = useEngagementHistoryReport(
    {},
    activeModule === 'employer' && activeReport === 'engagement-history'
  );

  const activePostingsQuery = useActivePostingsReport(
    {},
    activeModule === 'postings' && activeReport === 'active-postings'
  );
  const postingHistoryQuery = usePostingHistoryReport(
    {},
    activeModule === 'postings' && (activeReport === 'posting-history' || activeReport === 'posting-summary')
  );
  const postingSummaryQuery = usePostingSummaryReport(
    {},
    activeModule === 'postings' && activeReport === 'posting-summary'
  );

  const studentsWithInterest = useMemo(() => {
    const source = interestedStudentsQuery.data?.students ?? [];

    return source.filter((student: any) => {
      const matchesDepartment = departmentFilter === 'all' || student.department === departmentFilter;
      const matchesVerified = !verifiedOnly || student.verification_status === 'verified';

      let matchesCgpa = true;
      const cgpa = Number(student.cgpa ?? student.academicProfile?.cgpa ?? 0);
      if (minCgpa === '9+') matchesCgpa = cgpa >= 9;
      else if (minCgpa === '8+') matchesCgpa = cgpa >= 8;
      else if (minCgpa === '7+') matchesCgpa = cgpa >= 7;

      return matchesDepartment && matchesVerified && matchesCgpa;
    }).map((student: any) => ({
      ...student,
      verificationStatus: student.verification_status,
      academicProfile: {
        cgpa: Number(student.cgpa ?? student.academicProfile?.cgpa ?? 0),
        backlog_count: Number(student.backlog_count ?? student.academicProfile?.backlog_count ?? 0),
      },
    }));
  }, [departmentFilter, minCgpa, verifiedOnly, interestedStudentsQuery.data]);

  const eligibilityData = useMemo(() => {
    const rows = eligibilityQuery.data?.students ?? [];
    const normalized = rows.map((student: any) => ({
      ...student,
      verificationStatus: student.verification_status,
      academicProfile: {
        cgpa: Number(student.cgpa ?? student.academicProfile?.cgpa ?? 0),
        backlog_count: Number(student.backlog_count ?? student.academicProfile?.backlog_count ?? 0),
      },
    }));

    return {
      eligible: normalized.filter((student: any) => student.eligibility_status === 'eligible'),
      conditional: normalized.filter((student: any) => student.eligibility_status === 'conditional'),
      notEligible: normalized.filter((student: any) => student.eligibility_status === 'not_eligible'),
      total: eligibilityQuery.data?.stats?.total ?? normalized.length,
    };
  }, [eligibilityQuery.data]);

  const profileData = useMemo(() => {
    const bands = profileQuery.data?.bands ?? [];
    return bands.map((band: any) => ({
      ...band,
      count: band.count ?? 0,
      color: profileBands.find((profileBand) => profileBand.label === band.label)?.color ?? 'bg-muted',
    }));
  }, [profileQuery.data]);

  const profileTotalStudents = profileQuery.data?.students?.length ?? 0;
  const profileDepartments = profileQuery.data?.departments ?? [];
  const studentDepartments = useMemo(() => profileDepartments.map((dept: any) => dept.department), [profileDepartments]);

  const registrationData = registrationQuery.data?.summary ?? [];
  const registrationTotalStudents = registrationQuery.data?.total_students ?? profileTotalStudents;

  const companies = useMemo(() => {
    return (companyQuery.data?.companies ?? []).map((company: any) => ({
      ...company,
      id: company.company_id,
      internalRemarks: company.internal_remarks,
    }));
  }, [companyQuery.data]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company: any) => {
      const matchesStatus = companyStatusFilter === 'all' || company.status === companyStatusFilter;
      const matchesIndustry = industryFilter === 'all' || company.industry === industryFilter;
      return matchesStatus && matchesIndustry;
    });
  }, [companyStatusFilter, companies, industryFilter]);

  const companyStats = companyQuery.data?.stats ?? { total: 0, active: 0, preferred: 0, blacklisted: 0 };
  const recruiterStats = recruiterQuery.data?.stats ?? { total: 0, verified: 0, pending: 0, rejected: 0 };
  const recruiters = useMemo(() => {
    return (recruiterQuery.data?.recruiters ?? []).map((recruiter: any) => ({
      ...recruiter,
      id: recruiter.recruiter_id,
      companyName: recruiter.company_name,
      verificationStatus: recruiter.verification_status,
    }));
  }, [recruiterQuery.data]);

  const industries = useMemo<string[]>(() => {
    return Array.from(
      new Set(
        companies
          .map((company: any) => company.industry)
          .filter((industry: unknown): industry is string => typeof industry === 'string' && industry.trim().length > 0),
      ),
    );
  }, [companies]);

  const engagements = useMemo(() => {
    return (engagementQuery.data?.engagements ?? []).map((engagement: any) => ({
      ...engagement,
      id: engagement.engagement_id,
      companyId: engagement.company_id,
      visitorType: engagement.type,
      academicYear: engagement.academic_year,
      studentsHired: engagement.students_hired,
      packagesOffered: engagement.packages_offered,
    }));
  }, [engagementQuery.data]);

  const engagementSummary = engagementQuery.data?.stats
    ? {
        placement: engagementQuery.data.stats.placement ?? 0,
        internship: engagementQuery.data.stats.internship ?? 0,
        campus_visit: engagementQuery.data.stats.campus_visit ?? 0,
        guest_lecture: engagementQuery.data.stats.guest_lecture ?? 0,
        workshop: engagementQuery.data.stats.workshop ?? 0,
        totalHired: engagementQuery.data.stats.total_hired ?? 0,
      }
    : {
        placement: 0,
        internship: 0,
        campus_visit: 0,
        guest_lecture: 0,
        workshop: 0,
        totalHired: 0,
      };

  const activePostings = useMemo(() => {
    return (activePostingsQuery.data?.postings ?? []).map((posting: any) => ({
      ...posting,
      id: posting.posting_id,
      companyName: posting.company_name,
      roleName: posting.role_name,
      applicationStartDate: posting.application_start_date,
      applicationEndDate: posting.application_end_date,
      academicYear: posting.academic_year,
    }));
  }, [activePostingsQuery.data]);

  const activePostingStats = activePostingsQuery.data?.stats ?? {
    active: 0,
    jobs: 0,
    internships: 0,
    stipend_internships: 0,
    closing_this_week: 0,
  };

  const postingHistoryRows = useMemo(() => {
    return (postingHistoryQuery.data?.postings ?? []).map((posting: any) => ({
      ...posting,
      id: posting.posting_id,
      companyName: posting.company_name,
      roleName: posting.role_name,
      academicYear: posting.academic_year,
      publishedAt: posting.published_at,
      closedAt: posting.closed_at,
      createdAt: posting.published_at ?? posting.application_start_date ?? posting.closed_at,
    }));
  }, [postingHistoryQuery.data]);

  const academicYears = useMemo(() => {
    const masterYears = academicYearQuery.data ?? [];
    const derivedYears = postingHistoryRows.map((posting: any) => posting.academicYear);
    return Array.from(new Set([...masterYears, ...derivedYears]))
      .filter(Boolean)
      .sort((left, right) => right.localeCompare(left));
  }, [academicYearQuery.data, postingHistoryRows]);
  const academicYearOptions = useMemo(
    () => academicYears.map((year) => ({ value: year, label: year })),
    [academicYears],
  );

  const filteredPostingHistory = useMemo(() => {
    return postingHistoryRows.filter((posting: any) => {
      const matchesYear = postingYearFilter === 'all' || posting.academicYear === postingYearFilter;
      const matchesType = postingTypeFilter === 'all' || posting.type === postingTypeFilter;
      return matchesYear && matchesType;
    });
  }, [postingHistoryRows, postingYearFilter, postingTypeFilter]);

  // Posting-type-wise rollup of the currently filtered history (respects year + type filters).
  const postingTypeSummary = useMemo(() => {
    const map = new Map<string, { type: string; label: string; total: number; draft: number; published: number; closed: number }>();
    filteredPostingHistory.forEach((posting: any) => {
      const type = posting.type || 'unspecified';
      const entry = map.get(type) ?? { type, label: getPostingTypeLabel(type), total: 0, draft: 0, published: 0, closed: 0 };
      entry.total += 1;
      if (posting.status === 'draft') entry.draft += 1;
      else if (posting.status === 'published') entry.published += 1;
      else if (posting.status === 'closed') entry.closed += 1;
      map.set(type, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredPostingHistory]);

  const postingSummaryData = useMemo(() => {
    const summary = postingSummaryQuery.data?.summary;

    return {
      jobs: summary?.jobs ?? { total: 0, draft: 0, published: 0, closed: 0 },
      internships: summary?.internships ?? { total: 0, draft: 0, published: 0, closed: 0 },
      stipendInternships: summary?.stipendInternships ?? { total: 0, draft: 0, published: 0, closed: 0 },
      total: summary?.total ?? 0,
      byYear: postingSummaryQuery.data?.by_year ?? [],
    };
  }, [postingSummaryQuery.data]);

  const postingStats = postingHistoryQuery.data?.stats ?? {
    total: 0,
    draft: 0,
    published: 0,
    closed: 0,
  };

  const eligibilityRows = useMemo(() => {
    return [...eligibilityData.eligible, ...eligibilityData.conditional, ...eligibilityData.notEligible];
  }, [eligibilityData]);

  const eligibilityByDept = useMemo(() => {
    const map = new Map<string, { department: string; total: number; eligible: number; conditional: number; notEligible: number }>();
    eligibilityRows.forEach((student: any) => {
      const dept = student.department || 'Unassigned';
      const entry = map.get(dept) ?? { department: dept, total: 0, eligible: 0, conditional: 0, notEligible: 0 };
      entry.total += 1;
      if (student.eligibility_status === 'eligible') entry.eligible += 1;
      else if (student.eligibility_status === 'conditional') entry.conditional += 1;
      else entry.notEligible += 1;
      map.set(dept, entry);
    });
    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        eligibleRate: entry.total > 0 ? Math.round((entry.eligible / entry.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [eligibilityRows]);

  const handleSelectAll = () => {
    if (selectedStudents.length === studentsWithInterest.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(studentsWithInterest.map(s => s.student_id));
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleExport = (reportType: string, format: 'csv' | 'excel') => {
    let csvContent = '';
    let filename = '';

    switch(reportType) {
      case 'interested':
        const interestedData = studentsWithInterest.filter(s => 
          selectedStudents.length === 0 || selectedStudents.includes(s.student_id)
        );
        csvContent = `Name,Roll Number,Email,Department,CGPA,Profile Completion\n` +
          interestedData.map(s => 
            `${s.full_name},${s.roll_number},${s.email},${s.department},${s.academicProfile.cgpa},${s.profile_completion_percentage}%`
          ).join('\n');
        filename = `${selectedInterest}_interested_list`;
        break;
      case 'eligibility':
        csvContent = `Name,Enrollment Number,Department,CGPA,Backlogs,Status\n` +
          eligibilityRows.map(s => {
            const status = s.academicProfile.cgpa >= 7 && s.academicProfile.backlog_count === 0 ? 'Eligible'
              : s.academicProfile.cgpa >= 6 && s.academicProfile.backlog_count <= 1 ? 'Conditional' : 'Not Eligible';
            return `${s.full_name},${s.enrollment_number},${s.department},${s.academicProfile.cgpa},${s.academicProfile.backlog_count},${status}`;
          }).join('\n');
        filename = 'eligibility_report';
        break;
      case 'profile':
        csvContent = `Name,Enrollment Number,Department,Profile Completion\n` +
          (profileQuery.data?.students ?? []).map((s: any) =>
            `${s.full_name},${s.enrollment_number},${s.department},${s.profile_completion_percentage}%`
          ).join('\n');
        filename = 'profile_completeness_report';
        break;
      case 'registration':
        csvContent = `Posting Type,Total,Verified,Pending,Rejected\n` +
          registrationData.map(r =>
            `${r.label ?? r.interest_type},${r.count},${r.verified},${r.pending},${r.rejected}`
          ).join('\n');
        filename = 'registration_summary';
        break;
      case 'company-master':
        csvContent = `Company Name,Industry,Address,Website,Status,Classification\n` +
          filteredCompanies.map(c => 
            `${c.name},${c.industry},"${c.address}",${c.website},${c.status},${c.classification}`
          ).join('\n');
        filename = 'company_master_list';
        break;
      case 'recruiter-list':
        csvContent = `Recruiter Name,Email,Phone,Designation,Company,Verification Status\n` +
          recruiters.map((r: any) => 
            `${r.name},${r.email},${r.phone},${r.designation},${r.companyName},${r.verificationStatus}`
          ).join('\n');
        filename = 'recruiter_list';
        break;
      case 'engagement-history':
        csvContent = `Company,Type,Academic Year,Date,Students Hired,Package,Remarks\n` +
          engagements.map((e: any) => {
            const company = companies.find((c: any) => c.id === e.companyId || c.company_id === e.companyId);
            return `${company?.name || 'Unknown'},${e.visitorType},${e.academicYear},${new Date(e.date).toLocaleDateString('en-IN')},${e.studentsHired || '-'},${e.packagesOffered || '-'},"${e.remarks || ''}"`;
          }).join('\n');
        filename = 'engagement_history';
        break;
      case 'company-classification':
        csvContent = `Company Name,Industry,Status,Classification,Internal Remarks\n` +
          companies.map((c: any) => 
            `${c.name},${c.industry},${c.status},${c.classification},"${c.internalRemarks || ''}"`
          ).join('\n');
        filename = 'company_classification_report';
        break;
      case 'active-postings':
        csvContent = `Title,Company,Type,Role,Location,Work Mode,Status,Application Start,Application End\n` +
          activePostings.map(p => 
            `"${p.title}",${p.companyName},${getPostingTypeLabel(p.type)},${p.roleName},"${p.location}",${getWorkModeLabel(p.workMode)},${p.status},${p.applicationStartDate},${p.applicationEndDate}`
          ).join('\n');
        filename = 'active_postings_report';
        break;
      case 'posting-history':
        csvContent = `Title,Company,Type,Academic Year,Role,Status,Created Date,Published Date,Closed Date\n` +
          filteredPostingHistory.map(p => 
            `"${p.title}",${p.companyName},${getPostingTypeLabel(p.type)},${p.academicYear},${p.roleName},${p.status},${p.createdAt},${p.publishedAt || '-'},${p.closedAt || '-'}`
          ).join('\n');
        filename = `posting_history_${postingYearFilter === 'all' ? 'all_years' : postingYearFilter}`;
        break;
      case 'posting-summary':
        csvContent = `Category,Total,Draft,Published,Closed\n` +
          `Placements (Jobs),${postingSummaryData.jobs.total},${postingSummaryData.jobs.draft},${postingSummaryData.jobs.published},${postingSummaryData.jobs.closed}\n` +
          `Internships,${postingSummaryData.internships.total},${postingSummaryData.internships.draft},${postingSummaryData.internships.published},${postingSummaryData.internships.closed}\n` +
          `Stipend Internships,${postingSummaryData.stipendInternships.total},${postingSummaryData.stipendInternships.draft},${postingSummaryData.stipendInternships.published},${postingSummaryData.stipendInternships.closed}`;
        filename = 'internship_vs_placement_summary';
        break;
    }
    
    const blob = new Blob([csvContent], { 
      type: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    a.click();

    toast({
      title: "Report Exported",
      description: `Report exported to ${format.toUpperCase()} successfully.`,
    });
  };

  const handleReportChange = (moduleId: string, reportId: string) => {
    setActiveModule(moduleId);
    setActiveReport(reportId);
  };

  const currentModule = reportModules.find(m => m.id === activeModule);

  return (
    <DashboardLayout 
      title="Reports & Analytics" 
      subtitle="Generate and export comprehensive reports across all modules"
    >
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Sidebar Navigation - Collapsible on mobile */}
        <Card className="w-full lg:w-72 shrink-0 lg:sticky lg:top-4 flex flex-col lg:max-h-[calc(100vh-120px)]">
          <CardHeader className="pb-2 border-b shrink-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Report Modules
            </CardTitle>
            <CardDescription className="text-xs">Select a module and report</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden flex-1 min-h-0">
            <ScrollArea className="h-full max-h-[60vh] lg:max-h-none">
              <div className="p-2 space-y-1">
                {reportModules.map((module, moduleIndex) => {
                  const isModuleActive = activeModule === module.id;
                  const activeReportInModule = module.reports.find(r => r.id === activeReport);
                  
                  return (
                    <div key={module.id} className="space-y-1">
                      {/* Module Header - Always visible */}
                      <button
                        onClick={() => {
                          setActiveModule(module.id);
                          if (!isModuleActive) {
                            setActiveReport(module.reports[0].id);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                          isModuleActive 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-muted border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${isModuleActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <module.icon className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-medium ${isModuleActive ? 'text-primary' : 'text-foreground'}`}>
                              {module.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {module.reports.length} reports
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isModuleActive ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {/* Child Reports - Expandable */}
                      {isModuleActive && (
                        <div className="ml-3 pl-3 border-l-2 border-muted space-y-0.5">
                          {module.reports.map((report, reportIndex) => {
                            const isReportActive = activeReport === report.id;
                            return (
                              <button
                                key={report.id}
                                onClick={() => setActiveReport(report.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all ${
                                  isReportActive 
                                    ? 'bg-primary text-primary-foreground shadow-sm' 
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                              >
                                <report.icon className={`h-4 w-4 shrink-0 ${isReportActive ? '' : 'opacity-70'}`} />
                                <span className="text-sm truncate">{report.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Separator between modules */}
                      {moduleIndex < reportModules.length - 1 && !isModuleActive && (
                        <div className="my-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex-1 space-y-4 lg:space-y-6 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground overflow-x-auto">
            <span className="whitespace-nowrap">{currentModule?.name}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
            <span className="text-foreground font-medium whitespace-nowrap">
              {currentModule?.reports.find(r => r.id === activeReport)?.name}
            </span>
          </div>

          {/* Student Module Reports */}
          {activeModule === 'student' && activeReport === 'interested' && (
            <div className="space-y-4 lg:space-y-6">
              {/* Interest Type Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Interest Type
                  </CardTitle>
                  <CardDescription>
                    Choose one category to load only the matching interested students.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select value={selectedInterest} onValueChange={setSelectedInterest}>
                      <SelectTrigger className="w-full sm:w-[320px]">
                        <SelectValue placeholder="Select interest type" />
                      </SelectTrigger>
                      <SelectContent>
                        {interestTypes.map((type) => {
                          const summary = registrationData.find((i: any) => i.interest_type === type.value);
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label} ({summary?.count || 0})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <div className="text-sm text-muted-foreground">
                      {interestTypes.find((type) => type.value === selectedInterest)?.label || 'Selected type'}
                      {' '}
                      list shown below.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filter Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {studentDepartments.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={minCgpa} onValueChange={setMinCgpa}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Min CGPA" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any CGPA</SelectItem>
                        <SelectItem value="9+">9.0+</SelectItem>
                        <SelectItem value="8+">8.0+</SelectItem>
                        <SelectItem value="7+">7.0+</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="verified" 
                        checked={verifiedOnly}
                        onCheckedChange={(checked) => setVerifiedOnly(checked as boolean)}
                      />
                      <label htmlFor="verified" className="text-sm cursor-pointer">
                        Verified students only
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {interestTypes.find(t => t.value === selectedInterest)?.label} List
                    </CardTitle>
                    <CardDescription>
                      {studentsWithInterest.length} students match your criteria
                      {selectedStudents.length > 0 && ` (${selectedStudents.length} selected)`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('interested', 'csv')}>
                      <Download className="h-4 w-4 mr-2" /> CSV
                    </Button>
                    <Button onClick={() => handleExport('interested', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {studentsWithInterest.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Students Found</h3>
                      <p className="text-muted-foreground">Try adjusting your filters</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedStudents.length === studentsWithInterest.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>CGPA</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentsWithInterest.map((student) => (
                          <TableRow key={student.student_id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedStudents.includes(student.student_id)}
                                onCheckedChange={() => handleSelectStudent(student.student_id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{student.full_name}</p>
                                <p className="text-sm text-muted-foreground">{student.roll_number}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{student.department}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{student.academicProfile.cgpa.toFixed(2)}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{student.email}</p>
                                <p className="text-muted-foreground">{student.mobile}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={student.verificationStatus === 'verified' 
                                  ? 'text-green-600 bg-green-500/10 border-green-500/20' 
                                  : 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20'
                                }
                              >
                                {student.verificationStatus}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeModule === 'student' && activeReport === 'eligibility' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-green-200 dark:border-green-900">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Eligible
                      </CardTitle>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {eligibilityData.eligible.length}
                      </Badge>
                    </div>
                    <CardDescription>CGPA ≥ 7.0, No backlogs</CardDescription>
                  </CardHeader>
                    <CardContent>
                    <Progress value={eligibilityData.total > 0 ? (eligibilityData.eligible.length / eligibilityData.total) * 100 : 0} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {eligibilityData.total > 0 ? Math.round((eligibilityData.eligible.length / eligibilityData.total) * 100) : 0}% of total students
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 dark:border-yellow-900">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        Conditional
                      </CardTitle>
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        {eligibilityData.conditional.length}
                      </Badge>
                    </div>
                    <CardDescription>CGPA 6.0-7.0, Max 1 backlog</CardDescription>
                  </CardHeader>
                    <CardContent>
                    <Progress value={eligibilityData.total > 0 ? (eligibilityData.conditional.length / eligibilityData.total) * 100 : 0} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {eligibilityData.total > 0 ? Math.round((eligibilityData.conditional.length / eligibilityData.total) * 100) : 0}% of total students
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-red-200 dark:border-red-900">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        Not Eligible
                      </CardTitle>
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        {eligibilityData.notEligible.length}
                      </Badge>
                    </div>
                    <CardDescription>CGPA &lt; 6.0 or &gt; 1 backlog</CardDescription>
                  </CardHeader>
                    <CardContent>
                    <Progress value={eligibilityData.total > 0 ? (eligibilityData.notEligible.length / eligibilityData.total) * 100 : 0} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {eligibilityData.total > 0 ? Math.round((eligibilityData.notEligible.length / eligibilityData.total) * 100) : 0}% of total students
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Department-wise Breakdown */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Department-wise Eligibility</CardTitle>
                    <CardDescription>Eligible share of students by department</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('eligibility', 'csv')}>
                      <Download className="h-4 w-4 mr-2" /> CSV
                    </Button>
                    <Button onClick={() => handleExport('eligibility', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {eligibilityByDept.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No eligibility data available.</p>
                  ) : (
                    <div className="space-y-5">
                      {eligibilityByDept.map((dept) => (
                        <div key={dept.department} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{dept.department}</span>
                            <span className="text-muted-foreground">
                              {dept.eligibleRate}% eligible ({dept.total} students)
                            </span>
                          </div>
                          <Progress value={dept.eligibleRate} className="h-2" />
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline" className="text-green-600 border-green-500/40">
                              Eligible {dept.eligible}
                            </Badge>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-500/40">
                              Conditional {dept.conditional}
                            </Badge>
                            <Badge variant="outline" className="text-red-600 border-red-500/40">
                              Not Eligible {dept.notEligible}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeModule === 'student' && activeReport === 'profile' && (
            <div className="space-y-6">
              {/* Visual Summary */}
              <div className="grid md:grid-cols-4 gap-4">
                {profileData.map((band) => (
                  <Card key={band.label}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`h-3 w-3 rounded-full ${band.color}`} />
                        <span className="text-2xl font-bold">{band.count}</span>
                      </div>
                      <h4 className="font-medium">{band.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {profileTotalStudents > 0 ? Math.round((band.count / profileTotalStudents) * 100) : 0}% of students
                      </p>
                      <Progress 
                        value={profileTotalStudents > 0 ? (band.count / profileTotalStudents) * 100 : 0} 
                        className="mt-3 h-2"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Department-wise Breakdown */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Department-wise Profile Completion</CardTitle>
                    <CardDescription>Average profile completion by department</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('profile', 'csv')}>
                      <Download className="h-4 w-4 mr-2" /> CSV
                    </Button>
                    <Button onClick={() => handleExport('profile', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profileDepartments.slice(0, 6).map((dept: any) => {
                      return (
                        <div key={dept.department} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{dept.department}</span>
                            <span className="text-muted-foreground">{dept.avg_completion}% avg ({dept.count} students)</span>
                          </div>
                          <Progress value={dept.avg_completion} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeModule === 'student' && activeReport === 'registration' && (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Registrations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{registrationData.reduce((acc, r) => acc + r.count, 0)}</p>
                    <p className="text-sm text-muted-foreground">Across all programs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">
                      {registrationData.reduce((acc, r) => acc + r.verified, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Ready for placement</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-yellow-600">
                      {registrationData.reduce((acc, r) => acc + r.pending, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Awaiting review</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Unique Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{registrationTotalStudents}</p>
                    <p className="text-sm text-muted-foreground">In the system</p>
                  </CardContent>
                </Card>
              </div>

              {/* Registration Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Registration by Posting Type</CardTitle>
                    <CardDescription>Breakdown of registrations by posting type</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('registration', 'csv')}>
                      <Download className="h-4 w-4 mr-2" /> CSV
                    </Button>
                    <Button onClick={() => handleExport('registration', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posting Type</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Verified</TableHead>
                        <TableHead className="text-center">Pending</TableHead>
                        <TableHead className="text-center">Rejected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrationData.map((reg) => (
                        <TableRow key={reg.interest_type}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {reg.interest_type.includes('internship') ? (
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium capitalize">
                                {reg.label ?? reg.interest_type.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">{reg.count}</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {reg.verified}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              {reg.pending}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              {reg.rejected}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employer Module Reports */}
          {activeModule === 'employer' && activeReport === 'company-master' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <Building2 className="h-8 w-8 text-primary" />
                      <span className="text-3xl font-bold">{companyStats.total}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Total Companies</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <span className="text-3xl font-bold">{companyStats.active}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Active Companies</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <Star className="h-8 w-8 text-yellow-600" />
                      <span className="text-3xl font-bold">{companyStats.preferred}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Preferred Partners</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <Ban className="h-8 w-8 text-red-600" />
                      <span className="text-3xl font-bold">{companyStats.blacklisted}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Blacklisted</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filter Companies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Select value={companyStatusFilter} onValueChange={setCompanyStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={industryFilter} onValueChange={setIndustryFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Industries</SelectItem>
                        {industries.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Company Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Company Master List</CardTitle>
                    <CardDescription>{filteredCompanies.length} companies</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('company-master', 'csv')}>
                      <Download className="h-4 w-4 mr-2" /> CSV
                    </Button>
                    <Button onClick={() => handleExport('company-master', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>Website</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompanies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{company.name}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-xs">{company.address}</p>
                            </div>
                          </TableCell>
                          <TableCell>{company.industry}</TableCell>
                          <TableCell>
                            <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                              {company.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={
                                company.classification === 'preferred' 
                                  ? 'text-yellow-600 border-yellow-500' 
                                  : company.classification === 'blacklisted'
                                    ? 'text-red-600 border-red-500'
                                    : ''
                              }
                            >
                              {company.classification === 'preferred' && <Star className="h-3 w-3 mr-1" />}
                              {company.classification === 'blacklisted' && <Ban className="h-3 w-3 mr-1" />}
                              {company.classification}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{company.website}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeModule === 'employer' && activeReport === 'recruiter-list' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <UserCog className="h-8 w-8 text-primary" />
                      <span className="text-3xl font-bold">{recruiterStats.total}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Total Recruiters</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <span className="text-3xl font-bold">{recruiterStats.verified}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Verified</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <AlertCircle className="h-8 w-8 text-yellow-600" />
                      <span className="text-3xl font-bold">{recruiterStats.pending}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Pending Verification</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recruiter Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recruiter List by Company</CardTitle>
                    <CardDescription>All recruiters grouped by their companies</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('recruiter-list', 'csv')}>
                      <Download className="h-4 w-4 mr-2" /> CSV
                    </Button>
                    <Button onClick={() => handleExport('recruiter-list', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recruiter</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recruiters.map((recruiter: any) => (
                        <TableRow key={recruiter.id}>
                          <TableCell className="font-medium">{recruiter.name}</TableCell>
                          <TableCell>{recruiter.companyName}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{recruiter.email}</p>
                              <p className="text-muted-foreground">{recruiter.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>{recruiter.designation}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={
                                recruiter.verificationStatus === 'verified' 
                                  ? 'text-green-600 bg-green-500/10 border-green-500/20' 
                                  : 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20'
                              }
                            >
                              {recruiter.verificationStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeModule === 'employer' && activeReport === 'engagement-history' && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold">{engagementSummary.placement}</p>
                    <p className="text-sm text-muted-foreground">Placements</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold">{engagementSummary.internship}</p>
                    <p className="text-sm text-muted-foreground">Internships</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold">{engagementSummary.campus_visit}</p>
                    <p className="text-sm text-muted-foreground">Campus Visits</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold">{engagementSummary.guest_lecture}</p>
                    <p className="text-sm text-muted-foreground">Guest Lectures</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold">{engagementSummary.workshop}</p>
                    <p className="text-sm text-muted-foreground">Workshops</p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5">
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-primary">{engagementSummary.totalHired}</p>
                    <p className="text-sm text-muted-foreground">Students Hired</p>
                  </CardContent>
                </Card>
              </div>

              {/* Engagement Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Engagement History Summary</CardTitle>
                    <CardDescription>Complete history of company engagements</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('engagement-history', 'csv')}>
                      <Download className="h-4 w-4 mr-2" /> CSV
                    </Button>
                    <Button onClick={() => handleExport('engagement-history', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Academic Year</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Students Hired</TableHead>
                        <TableHead>Package</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {engagements.map((engagement: any) => {
                        const company = companies.find((c: any) => c.id === engagement.companyId || c.company_id === engagement.companyId);
                        return (
                          <TableRow key={engagement.id}>
                            <TableCell className="font-medium">{company?.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {engagement.visitorType.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{engagement.academicYear}</TableCell>
                            <TableCell>{new Date(engagement.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-center">{engagement.studentsHired || '-'}</TableCell>
                            <TableCell>{engagement.packagesOffered || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeModule === 'employer' && activeReport === 'company-classification' && (
            <div className="space-y-6">
              {/* Classification Summary */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-yellow-200 dark:border-yellow-900">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-600" />
                        Preferred Partners
                      </CardTitle>
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        {companyStats.preferred}
                      </Badge>
                    </div>
                    <CardDescription>Companies with excellent track record</CardDescription>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        Normal
                      </CardTitle>
                      <Badge variant="secondary">
                        {companyStats.total - companyStats.preferred - companyStats.blacklisted}
                      </Badge>
                    </div>
                    <CardDescription>Regular company partners</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border-red-200 dark:border-red-900">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Ban className="h-5 w-5 text-red-600" />
                        Blacklisted
                      </CardTitle>
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        {companyStats.blacklisted}
                      </Badge>
                    </div>
                    <CardDescription>Companies restricted from engagement</CardDescription>
                  </CardHeader>
                </Card>
              </div>

              {/* Classification Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Preferred vs Blacklisted Report</CardTitle>
                    <CardDescription>Company classification with internal remarks</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('company-classification', 'csv')}>
                      <Download className="h-4 w-4 mr-2" /> CSV
                    </Button>
                    <Button onClick={() => handleExport('company-classification', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>Internal Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company: any) => (
                        <TableRow key={company.id} className={company.classification === 'blacklisted' ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell>{company.industry}</TableCell>
                          <TableCell>
                            <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                              {company.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={
                                company.classification === 'preferred' 
                                  ? 'text-yellow-600 border-yellow-500 bg-yellow-500/10' 
                                  : company.classification === 'blacklisted'
                                    ? 'text-red-600 border-red-500 bg-red-500/10'
                                    : ''
                              }
                            >
                              {company.classification === 'preferred' && <Star className="h-3 w-3 mr-1" />}
                              {company.classification === 'blacklisted' && <Ban className="h-3 w-3 mr-1" />}
                              {company.classification}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {company.internalRemarks || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Postings Module Reports */}
          {activeModule === 'postings' && activeReport === 'active-postings' && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold">{activePostingStats.active}</p>
                    <p className="text-sm text-muted-foreground">Active Postings</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold">{activePostings.filter(p => p.type === 'job').length}</p>
                    <p className="text-sm text-muted-foreground">Active Jobs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold">{activePostings.filter(p => p.type === 'internship' || p.type === 'stipend_internship').length}</p>
                    <p className="text-sm text-muted-foreground">Active Internships</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold">
                      {activePostings.filter(p => {
                        const endDate = new Date(p.applicationEndDate);
                        const now = new Date();
                        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        return daysLeft <= 7 && daysLeft > 0;
                      }).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Closing This Week</p>
                  </CardContent>
                </Card>
              </div>

              {/* Active Postings Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Active Postings List</CardTitle>
                    <CardDescription>All currently published job and internship opportunities</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('active-postings', 'csv')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('active-postings', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Application Deadline</TableHead>
                        <TableHead>Days Left</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePostings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No active postings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        activePostings.map((posting) => {
                          const endDate = new Date(posting.applicationEndDate);
                          const now = new Date();
                          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <TableRow key={posting.id}>
                              <TableCell className="font-medium max-w-xs truncate">{posting.title}</TableCell>
                              <TableCell>{posting.companyName}</TableCell>
                              <TableCell>
                                <Badge variant={posting.type === 'job' ? 'default' : 'secondary'}>
                                  {getPostingTypeLabel(posting.type)}
                                </Badge>
                              </TableCell>
                              <TableCell>{posting.roleName}</TableCell>
                              <TableCell className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {posting.location}
                              </TableCell>
                              <TableCell>{new Date(posting.applicationEndDate).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={daysLeft <= 3 ? 'destructive' : daysLeft <= 7 ? 'outline' : 'secondary'}
                                  className={daysLeft <= 3 ? '' : daysLeft <= 7 ? 'text-orange-600 border-orange-500' : ''}
                                >
                                  {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeModule === 'postings' && activeReport === 'posting-history' && (
            <div className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filter Posting History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <SearchableSelect
                      options={academicYearOptions}
                      value={postingYearFilter === 'all' ? '' : postingYearFilter}
                      onValueChange={(value) => setPostingYearFilter(value || 'all')}
                      placeholder="Academic Year"
                      searchPlaceholder="Search academic year..."
                      emptyMessage="No academic years found."
                      loadingMessage="Loading academic years..."
                      isLoading={academicYearQuery.isLoading}
                      clearable
                      buttonClassName="w-[180px]"
                      contentClassName="w-[min(28rem,calc(100vw-2rem))]"
                    />

                    <Select value={postingTypeFilter} onValueChange={setPostingTypeFilter} disabled={reportPostingTypesLoading}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Posting Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {reportPostingTypesEmpty ? (
                          <SelectItem value="__empty__" disabled>
                            No posting types defined
                          </SelectItem>
                        ) : (
                          reportPostingTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Posting-Type-wise Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Posting Type Summary</CardTitle>
                  <CardDescription>Postings grouped by posting type{postingYearFilter !== 'all' ? ` for ${postingYearFilter}` : ''}</CardDescription>
                </CardHeader>
                <CardContent>
                  {postingTypeSummary.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No postings for the selected filters.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Posting Type</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Draft</TableHead>
                          <TableHead className="text-center">Published</TableHead>
                          <TableHead className="text-center">Closed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {postingTypeSummary.map((row) => (
                          <TableRow key={row.type}>
                            <TableCell className="font-medium capitalize">{row.label}</TableCell>
                            <TableCell className="text-center font-bold">{row.total}</TableCell>
                            <TableCell className="text-center text-yellow-600">{row.draft}</TableCell>
                            <TableCell className="text-center text-green-600">{row.published}</TableCell>
                            <TableCell className="text-center text-muted-foreground">{row.closed}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* History Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Posting History</CardTitle>
                    <CardDescription>
                      {filteredPostingHistory.length} postings 
                      {postingYearFilter !== 'all' && ` for ${postingYearFilter}`}
                      {postingTypeFilter !== 'all' && ` (${postingTypeFilter})`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('posting-history', 'csv')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('posting-history', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Academic Year</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Published</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPostingHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No postings found for selected filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPostingHistory.map((posting) => (
                          <TableRow key={posting.id}>
                            <TableCell className="font-medium max-w-xs truncate">{posting.title}</TableCell>
                            <TableCell>{posting.companyName}</TableCell>
                            <TableCell>
                              <Badge variant={posting.type === 'job' ? 'default' : 'secondary'}>
                                {getPostingTypeLabel(posting.type)}
                              </Badge>
                            </TableCell>
                            <TableCell>{posting.academicYear}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={posting.status === 'published' ? 'default' : posting.status === 'draft' ? 'outline' : 'secondary'}
                                className={posting.status === 'draft' ? 'text-yellow-600 border-yellow-500' : ''}
                              >
                                {posting.status === 'draft' && <FileText className="h-3 w-3 mr-1" />}
                                {posting.status === 'published' && <Send className="h-3 w-3 mr-1" />}
                                {posting.status === 'closed' && <Archive className="h-3 w-3 mr-1" />}
                                {posting.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(posting.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>{posting.publishedAt ? new Date(posting.publishedAt).toLocaleDateString() : '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeModule === 'postings' && activeReport === 'posting-summary' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                      Placements (Jobs)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{postingSummaryData.jobs.total}</p>
                    <div className="flex gap-3 mt-2 text-sm">
                      <span className="text-yellow-600">{postingSummaryData.jobs.draft} Draft</span>
                      <span className="text-green-600">{postingSummaryData.jobs.published} Published</span>
                      <span className="text-muted-foreground">{postingSummaryData.jobs.closed} Closed</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      Internships
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{postingSummaryData.internships.total}</p>
                    <div className="flex gap-3 mt-2 text-sm">
                      <span className="text-yellow-600">{postingSummaryData.internships.draft} Draft</span>
                      <span className="text-green-600">{postingSummaryData.internships.published} Published</span>
                      <span className="text-muted-foreground">{postingSummaryData.internships.closed} Closed</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-green-600" />
                      Stipend Internships
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{postingSummaryData.stipendInternships.total}</p>
                    <div className="flex gap-3 mt-2 text-sm">
                      <span className="text-yellow-600">{postingSummaryData.stipendInternships.draft} Draft</span>
                      <span className="text-green-600">{postingSummaryData.stipendInternships.published} Published</span>
                      <span className="text-muted-foreground">{postingSummaryData.stipendInternships.closed} Closed</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Comparison Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Internship vs Placement Comparison</CardTitle>
                    <CardDescription>Breakdown by posting type and status</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('posting-summary', 'csv')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('posting-summary', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Draft</TableHead>
                        <TableHead className="text-center">Published</TableHead>
                        <TableHead className="text-center">Closed</TableHead>
                        <TableHead className="text-center">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-600" />
                          Placements (Jobs)
                        </TableCell>
                        <TableCell className="text-center font-bold">{postingSummaryData.jobs.total}</TableCell>
                        <TableCell className="text-center text-yellow-600">{postingSummaryData.jobs.draft}</TableCell>
                        <TableCell className="text-center text-green-600">{postingSummaryData.jobs.published}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{postingSummaryData.jobs.closed}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {postingSummaryData.total > 0 ? Math.round((postingSummaryData.jobs.total / postingSummaryData.total) * 100) : 0}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-purple-600" />
                          Internships
                        </TableCell>
                        <TableCell className="text-center font-bold">{postingSummaryData.internships.total}</TableCell>
                        <TableCell className="text-center text-yellow-600">{postingSummaryData.internships.draft}</TableCell>
                        <TableCell className="text-center text-green-600">{postingSummaryData.internships.published}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{postingSummaryData.internships.closed}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {postingSummaryData.total > 0 ? Math.round((postingSummaryData.internships.total / postingSummaryData.total) * 100) : 0}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Star className="h-4 w-4 text-green-600" />
                          Stipend Internships
                        </TableCell>
                        <TableCell className="text-center font-bold">{postingSummaryData.stipendInternships.total}</TableCell>
                        <TableCell className="text-center text-yellow-600">{postingSummaryData.stipendInternships.draft}</TableCell>
                        <TableCell className="text-center text-green-600">{postingSummaryData.stipendInternships.published}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{postingSummaryData.stipendInternships.closed}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {postingSummaryData.total > 0 ? Math.round((postingSummaryData.stipendInternships.total / postingSummaryData.total) * 100) : 0}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-center font-bold">{postingSummaryData.total}</TableCell>
                        <TableCell className="text-center">{postingStats.draft}</TableCell>
                        <TableCell className="text-center">{postingStats.published}</TableCell>
                        <TableCell className="text-center">{postingStats.closed}</TableCell>
                        <TableCell className="text-center">
                          <Badge>100%</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Year-wise Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Year-wise Distribution</CardTitle>
                  <CardDescription>Jobs vs Internships by academic year</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Academic Year</TableHead>
                        <TableHead className="text-center">Jobs</TableHead>
                        <TableHead className="text-center">Internships</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {postingSummaryData.byYear.map((yearData) => (
                        <TableRow key={yearData.year}>
                          <TableCell className="font-medium">{yearData.year}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-blue-600 border-blue-500">
                              {yearData.jobs}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-purple-600 border-purple-500">
                              {yearData.internships}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {yearData.jobs + yearData.internships}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Events & Campus Drives Reports */}
          {activeModule === 'events' && activeReport === 'event-attendance' && (
            <EventAttendanceReport />
          )}
          {activeModule === 'events' && activeReport === 'drive-completion' && (
            <DriveCompletionSummary />
          )}
          {activeModule === 'events' && activeReport === 'student-participation' && (
            <StudentParticipationHistory />
          )}

          {/* NOC & Documents Reports */}
          {activeModule === 'noc' && activeReport === 'pending-noc' && (
            <PendingNOCReport />
          )}
          {activeModule === 'noc' && activeReport === 'issued-noc' && (
            <IssuedNOCRegister />
          )}
          {activeModule === 'noc' && activeReport === 'noc-by-dept' && (
            <NOCByDepartmentReport />
          )}

          {/* Applications & ATS Reports */}
          {activeModule === 'ats' && activeReport === 'applicant-list' && (
            <ApplicantListReport />
          )}
          {activeModule === 'ats' && activeReport === 'stage-wise' && (
            <StageWiseReport />
          )}
          {activeModule === 'ats' && activeReport === 'shortlist-rejection' && (
            <ShortlistRejectionReport />
          )}

          {/* Offers & Joining Reports */}
          {activeModule === 'offers' && activeReport === 'offer-acceptance' && (
            <OfferAcceptanceSummary />
          )}
          {activeModule === 'offers' && activeReport === 'joining-status' && (
            <JoiningStatusSummary />
          )}
          {activeModule === 'offers' && activeReport === 'compliance' && (
            <ComplianceReport />
          )}

          {/* Internships & Stipends Reports */}
          {activeModule === 'internships' && activeReport === 'internship-status' && (
            <InternshipStatusSummary />
          )}
          {activeModule === 'internships' && activeReport === 'certificate-pending' && (
            <CertificatePendingReport />
          )}
          {activeModule === 'internships' && activeReport === 'company-internship' && (
            <CompanyInternshipSummary />
          )}

          {/* Portfolio Reports */}
          {activeModule === 'portfolio' && activeReport === 'portfolio-completion' && (
            <PortfolioCompletionReport />
          )}
          {activeModule === 'portfolio' && activeReport === 'published-portfolios' && (
            <PublishedPortfoliosReport />
          )}

          {/* Communication Reports */}
          {activeModule === 'communication' && activeReport === 'announcement-history' && (
            <AnnouncementHistoryReport />
          )}
          {activeModule === 'communication' && activeReport === 'consent-tracking' && (
            <ConsentTrackingReport />
          )}

          {/* Placement Analytics Reports */}
          {activeModule === 'placement-analytics' && activeReport === 'placement-cell' && (
            <PlacementCellReport />
          )}
          {activeModule === 'placement-analytics' && activeReport === 'placement-summary' && (
            <PlacementSummaryReport />
          )}
          {activeModule === 'placement-analytics' && activeReport === 'company-performance' && (
            <CompanyPerformanceReport />
          )}
          {activeModule === 'placement-analytics' && activeReport === 'offer-join-funnel' && (
            <OfferToJoinFunnelReport />
          )}
          {activeModule === 'placement-analytics' && activeReport === 'unplaced-students' && (
            <UnplacedStudentsReport />
          )}

          {/* New Reports (meeting sheet) — distributed under existing branches + a No Dues branch */}
          {activeModule === 'placement-analytics' && activeReport === 'placement-count' && <PlacementCountReport />}
          {activeModule === 'placement-analytics' && activeReport === 'placement-listing' && <PlacementListingReport />}
          {activeModule === 'noc' && activeReport === 'noc-count' && <InternshipNocCountReport />}
          {activeModule === 'noc' && activeReport === 'noc-listing' && <InternshipNocListingReport />}
          {activeModule === 'no-dues' && activeReport === 'no-dues-count' && <NoDuesCountReport />}
          {activeModule === 'no-dues' && activeReport === 'no-dues-listing' && <NoDuesListingReport />}
          {activeModule === 'ats' && activeReport === 'company-count' && <CompanyCountReport />}
          {activeModule === 'ats' && activeReport === 'company-stage' && <CompanyStageReport />}
        </div>
      </div>
    </DashboardLayout>
  );
}
