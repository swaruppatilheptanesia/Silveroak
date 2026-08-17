import { Link } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Clock, 
  FileText, 
  CheckCircle,
  ArrowRight,
  ListFilter,
  Briefcase,
  TrendingUp,
  Building2,
  Gift,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDashboardStats, usePlacementStats } from '@/hooks/use-report-api';
import { useCompanies } from '@/hooks/use-employer-api';
import { useOffers } from '@/hooks/use-offer-api';
import { usePostings } from '@/hooks/use-posting-api';
import { useInternships } from '@/hooks/use-internship-api';
import { useAdminRecentInterestRegistrations, useAdminStudents } from '@/hooks/use-admin-api';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import { formatDate } from '@/lib/formatters';
import type { InterestRegistrationStatus } from '@/types/admin';

const INTEREST_STATUS_META: Record<
  InterestRegistrationStatus,
  { label: string; variant: 'success' | 'warning' | 'secondary' }
> = {
  approved: { label: 'Approved', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  withdrawn: { label: 'Withdrawn', variant: 'secondary' },
};

export default function AdminDashboard() {
  const dashboardQuery = useDashboardStats();
  const placementQuery = usePlacementStats();
  const acceptedJobOffersQuery = useOffers({ page: 1, limit: 1, status: 'accepted', type: 'job' });
  const acceptedInternshipOffersQuery = useOffers({ page: 1, limit: 1, status: 'accepted', type: 'internship' });
  const activeCompaniesQuery = useCompanies({ page: 1, limit: 1, status: 'active' });
  const activePostingsQuery = usePostings({ page: 1, limit: 1, status: 'published' });
  const ongoingInternshipsQuery = useInternships({ page: 1, limit: 1, status: 'ongoing' });
  const pendingStudentsQuery = useAdminStudents({
    verification_status: 'pending',
    page: 1,
    limit: 3,
    sort_by: 'updated_at',
    sort_order: 'desc',
  });
  const recentInterestQuery = useAdminRecentInterestRegistrations();

  const stats = dashboardQuery.data;
  const placementStats = placementQuery.data;
  const totalStudents = stats?.students.total ?? 0;
  const totalOffers = stats?.offers.total ?? 0;
  const acceptedOffers = stats?.offers.accepted ?? 0;
  const applicationCount = stats?.applications.total ?? 0;
  const activePostings = stats?.postings.active ?? 0;
  const totalPostings = stats?.postings.total ?? 0;
  const eventsTotal = stats?.events.total ?? 0;
  const jobPlacements = acceptedJobOffersQuery.data?.pagination.total ?? 0;
  const internshipPlacements = acceptedInternshipOffersQuery.data?.pagination.total ?? 0;
  const activeCompanies = activeCompaniesQuery.data?.pagination.total ?? 0;
  const activeDrives = activePostingsQuery.data?.pagination.total ?? 0;
  const ongoingInternships = ongoingInternshipsQuery.data?.pagination.total ?? 0;
  const placedCount = placementStats?.placed ?? jobPlacements + internshipPlacements;
  const unplacedCount = placementStats?.unplaced ?? 0;
  const placementRate = totalStudents > 0 ? (placedCount / totalStudents) * 100 : 0;
  const offerAcceptanceRate = totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0;
  const recentPending = pendingStudentsQuery.data?.data ?? [];
  const pendingVerificationCount = pendingStudentsQuery.data?.pagination.total ?? 0;
  const recentInterestRegistrations = recentInterestQuery.data ?? [];

  return (
    <DashboardLayout 
      title="TPO Admin Dashboard" 
      subtitle="Placement operations overview and key performance highlights"
    >
      {/* Placement KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Job Placements</p>
                <p className="text-2xl font-bold text-emerald-600">{jobPlacements}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Internship Placements</p>
                <p className="text-2xl font-bold text-blue-600">{internshipPlacements}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Offers Released</p>
                <p className="text-2xl font-bold text-primary">{totalOffers}</p>
                <p className="text-[10px] text-muted-foreground">{acceptedOffers} accepted</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Gift className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Companies</p>
                <p className="text-2xl font-bold">{activeCompanies}</p>
                <p className="text-[10px] text-muted-foreground">
                  {stats?.companies.total ?? 0} total • {activeDrives} active drives
                </p>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unplaced</p>
                <p className="text-2xl font-bold text-amber-600">{unplacedCount}</p>
                <Link to="/admin/reports" className="text-[10px] text-primary hover:underline">View report →</Link>
              </div>
              <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placement & Join Rate Bars */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Placement Rate</span>
              <span className="text-sm font-bold">{placementRate.toFixed(1)}%</span>
            </div>
            <Progress value={placementRate} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {placedCount} of {totalStudents} students placed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Offer Acceptance Rate</span>
              <span className="text-sm font-bold">{offerAcceptanceRate.toFixed(1)}%</span>
            </div>
            <Progress value={offerAcceptanceRate} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {acceptedOffers} accepted out of {totalOffers} offers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/admin/students">
                <UserCheck className="h-5 w-5" />
                <span className="text-sm">Verify Students</span>
                {pendingVerificationCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{pendingVerificationCount} pending</Badge>
                )}
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/admin/reports">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm">Reports</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/admin/policies">
                <FileText className="h-5 w-5" />
                <span className="text-sm">Policies</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/admin/interests">
                <ListFilter className="h-5 w-5" />
                <span className="text-sm">Interest Lists</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending Verifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Pending Verifications</CardTitle>
              <CardDescription>Students awaiting profile verification</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/students">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPending.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p>All students verified!</p>
                </div>
              ) : (
                recentPending.map((student) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground">{student.roll_number} • {student.department}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <Clock className="h-3 w-3 mr-1" /> Pending
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Interest Registrations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Interest Registrations</CardTitle>
              <CardDescription>10 most recent registrations</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/interests">
                Generate Lists <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentInterestRegistrations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No registrations yet.</p>
            ) : (
              <div className="space-y-3">
                {recentInterestRegistrations.map((registration) => {
                  const statusMeta = INTEREST_STATUS_META[registration.status];
                  return (
                    <div key={registration.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {registration.student_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatPostingTypeLabel(registration.interest_type)} · {formatDate(registration.registered_at)}
                        </p>
                      </div>
                      {statusMeta && (
                        <Badge variant={statusMeta.variant} className="shrink-0">
                          {statusMeta.label}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Live Platform Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Applications</span>
                <span className="text-sm font-medium">{applicationCount}</span>
              </div>
              <Progress value={totalStudents > 0 ? Math.min(100, (applicationCount / totalStudents) * 100) : 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">Current application activity across the placement cycle</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Active Postings</span>
                <span className="text-sm font-medium">{activePostings}</span>
              </div>
              <Progress value={totalPostings > 0 ? (activePostings / totalPostings) * 100 : 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {ongoingInternships} ongoing internships alongside active drive posting data
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Events</span>
                <span className="text-sm font-medium">{eventsTotal}</span>
              </div>
              <Progress value={eventsTotal > 0 ? 100 : 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">Total active events and drives in the current cycle</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
