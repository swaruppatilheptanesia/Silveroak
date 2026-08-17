import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle,
  Clock,
  FileCheck,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecruiterDashboard } from '@/hooks/use-recruiter-api';
import { getRecruiterVerificationLabel } from '@/lib/employerModule';
import type { RecruiterVerificationStatus } from '@/types/recruiter';

function getErrorMessage(error: unknown, fallback = 'Unable to load recruiter dashboard.') {
  return error instanceof Error ? error.message : fallback;
}

function getVerificationBadge(status: RecruiterVerificationStatus) {
  if (status === 'verified') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="mr-1 h-3 w-3" />
        {getRecruiterVerificationLabel(status)}
      </Badge>
    );
  }

  if (status === 'rejected') {
    return (
      <Badge variant="destructive">
        <ShieldAlert className="mr-1 h-3 w-3" />
        {getRecruiterVerificationLabel(status)}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-yellow-600 text-yellow-600">
      <Clock className="mr-1 h-3 w-3" />
      {getRecruiterVerificationLabel(status)}
    </Badge>
  );
}

function RecruiterDashboardSkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 bg-muted" />
        <Skeleton className="h-32 w-full bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 w-full bg-muted" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const dashboardQuery = useRecruiterDashboard();

  if (dashboardQuery.isLoading) {
    return <RecruiterDashboardSkeleton />;
  }

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <Building2 className="h-4 w-4" />
          <AlertTitle>Unable to load recruiter dashboard</AlertTitle>
          <AlertDescription>{getErrorMessage(dashboardQuery.error)}</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const { recruiter, company, stats } = dashboardQuery.data;
  const isVerified = recruiter.verification_status === 'verified';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome, {recruiter.name}</h1>
            <p className="text-muted-foreground">Recruiter Portal for {company.name}</p>
          </div>
          {getVerificationBadge(recruiter.verification_status)}
        </div>

        {!isVerified ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>Account access is limited</AlertTitle>
            <AlertDescription>
              Your recruiter account is currently {getRecruiterVerificationLabel(recruiter.verification_status).toLowerCase()}.
              You can review company details and update your profile, but the placement office controls verification.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{company.name}</CardTitle>
                  <CardDescription>{company.industry || 'No industry added'}</CardDescription>
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate('/recruiter/company')}>
                View Company
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {company.website ? (
                <a href={company.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {company.website}
                </a>
              ) : (
                'No website published yet.'
              )}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active_postings}</p>
                <p className="text-sm text-muted-foreground">Active Postings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_applications}</p>
                <p className="text-sm text-muted-foreground">Applications</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_offers}</p>
                <p className="text-sm text-muted-foreground">Offers Released</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Use the live recruiter module to manage your company context and hiring view.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="h-auto justify-start p-4" onClick={() => navigate('/recruiter/profile')}>
                <Users className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">My Profile</p>
                  <p className="text-sm text-muted-foreground">Update your contact details</p>
                </div>
              </Button>
              <Button variant="outline" className="h-auto justify-start p-4" onClick={() => navigate('/recruiter/company')}>
                <Building2 className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Company Overview</p>
                  <p className="text-sm text-muted-foreground">See your team and engagement history</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => navigate('/recruiter/pipeline')}
                disabled={!isVerified}
              >
                <Briefcase className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Recruitment Pipeline</p>
                  <p className="text-sm text-muted-foreground">Review live postings and applicants</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
