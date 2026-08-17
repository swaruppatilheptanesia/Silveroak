import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { formatDatePattern } from '@/lib/formatters';
import {
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  FileCheck,
  MapPin,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { recruiterKeys, useCompanyPostings, useRecruiterDashboard } from '@/hooks/use-recruiter-api';
import { recruiterService } from '@/services/recruiterService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useClientSort } from '@/hooks/use-client-sort';
import { Skeleton } from '@/components/ui/skeleton';
import { APPLICATION_STAGE_CONFIG } from '@/types/application';
import type { RecruiterApplication, RecruiterPosting } from '@/types/recruiter';

function getErrorMessage(error: unknown, fallback = 'Unable to load recruitment data.') {
  return error instanceof Error ? error.message : fallback;
}

function RecruitmentPipelineSkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 bg-muted" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-24 w-full bg-muted" />
          ))}
        </div>
        <Skeleton className="h-12 w-full bg-muted" />
      </div>
    </DashboardLayout>
  );
}

function getStageLabel(stage: string) {
  const config = APPLICATION_STAGE_CONFIG[stage as keyof typeof APPLICATION_STAGE_CONFIG];
  return config?.label ?? stage.replace(/_/g, ' ');
}

function getStageBadge(stage: string) {
  const config = APPLICATION_STAGE_CONFIG[stage as keyof typeof APPLICATION_STAGE_CONFIG];
  if (!config) return <Badge variant="outline">{getStageLabel(stage)}</Badge>;
  return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
}

function getPostingTypeBadge(posting: RecruiterPosting) {
  if (posting.type === 'job') return <Badge variant="info">Placement</Badge>;
  if (posting.type === 'internship') return <Badge variant="secondary">Internship</Badge>;
  return <Badge variant="outline">{posting.type}</Badge>;
}

function getPostingCompensation(posting: RecruiterPosting) {
  return posting.ctc || posting.stipend || 'Not specified';
}

function PostingApplicantsTable({
  applications,
  onView,
}: {
  applications: RecruiterApplication[];
  onView: (application: RecruiterApplication) => void;
}) {
  const { sorted, sort_by, sort_order, onSort } = useClientSort(applications, {
    candidate: (a) => a.student.full_name,
    department: (a) => a.student.department,
    stage: (a) => a.current_stage,
    applied: (a) => new Date(a.applied_at),
  });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead label="Candidate" columnKey="candidate" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
            <SortableTableHead label="Department" columnKey="department" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
            <SortableTableHead label="Stage" columnKey="stage" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
            <SortableTableHead label="Applied" columnKey="applied" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((application) => (
            <TableRow key={application.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{application.student.full_name}</p>
                  <p className="text-sm text-muted-foreground">{application.student.enrollment_number}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p>{application.student.department}</p>
                  <p className="text-muted-foreground">Batch {application.student.batch}</p>
                </div>
              </TableCell>
              <TableCell>{getStageBadge(application.current_stage)}</TableCell>
              <TableCell>{formatDatePattern(application.applied_at, 'dd MMM yyyy')}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => onView(application)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function RecruitmentPipeline() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [expandedPostings, setExpandedPostings] = useState<Set<string>>(new Set());
  const [selectedApplication, setSelectedApplication] = useState<RecruiterApplication | null>(null);

  const dashboardQuery = useRecruiterDashboard();
  const recruiter = dashboardQuery.data?.recruiter;
  const companyId = recruiter?.verification_status === 'verified' ? (dashboardQuery.data?.company.id ?? '') : '';
  const postingsQuery = useCompanyPostings(companyId);
  const postings = postingsQuery.data ?? [];

  const applicationQueries = useQueries({
    queries: postings.map((posting) => ({
      queryKey: recruiterKeys.applications(posting.id),
      queryFn: () => recruiterService.getPostingApplications(posting.id),
      staleTime: 60 * 1000,
    })),
  });

  const applicationsByPosting = useMemo(() => {
    return postings.reduce<Record<string, RecruiterApplication[]>>((accumulator, posting, index) => {
      accumulator[posting.id] = applicationQueries[index]?.data ?? [];
      return accumulator;
    }, {});
  }, [applicationQueries, postings]);

  const allApplications = useMemo(() => {
    return Object.values(applicationsByPosting).flat();
  }, [applicationsByPosting]);

  const stageOptions = useMemo(() => {
    return Array.from(new Set(allApplications.map((application) => application.current_stage))).sort();
  }, [allApplications]);

  const stats = useMemo(() => {
    return {
      postings: postings.length,
      candidates: allApplications.length,
      shortlisted: allApplications.filter((application) => application.current_stage === 'shortlisted').length,
      offers: allApplications.filter((application) => application.current_stage === 'offer_released').length,
    };
  }, [allApplications, postings.length]);

  function togglePosting(postingId: string) {
    setExpandedPostings((current) => {
      const next = new Set(current);
      if (next.has(postingId)) next.delete(postingId);
      else next.add(postingId);
      return next;
    });
  }

  function getPostingApplications(postingId: string) {
    return (applicationsByPosting[postingId] ?? []).filter((application) => {
      const matchesSearch = !searchTerm || [
        application.student.full_name,
        application.student.enrollment_number,
        application.student.department,
        application.student.batch,
      ].some((field) => field.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStage = stageFilter === 'all' || application.current_stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }

  const applicationErrors = applicationQueries.filter((query) => query.error);
  const isApplicationsLoading = applicationQueries.some((query) => query.isLoading);

  if (dashboardQuery.isLoading || (companyId && postingsQuery.isLoading)) {
    return <RecruitmentPipelineSkeleton />;
  }

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <Briefcase className="h-4 w-4" />
          <AlertTitle>Unable to load recruiter pipeline</AlertTitle>
          <AlertDescription>{getErrorMessage(dashboardQuery.error)}</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  if (recruiter?.verification_status !== 'verified') {
    return (
      <DashboardLayout
        title="Recruitment Pipeline"
        subtitle="Recruiter access is limited until the placement office verifies your account"
      >
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Pipeline access is unavailable</AlertTitle>
          <AlertDescription>
            Your recruiter profile is not verified yet. Once verified, this page will show live postings and applicant data for your company.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  if (postingsQuery.error) {
    return (
      <DashboardLayout
        title="Recruitment Pipeline"
        subtitle="Review live applicants by posting"
      >
        <Alert variant="destructive">
          <Briefcase className="h-4 w-4" />
          <AlertTitle>Unable to load postings</AlertTitle>
          <AlertDescription>{getErrorMessage(postingsQuery.error)}</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Recruitment Pipeline"
      subtitle="Review live published postings and PII-safe applicant lists"
    >
      <div className="space-y-6">
        {applicationErrors.length > 0 ? (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertTitle>Some applicant lists are still unavailable</AlertTitle>
            <AlertDescription>
              One or more posting-specific applicant lists could not be loaded. The rest of the pipeline remains live.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.postings}</p>
                <p className="text-sm text-muted-foreground">Published Postings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.candidates}</p>
                <p className="text-sm text-muted-foreground">Applicants</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900">
                <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.shortlisted}</p>
                <p className="text-sm text-muted-foreground">Shortlisted</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.offers}</p>
                <p className="text-sm text-muted-foreground">Offers Released</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Recruiter views are read-only and privacy-safe. Personal student contact information is intentionally excluded from this pipeline.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, enrollment, department, or batch..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stageOptions.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {getStageLabel(stage)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {postings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No live postings yet</h3>
                <p className="mt-2 text-muted-foreground">
                  Once the placement office publishes postings for your company, they will appear here with applicant lists.
                </p>
              </CardContent>
            </Card>
          ) : (
            postings.map((posting, index) => {
              const postingApplications = getPostingApplications(posting.id);
              const isExpanded = expandedPostings.has(posting.id);
              const postingQuery = applicationQueries[index];

              return (
                <Card key={posting.id} className="overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => togglePosting(posting.id)}>
                    <CollapsibleTrigger asChild>
                      <div className="cursor-pointer p-4 transition-colors hover:bg-accent/50">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-lg bg-muted p-2">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="font-semibold text-foreground">{posting.role_name}</h3>
                                {getPostingTypeBadge(posting)}
                                <Badge variant="success">Published</Badge>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {posting.location || 'Location not specified'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-4 w-4" />
                                  {getPostingCompensation(posting)}
                                </span>
                                {posting.application_end_date ? (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Deadline: {formatDatePattern(posting.application_end_date, 'dd MMM yyyy')}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">{posting._count.applications}</p>
                            <p className="text-xs text-muted-foreground">Total applicants</p>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t">
                        {postingQuery?.isLoading || isApplicationsLoading && !postingQuery?.data ? (
                          <div className="p-4">
                            <Skeleton className="h-24 w-full bg-muted" />
                          </div>
                        ) : postingQuery?.error ? (
                          <div className="p-4">
                            <Alert variant="destructive">
                              <Users className="h-4 w-4" />
                              <AlertTitle>Unable to load applicants</AlertTitle>
                              <AlertDescription>{getErrorMessage(postingQuery.error)}</AlertDescription>
                            </Alert>
                          </div>
                        ) : postingApplications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No applicants match the current filters for this posting.</p>
                          </div>
                        ) : (
                          <div className="p-4">
                            <div className="mb-4 flex items-center justify-between">
                              <p className="text-sm font-medium">
                                Applicants ({postingApplications.length})
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Contact details are hidden by policy.
                              </p>
                            </div>
                            <PostingApplicantsTable
                              applications={postingApplications}
                              onView={setSelectedApplication}
                            />
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && setSelectedApplication(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Applicant Detail</DialogTitle>
            <DialogDescription>PII-safe summary shared with recruiters for hiring review.</DialogDescription>
          </DialogHeader>
          {selectedApplication ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-lg font-semibold">{selectedApplication.student.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedApplication.student.enrollment_number}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedApplication.student.department}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Batch</p>
                  <p className="font-medium">{selectedApplication.student.batch}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Stage</p>
                  <div className="mt-1">{getStageBadge(selectedApplication.current_stage)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Applied On</p>
                  <p className="font-medium">{formatDatePattern(selectedApplication.applied_at, 'dd MMM yyyy')}</p>
                </div>
              </div>
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Privacy notice</AlertTitle>
                <AlertDescription>
                  Email addresses, phone numbers, addresses, and other personal student data are intentionally excluded from recruiter views.
                </AlertDescription>
              </Alert>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setSelectedApplication(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
