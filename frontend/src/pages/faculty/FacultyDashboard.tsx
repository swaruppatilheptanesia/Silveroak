import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/shared/PageLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Building2, CheckCircle, GraduationCap, Gift, UserCheck, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFacultyDashboard } from '@/hooks/use-faculty-api';
import { formatCGPA, formatRelativeTime, getInitials } from '@/lib/formatters';

function percentage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export default function FacultyDashboard() {
  const { user } = useAuth();
  const dashboardQuery = useFacultyDashboard();
  const dashboard = dashboardQuery.data;
  const departmentStats = dashboard?.departmentStats;
  const recentStudents = dashboard?.recentStudents ?? [];

  if (dashboardQuery.isLoading && !dashboard) {
    return (
      <DashboardLayout
        title="Faculty Coordinator Dashboard"
        subtitle={user?.department || 'Loading department dashboard'}
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Faculty Coordinator Dashboard" 
      subtitle={departmentStats?.department || user?.department || 'Faculty department view'}
    >
      {dashboardQuery.error && (
        <Card className="mb-6 border-destructive/30">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{dashboardQuery.error instanceof Error ? dashboardQuery.error.message : 'Unable to load dashboard data.'}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentStats?.totalStudents ?? 0}</div>
            <p className="text-xs text-muted-foreground">In your department</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profiles Complete</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentStats?.profilesComplete ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {percentage(departmentStats?.profilesComplete ?? 0, departmentStats?.totalStudents ?? 0)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible Students</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentStats?.eligibleForPlacements ?? 0}</div>
            <p className="text-xs text-muted-foreground">Ready for placements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Offer Released</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentStats?.offersReleased ?? 0}</div>
            <p className="text-xs text-muted-foreground">Offers extended to your students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentStats?.accepted ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {percentage(departmentStats?.accepted ?? 0, departmentStats?.eligibleForPlacements ?? 0)}% acceptance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Join</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentStats?.joined ?? 0}</div>
            <p className="text-xs text-muted-foreground">Confirmed joinings</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Students */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Student Profiles</CardTitle>
          <CardDescription>Latest student activity in your department (Read-only access)</CardDescription>
        </CardHeader>
        <CardContent>
          {recentStudents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No recent student profile updates were found for this department.
            </div>
          ) : (
            <div className="space-y-4">
              {recentStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium text-primary">
                        {getInitials(student.name)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.rollNumber}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-right text-sm font-medium">CGPA: {formatCGPA(student.cgpa, '—')}</p>
                    <p className="text-right text-xs text-muted-foreground">
                      Updated {formatRelativeTime(student.updated_at)}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      student.status === 'eligible' ? 'default' : 
                      student.status === 'conditional' ? 'secondary' : 'destructive'
                    }
                  >
                    {student.status === 'eligible' ? 'Eligible' : 
                     student.status === 'conditional' ? 'Conditional' : 'Not Eligible'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Read-only Notice */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Read-Only Access</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                As a Faculty Coordinator, you have read-only access to view student profiles in your department. 
                Contact the TPO Admin for any modifications or verification actions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
