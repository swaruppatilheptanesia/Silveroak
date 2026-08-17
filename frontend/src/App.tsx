import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ThemeProvider } from "next-themes";
import { TenantProvider } from "@/config/tenant";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageLoader } from "@/components/shared/PageLoader";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

// Auth Pages
const Login = lazy(() => import("./pages/Login"));

// Student Pages (lazy)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const StudentAccessGate = lazy(() => import("./pages/StudentAccessGate"));
const StudentPolicyGate = lazy(() => import("./pages/StudentPolicyGate"));
const Resumes = lazy(() => import("./pages/Resumes"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const PolicyAcceptance = lazy(() => import("./pages/PolicyAcceptance"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const OpportunityDetail = lazy(() => import("./pages/OpportunityDetail"));
const MyApplications = lazy(() => import("./pages/MyApplications"));
const NOCDashboard = lazy(() => import("./pages/NOCDashboard"));
const NocCertificate = lazy(() => import("./pages/NocCertificate"));
const StudentDrives = lazy(() => import("./pages/StudentDrives"));
const StudentAnnouncements = lazy(() => import("./pages/StudentAnnouncements"));
const NoDuesCertificate = lazy(() => import("./pages/NoDuesCertificate"));
const StudentCirculars = lazy(() => import("./pages/StudentCirculars"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin Pages (lazy)
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const StudentHub = lazy(() => import("./pages/admin/StudentHub"));
const EmployerHub = lazy(() => import("./pages/admin/EmployerHub"));
const ReportsAnalytics = lazy(() => import("./pages/admin/ReportsAnalytics"));
const MasterDataManagement = lazy(() => import("./pages/admin/MasterDataManagement"));
const CompanyDetail = lazy(() => import("./pages/admin/CompanyDetail"));
const PostingsManagement = lazy(() => import("./pages/admin/PostingsManagement"));
const PostingDetail = lazy(() => import("./pages/admin/PostingDetail"));
const CreatePosting = lazy(() => import("./pages/admin/CreatePosting"));
const EditPosting = lazy(() => import("./pages/admin/EditPosting"));
const InterestLists = lazy(() => import("./pages/admin/InterestLists"));
const ApplicationsManagement = lazy(() => import("./pages/admin/ApplicationsManagement"));
const ApplicationPipeline = lazy(() => import("./pages/admin/ApplicationPipeline"));
const AdminNOCManagement = lazy(() => import("./pages/admin/AdminNOCManagement"));
const DrivesManagement = lazy(() => import("./pages/admin/DrivesManagement"));
const OffersManagement = lazy(() => import("./pages/admin/OffersManagement"));
const InternshipsManagement = lazy(() => import("./pages/admin/InternshipsManagement"));
const AnnouncementManagement = lazy(() => import("./pages/admin/AnnouncementManagement"));
const PolicyRepository = lazy(() => import("./pages/admin/PolicyRepository"));
const CircularsManagement = lazy(() => import("./pages/admin/CircularsManagement"));
const CreateCircularTemplate = lazy(() => import("./pages/admin/CreateCircularTemplate"));
const NoDuesManagement = lazy(() => import("./pages/admin/NoDuesManagement"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));

// Faculty Coordinator Pages (lazy)
const FacultyDashboard = lazy(() => import("./pages/faculty/FacultyDashboard"));
const DepartmentStudents = lazy(() => import("./pages/faculty/DepartmentStudents"));
const FacultyPrograms = lazy(() => import("./pages/faculty/FacultyPrograms"));
const EmployerDirectory = lazy(() => import("./pages/faculty/EmployerDirectory"));
const FacultyNOCApprovals = lazy(() => import("./pages/faculty/FacultyNOCApprovals"));
const FacultyDrives = lazy(() => import("./pages/faculty/FacultyDrives"));
const FacultyOffers = lazy(() => import("./pages/faculty/FacultyOffers"));
const FacultyInternships = lazy(() => import("./pages/faculty/FacultyInternships"));
const FacultyAnnouncements = lazy(() => import("./pages/faculty/FacultyAnnouncements"));
const FacultyCirculars = lazy(() => import("./pages/faculty/FacultyCirculars"));
const FacultyProfile = lazy(() => import("./pages/faculty/FacultyProfile"));

// Recruiter Pages (lazy)
const RecruiterDashboard = lazy(() => import("./pages/recruiter/RecruiterDashboard"));
const RecruiterProfile = lazy(() => import("./pages/recruiter/RecruiterProfile"));
const RecruiterCompanyView = lazy(() => import("./pages/recruiter/RecruiterCompanyView"));
const RecruitmentPipeline = lazy(() => import("./pages/recruiter/RecruitmentPipeline"));
const RecruiterDrives = lazy(() => import("./pages/recruiter/RecruiterDrives"));
const RecruiterInternships = lazy(() => import("./pages/recruiter/RecruiterInternships"));

// Super Admin Pages (lazy)
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/SuperAdminDashboard"));
const SuperAdminProfile = lazy(() => import("./pages/superadmin/SuperAdminProfile"));

// Management Pages (lazy)
const ManagementProfile = lazy(() => import("./pages/management/ManagementProfile"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TenantProvider>
        <TooltipProvider>
          <AuthProvider>
            <RoleProvider>
              <ErrorBoundary>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/login" element={<Login />} />

                      {/* Student Routes */}
                      <Route path="/student/policy-gate" element={<ProtectedRoute allowedRoles={['student']}><StudentPolicyGate /></ProtectedRoute>} />
                      <Route path="/student/access" element={<ProtectedRoute allowedRoles={['student']}><StudentAccessGate /></ProtectedRoute>} />
                      <Route path="/" element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute allowedRoles={['student']}><Profile /></ProtectedRoute>} />
                      <Route path="/resumes" element={<ProtectedRoute allowedRoles={['student']}><Resumes /></ProtectedRoute>} />
                      <Route path="/opportunities" element={<ProtectedRoute allowedRoles={['student']}><Opportunities /></ProtectedRoute>} />
                      <Route path="/opportunities/:opportunityId" element={<ProtectedRoute allowedRoles={['student']}><OpportunityDetail /></ProtectedRoute>} />
                      <Route path="/applications" element={<ProtectedRoute allowedRoles={['student']}><MyApplications /></ProtectedRoute>} />
                      <Route path="/noc" element={<ProtectedRoute allowedRoles={['student']}><NOCDashboard /></ProtectedRoute>} />
                      <Route path="/noc/certificate/:nocId" element={<ProtectedRoute allowedRoles={['student']}><NocCertificate /></ProtectedRoute>} />
                      <Route path="/drives" element={<ProtectedRoute allowedRoles={['student']}><StudentDrives /></ProtectedRoute>} />
                      <Route path="/portfolio" element={<ProtectedRoute allowedRoles={['student']}><Portfolio /></ProtectedRoute>} />
                      <Route path="/policy" element={<ProtectedRoute allowedRoles={['student']}><PolicyAcceptance /></ProtectedRoute>} />
                      <Route path="/announcements" element={<ProtectedRoute allowedRoles={['student']}><StudentAnnouncements /></ProtectedRoute>} />
                      <Route path="/no-dues" element={<ProtectedRoute allowedRoles={['student']}><NoDuesCertificate /></ProtectedRoute>} />
                      <Route path="/circulars" element={<ProtectedRoute allowedRoles={['student']}><StudentCirculars /></ProtectedRoute>} />

                      {/* Admin Routes */}
                      <Route path="/admin" element={<ProtectedRoute allowedRoles={['tpo_admin']}><AdminDashboard /></ProtectedRoute>} />
                      <Route
                        path="/admin/students"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin']}
                            requiredAnyPermissions={[
                              { module: 'students', action: 'view' },
                              { module: 'student_verification', action: 'view' },
                              { module: 'eligibility_rules', action: 'view' },
                              { module: 'portfolios', action: 'view' },
                              { module: 'selection_database', action: 'view' },
                            ]}
                          >
                            <StudentHub />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/employers"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredAnyPermissions={[
                              { module: 'companies', action: 'view' },
                              { module: 'recruiters', action: 'view' },
                            ]}
                          >
                            <EmployerHub />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/companies/:companyId"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'companies', action: 'view' }}
                          >
                            <CompanyDetail />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/masters"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin']}
                            requiredPermission={{ module: 'masters', action: 'view' }}
                          >
                            <MasterDataManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/reports"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'reports', action: 'view' }}
                          >
                            <ReportsAnalytics />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/postings"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'postings', action: 'view' }}
                          >
                            <PostingsManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/postings/create"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'postings', action: 'create' }}
                          >
                            <CreatePosting />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/postings/:postingId"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'postings', action: 'view' }}
                          >
                            <PostingDetail />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/postings/:postingId/edit"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'postings', action: 'edit' }}
                          >
                            <EditPosting />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/interests"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin']}
                            requiredPermission={{ module: 'interest_lists', action: 'view' }}
                          >
                            <InterestLists />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/applications"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'applications', action: 'view' }}
                          >
                            <ApplicationsManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/applications/:postingId"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'applications', action: 'view' }}
                          >
                            <ApplicationPipeline />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/noc"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'noc_requests', action: 'view' }}
                          >
                            <AdminNOCManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/drives"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'events', action: 'view' }}
                          >
                            <DrivesManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/offers"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'offers', action: 'view' }}
                          >
                            <OffersManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/internships"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'internships', action: 'view' }}
                          >
                            <InternshipsManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/announcements"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'announcements', action: 'view' }}
                          >
                            <AnnouncementManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/policies"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin']}
                            requiredPermission={{ module: 'policies', action: 'view' }}
                          >
                            <PolicyRepository />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/circulars"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'circulars', action: 'view' }}
                          >
                            <CircularsManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/circulars/templates/create"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'circulars', action: 'create' }}
                          >
                            <CreateCircularTemplate />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/circulars/templates/:templateId/edit"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'circulars', action: 'edit' }}
                          >
                            <CreateCircularTemplate />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/no-dues"
                        element={
                          <ProtectedRoute
                            allowedRoles={['tpo_admin', 'tpo_employee']}
                            requiredPermission={{ module: 'no_dues', action: 'view' }}
                          >
                            <NoDuesManagement />
                          </ProtectedRoute>
                        }
                      />

                      {/* Faculty Coordinator Routes */}
                      <Route path="/faculty" element={<ProtectedRoute allowedRoles={['faculty_coordinator']}><FacultyDashboard /></ProtectedRoute>} />
                      <Route path="/faculty/students" element={<ProtectedRoute allowedRoles={['faculty_coordinator']}><DepartmentStudents /></ProtectedRoute>} />
                      <Route path="/faculty/programs" element={<ProtectedRoute allowedRoles={['faculty_coordinator']}><FacultyPrograms /></ProtectedRoute>} />
                      <Route path="/faculty/employers" element={<ProtectedRoute allowedRoles={['faculty_coordinator']}><EmployerDirectory /></ProtectedRoute>} />
                      <Route path="/faculty/noc-approvals" element={<ProtectedRoute allowedRoles={['faculty_coordinator']}><FacultyNOCApprovals /></ProtectedRoute>} />
                      <Route path="/faculty/drives" element={<ProtectedRoute allowedRoles={['faculty_coordinator']}><FacultyDrives /></ProtectedRoute>} />
                      <Route path="/faculty/offers" element={<ProtectedRoute allowedRoles={['faculty_coordinator']}><FacultyOffers /></ProtectedRoute>} />
                      <Route path="/faculty/internships" element={<ProtectedRoute allowedRoles={['faculty_coordinator']}><FacultyInternships /></ProtectedRoute>} />
                      <Route path="/faculty/announcements" element={<ProtectedRoute allowedRoles={['faculty_coordinator']}><FacultyAnnouncements /></ProtectedRoute>} />
                      <Route path="/faculty/circulars" element={<ProtectedRoute allowedRoles={['faculty_coordinator']}><FacultyCirculars /></ProtectedRoute>} />

                      {/* Recruiter Routes */}
                      <Route path="/recruiter" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterDashboard /></ProtectedRoute>} />
                      <Route path="/recruiter/profile" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterProfile /></ProtectedRoute>} />
                      <Route path="/recruiter/company" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterCompanyView /></ProtectedRoute>} />
                      <Route path="/recruiter/pipeline" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruitmentPipeline /></ProtectedRoute>} />
                      <Route
                        path="/recruiter/drives"
                        element={
                          <ProtectedRoute
                            allowedRoles={['recruiter']}
                            requiredPermission={{ module: 'events', action: 'view' }}
                          >
                            <RecruiterDrives />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/recruiter/internships"
                        element={
                          <ProtectedRoute
                            allowedRoles={['recruiter']}
                            requiredPermission={{ module: 'internships', action: 'view' }}
                          >
                            <RecruiterInternships />
                          </ProtectedRoute>
                        }
                      />

                      {/* Super Admin Routes */}
                      <Route path="/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
                      <Route path="/super-admin/profile" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminProfile /></ProtectedRoute>} />

                      {/* Account Profile Routes (per role) */}
                      <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={['tpo_admin', 'tpo_employee']}><AdminProfile /></ProtectedRoute>} />
                      <Route path="/faculty/profile" element={<ProtectedRoute allowedRoles={['faculty_coordinator']}><FacultyProfile /></ProtectedRoute>} />
                      <Route path="/management/profile" element={<ProtectedRoute allowedRoles={['management']}><ManagementProfile /></ProtectedRoute>} />

                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </ErrorBoundary>
            </RoleProvider>
          </AuthProvider>
        </TooltipProvider>
      </TenantProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
