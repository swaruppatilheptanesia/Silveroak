import {
  Building2,
  Briefcase,
  Calendar,
  Globe,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EngagementTimeline from '@/components/employer/EngagementTimeline';
import { useRecruiterCompany } from '@/hooks/use-recruiter-api';
import {
  formatRecruiterPhone,
  getCompanyClassificationLabel,
  getRecruiterInitials,
  getRecruiterVerificationLabel,
} from '@/lib/employerModule';

function getErrorMessage(error: unknown, fallback = 'Unable to load company details.') {
  return error instanceof Error ? error.message : fallback;
}

function RecruiterCompanySkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 bg-muted" />
        <Skeleton className="h-40 w-full bg-muted" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-24 w-full bg-muted" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function RecruiterCompanyView() {
  const companyQuery = useRecruiterCompany();

  if (companyQuery.isLoading) {
    return <RecruiterCompanySkeleton />;
  }

  if (companyQuery.error || !companyQuery.data) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <Building2 className="h-4 w-4" />
          <AlertTitle>Unable to load company profile</AlertTitle>
          <AlertDescription>{getErrorMessage(companyQuery.error)}</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const { company, recruiters, engagements, stats } = companyQuery.data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
            {company.classification === 'preferred' ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <Star className="mr-1 h-3 w-3" />
                {getCompanyClassificationLabel(company.classification)}
              </Badge>
            ) : null}
            <Badge variant={company.status === 'active' ? 'success' : 'secondary'}>{company.status}</Badge>
          </div>
          <p className="text-muted-foreground">{company.industry || 'No industry added'}</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{company.address || 'No address added'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    {company.website ? (
                      <a href={company.website} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                        {company.website}
                      </a>
                    ) : (
                      <p className="font-medium">No website published</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-muted-foreground">About</p>
                <p>{company.description || 'No company description added yet.'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.recruiters}</p>
                <p className="text-sm text-muted-foreground">Recruiters</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.engagements}</p>
                <p className="text-sm text-muted-foreground">Engagements</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.postings}</p>
                <p className="text-sm text-muted-foreground">Postings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.offers}</p>
                <p className="text-sm text-muted-foreground">Offers</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="team" className="space-y-4">
          <TabsList>
            <TabsTrigger value="team">Our Team</TabsTrigger>
            <TabsTrigger value="history">Engagement History</TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recruiters from {company.name}
                </CardTitle>
                <CardDescription>Registered company team members visible in the recruiter portal.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {recruiters.map((recruiter) => (
                    <div key={recruiter.id} className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <span className="font-medium text-primary">{getRecruiterInitials(recruiter.name)}</span>
                        </div>
                        <div>
                          <p className="font-medium">{recruiter.name}</p>
                          <p className="text-sm text-muted-foreground">{recruiter.designation || 'No designation'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 md:items-end">
                        <div className="text-sm">
                          <p>{recruiter.email}</p>
                          <p className="text-muted-foreground">{formatRecruiterPhone(recruiter.phone)}</p>
                        </div>
                        <Badge variant={recruiter.verification_status === 'verified' ? 'success' : recruiter.verification_status === 'pending' ? 'warning' : 'destructive'}>
                          {getRecruiterVerificationLabel(recruiter.verification_status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Engagement Timeline
                </CardTitle>
                <CardDescription>Past campus visits, placement drives, internships, and related interactions.</CardDescription>
              </CardHeader>
              <CardContent>
                <EngagementTimeline engagements={engagements} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
