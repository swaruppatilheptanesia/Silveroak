import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Briefcase,
  Building2,
  Calendar,
  Edit,
  Globe,
  MessageSquare,
  Plus,
  ShieldCheck,
  ShieldX,
  Star,
  Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AddEngagementDialog from '@/components/employer/AddEngagementDialog';
import AddRecruiterDialog from '@/components/employer/AddRecruiterDialog';
import EditCompanyDialog from '@/components/employer/EditCompanyDialog';
import EditRecruiterDialog from '@/components/employer/EditRecruiterDialog';
import EngagementTimeline from '@/components/employer/EngagementTimeline';
import {
  useCompanyDetail,
  useEngagementsByCompany,
  useRecruitersByCompany,
  useVerifyRecruiter,
} from '@/hooks/use-employer-api';
import {
  formatRecruiterPhone,
  getCompanyClassificationLabel,
  getRecruiterInitials,
  getRecruiterVerificationLabel,
} from '@/lib/employerModule';
import { useToast } from '@/hooks/use-toast';
import type { ApiRecruiter } from '@/types/employer';

function getErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  return error instanceof Error ? error.message : fallback;
}

function CompanyDetailSkeleton() {
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

function getClassificationBadge(classification: 'preferred' | 'normal' | 'blacklisted') {
  if (classification === 'preferred') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <Star className="mr-1 h-3 w-3" />
        {getCompanyClassificationLabel(classification)}
      </Badge>
    );
  }

  if (classification === 'blacklisted') {
    return (
      <Badge variant="destructive">
        <Ban className="mr-1 h-3 w-3" />
        {getCompanyClassificationLabel(classification)}
      </Badge>
    );
  }

  return <Badge variant="secondary">{getCompanyClassificationLabel(classification)}</Badge>;
}

function getVerificationBadge(status: ApiRecruiter['verification_status']) {
  if (status === 'verified') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <ShieldCheck className="mr-1 h-3 w-3" />
        {getRecruiterVerificationLabel(status)}
      </Badge>
    );
  }

  if (status === 'rejected') {
    return (
      <Badge variant="destructive">
        <ShieldX className="mr-1 h-3 w-3" />
        {getRecruiterVerificationLabel(status)}
      </Badge>
    );
  }

  return <Badge variant="warning">{getRecruiterVerificationLabel(status)}</Badge>;
}

export default function CompanyDetail() {
  const { toast } = useToast();
  const { companyId = '' } = useParams();
  const navigate = useNavigate();
  const verifyRecruiter = useVerifyRecruiter();
  const [addRecruiterOpen, setAddRecruiterOpen] = useState(false);
  const [addEngagementOpen, setAddEngagementOpen] = useState(false);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [editRecruiterOpen, setEditRecruiterOpen] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState<ApiRecruiter | null>(null);
  const [pendingReviewAction, setPendingReviewAction] = useState<
    | { recruiter: ApiRecruiter; status: 'verified' | 'rejected' }
    | null
  >(null);

  const companyQuery = useCompanyDetail(companyId);
  const recruitersQuery = useRecruitersByCompany(companyId);
  const engagementsQuery = useEngagementsByCompany(companyId);

  const company = companyQuery.data;
  const recruiters = recruitersQuery.data ?? [];
  const engagements = engagementsQuery.data ?? [];

  const stats = useMemo(() => {
    return {
      recruiters: recruiters.length,
      placementPrograms: engagements.filter((engagement) => engagement.visitor_type === 'placement').length,
      internshipPrograms: engagements.filter((engagement) => engagement.visitor_type === 'internship').length,
      studentsHired: engagements.reduce((total, engagement) => total + (engagement.students_hired ?? 0), 0),
    };
  }, [engagements, recruiters.length]);

  async function handleReviewRecruiter(recruiter: ApiRecruiter, status: 'verified' | 'rejected') {
    setPendingReviewAction({ recruiter, status });
  }

  async function handleConfirmReviewRecruiter() {
    if (!pendingReviewAction) return;

    try {
      await verifyRecruiter.mutateAsync({
        recruiterId: pendingReviewAction.recruiter.id,
        data: { status: pendingReviewAction.status },
      });

      toast({
        title: pendingReviewAction.status === 'verified' ? 'Recruiter verified' : 'Recruiter rejected',
        description: `${pendingReviewAction.recruiter.name} has been marked as ${pendingReviewAction.status}.`,
      });
      setPendingReviewAction(null);
    } catch (error) {
      toast({
        title: 'Unable to update recruiter',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  if (companyQuery.isLoading) {
    return <CompanyDetailSkeleton />;
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Company not found</h2>
          <p className="mt-2 text-muted-foreground">The company you’re looking for could not be loaded.</p>
          <Button onClick={() => navigate('/admin/employers?tab=companies')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/employers?tab=companies')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
              {getClassificationBadge(company.classification)}
              <Badge variant={company.status === 'active' ? 'success' : 'secondary'}>
                {company.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{company.industry || 'No industry added'}</p>
          </div>
          <Button variant="outline" onClick={() => setEditCompanyOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Company
          </Button>
        </div>

        {companyQuery.error || recruitersQuery.error || engagementsQuery.error ? (
          <Alert variant="destructive">
            <Building2 className="h-4 w-4" />
            <AlertTitle>Some company data could not be loaded</AlertTitle>
            <AlertDescription>
              {getErrorMessage(companyQuery.error || recruitersQuery.error || engagementsQuery.error)}
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    {company.website ? (
                      <a href={company.website} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                        {company.website}
                      </a>
                    ) : (
                      <p className="font-medium">No website added</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{company.address || 'No address added'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-muted-foreground">Description</p>
                <p>{company.description || 'No description added yet.'}</p>
                {company.internal_remarks ? (
                  <div className="mt-4 rounded-lg bg-muted p-3">
                    <p className="text-sm text-muted-foreground">Internal Remarks</p>
                    <p className="text-sm">{company.internal_remarks}</p>
                  </div>
                ) : null}
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
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.placementPrograms}</p>
                <p className="text-sm text-muted-foreground">Placement Programs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.internshipPrograms}</p>
                <p className="text-sm text-muted-foreground">Internship Programs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.studentsHired}</p>
                <p className="text-sm text-muted-foreground">Students Hired</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="recruiters" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recruiters">Recruiters</TabsTrigger>
            <TabsTrigger value="engagement">Engagement History</TabsTrigger>
          </TabsList>

          <TabsContent value="recruiters">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recruiters ({recruiters.length})
                </CardTitle>
                <Button size="sm" onClick={() => setAddRecruiterOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Recruiter
                </Button>
              </CardHeader>
              <CardContent>
                {recruiters.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">No recruiters added yet</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddRecruiterOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Recruiter
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {recruiters.map((recruiter) => (
                      <div key={recruiter.id} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <span className="font-medium text-primary">{getRecruiterInitials(recruiter.name)}</span>
                            </div>
                            <div>
                              <p className="font-medium">{recruiter.name}</p>
                              <p className="text-sm text-muted-foreground">{recruiter.designation || 'No designation'}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 lg:items-end">
                            <div className="text-sm">
                              <p>{recruiter.email}</p>
                              <p className="text-muted-foreground">{formatRecruiterPhone(recruiter.phone)}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {getVerificationBadge(recruiter.verification_status)}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRecruiter(recruiter);
                                  setEditRecruiterOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              {recruiter.verification_status !== 'verified' ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleReviewRecruiter(recruiter, 'verified')}
                                  disabled={verifyRecruiter.isPending}
                                >
                                  Verify
                                </Button>
                              ) : null}
                              {recruiter.verification_status !== 'rejected' ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleReviewRecruiter(recruiter, 'rejected')}
                                  disabled={verifyRecruiter.isPending}
                                >
                                  Reject
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Engagement Timeline
                </CardTitle>
                <Button size="sm" onClick={() => setAddEngagementOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Engagement
                </Button>
              </CardHeader>
              <CardContent>
                <EngagementTimeline engagements={engagements} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AddRecruiterDialog
        open={addRecruiterOpen}
        onOpenChange={setAddRecruiterOpen}
        companyId={company.id}
        companyName={company.name}
      />
      <AddEngagementDialog
        open={addEngagementOpen}
        onOpenChange={setAddEngagementOpen}
        companyId={company.id}
      />
      <EditCompanyDialog
        open={editCompanyOpen}
        onOpenChange={setEditCompanyOpen}
        company={company}
      />
      <EditRecruiterDialog
        open={editRecruiterOpen}
        onOpenChange={setEditRecruiterOpen}
        recruiter={selectedRecruiter}
      />

      <ConfirmActionDialog
        open={Boolean(pendingReviewAction)}
        onOpenChange={(open) => {
          if (!open) setPendingReviewAction(null);
        }}
        title={
          pendingReviewAction?.status === 'verified'
            ? `Verify ${pendingReviewAction.recruiter.name}?`
            : `Reject ${pendingReviewAction?.recruiter.name ?? 'recruiter'}?`
        }
        description={
          pendingReviewAction?.status === 'verified'
            ? 'This will mark the recruiter as verified in the live registry.'
            : 'This will mark the recruiter as rejected in the live registry.'
        }
        confirmLabel={pendingReviewAction?.status === 'verified' ? 'Verify Recruiter' : 'Reject Recruiter'}
        confirmVariant={pendingReviewAction?.status === 'rejected' ? 'destructive' : 'default'}
        isPending={verifyRecruiter.isPending}
        onConfirm={handleConfirmReviewRecruiter}
      />
    </DashboardLayout>
  );
}
