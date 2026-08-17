import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  ExternalLink,
  FileText,
  GraduationCap,
  IndianRupee,
  MapPin,
  Send,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useClosePosting, usePostingDetail, usePublishPosting, useUpdatePosting } from '@/hooks/use-posting-api';
import { formatCGPA, formatDate, formatDateTime } from '@/lib/formatters';
import { isPostingApplicationOpen } from '@/lib/postingModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { getPostingTypeLabel, getWorkModeLabel } from '@/services/postingService';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function getStatusBadge(status: 'draft' | 'published' | 'closed') {
  if (status === 'draft') return <Badge variant="warning">Draft</Badge>;
  if (status === 'published') return <Badge variant="success">Published</Badge>;
  return <Badge variant="secondary">Closed</Badge>;
}

function PostingDetailSkeleton() {
  return (
    <DashboardLayout
      title="Posting Detail"
      subtitle="Loading live posting data"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-56 bg-muted" />
            <Skeleton className="mt-3 h-4 w-72 bg-muted" />
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <Skeleton className="h-16 w-full bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function PostingDetail() {
  const { postingId } = useParams();
  const navigate = useNavigate();
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const postingQuery = usePostingDetail(postingId ?? '');
  const publishPosting = usePublishPosting();
  const closePosting = useClosePosting();
  const updatePosting = useUpdatePosting();

  if (postingQuery.isLoading) {
    return <PostingDetailSkeleton />;
  }

  if (postingQuery.error || !postingQuery.data) {
    return (
      <DashboardLayout
        title="Posting Detail"
        subtitle="This posting could not be loaded"
      >
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load posting</AlertTitle>
          <AlertDescription>
            {getErrorMessage(postingQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/admin/postings')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to postings
        </Button>
      </DashboardLayout>
    );
  }

  const posting = postingQuery.data;
  const applicationOpen = isPostingApplicationOpen(posting);

  async function handlePublish() {
    try {
      await publishPosting.mutateAsync({
        postingId: posting.id,
        data: {
          ...(posting.application_start_date ? { application_start_date: posting.application_start_date.slice(0, 10) } : {}),
          ...(posting.application_end_date ? { application_end_date: posting.application_end_date.slice(0, 10) } : {}),
        },
      });
      toast.success('Posting published successfully.');
      setPublishDialogOpen(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to publish the posting.'));
    }
  }

  async function handleClose() {
    try {
      await closePosting.mutateAsync(posting.id);
      toast.success('Posting closed successfully.');
      setCloseDialogOpen(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to close the posting.'));
    }
  }

  async function handleToggleApplicationOverride(enabled: boolean) {
    try {
      await updatePosting.mutateAsync({
        postingId: posting.id,
        data: { application_override_enabled: enabled },
      });
      toast.success(enabled ? 'Application override enabled.' : 'Application override disabled.');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update the application override setting.'));
    }
  }

  return (
    <DashboardLayout
      title="Posting Detail"
      subtitle="Review the live posting record, rules, and counts"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/postings')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{posting.title}</h1>
                {getStatusBadge(posting.status)}
              </div>
              <p className="mt-2 text-muted-foreground">
                {getPostingTypeLabel(posting.type)} • {posting.company.name} • {posting.academic_year}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {posting.status !== 'closed' && (
              <Button variant="outline" onClick={() => navigate(`/admin/postings/${posting.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {posting.status === 'draft' && (
              <Button onClick={() => setPublishDialogOpen(true)}>
                <Send className="mr-2 h-4 w-4" />
                Publish
              </Button>
            )}
            {posting.status === 'published' && (
              <Button variant="outline" onClick={() => setCloseDialogOpen(true)}>
                <Archive className="mr-2 h-4 w-4" />
                Close Posting
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Applications</p>
              <p className="mt-2 text-2xl font-semibold">{posting._count.applications}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Offers</p>
              <p className="mt-2 text-2xl font-semibold">{posting._count.offers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Min CGPA</p>
              <p className="mt-2 text-2xl font-semibold">{formatCGPA(posting.min_cgpa)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Max Backlogs</p>
              <p className="mt-2 text-2xl font-semibold">{posting.max_backlogs}</p>
            </CardContent>
          </Card>
        </div>

        {posting.status === 'published' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>{applicationOpen ? 'Applications are open' : 'Application window is closed'}</AlertTitle>
            <AlertDescription>
              {posting.application_start_date && posting.application_end_date
                ? `${formatDate(posting.application_start_date)} to ${formatDate(posting.application_end_date)}`
                : 'This posting remains open while published because no date window was configured.'}
            </AlertDescription>
          </Alert>
        )}

        {posting.status === 'published' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Application Controls
              </CardTitle>
              <CardDescription>
                Re-open this posting for applications even after the scheduled date window has ended.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Keep applications open</p>
                <p className="text-sm text-muted-foreground">
                  Turning this on ignores the application end date while the posting remains published.
                </p>
              </div>
              <Switch
                checked={posting.application_override_enabled}
                onCheckedChange={(checked) => void handleToggleApplicationOverride(checked)}
                disabled={updatePosting.isPending}
              />
            </CardContent>
          </Card>
        )}

        {posting.status === 'closed' && (
          <Alert>
            <Archive className="h-4 w-4" />
            <AlertTitle>This posting is now read-only</AlertTitle>
            <AlertDescription>
              Closed postings cannot be edited. You can review the details here for reference.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company and Role Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium text-foreground">{posting.company.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role name</p>
                <p className="font-medium text-foreground">{posting.role_name}</p>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {(posting.locations?.length ?? 0) > 1 ? 'Locations' : 'Location'}
                  </p>
                  <p className="font-medium text-foreground">
                    {(posting.locations?.length ? posting.locations : [posting.location].filter(Boolean)).join(', ')}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Work mode</p>
                <Badge variant="outline">{getWorkModeLabel(posting.work_mode)}</Badge>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              {posting.ctc && (
                <div className="flex items-start gap-2">
                  <IndianRupee className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">CTC</p>
                    <p className="font-medium text-foreground">{posting.ctc}</p>
                  </div>
                </div>
              )}
              {posting.stipend && (
                <div className="flex items-start gap-2">
                  <IndianRupee className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Stipend</p>
                    <p className="font-medium text-foreground">{posting.stipend}</p>
                  </div>
                </div>
              )}
              {posting.duration && (
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium text-foreground">{posting.duration}</p>
                  </div>
                </div>
              )}
            </div>

            {posting.bond_details && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Bond details</p>
                  <p className="mt-2 text-sm text-foreground">{posting.bond_details}</p>
                </div>
              </>
            )}

            {(() => {
              const pdfUrls = posting.job_description_pdf_urls?.length
                ? posting.job_description_pdf_urls
                : [posting.job_description_pdf_url].filter((url): url is string => Boolean(url));
              if (pdfUrls.length === 0) return null;
              return (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {pdfUrls.length > 1 ? 'Job description PDFs' : 'Job description PDF'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pdfUrls.map((url, index) => (
                        <Button key={url} variant="outline" asChild>
                          <a href={resolveBackendAssetUrl(url)} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {posting.job_description_pdf_names?.[index] || (pdfUrls.length > 1 ? `View PDF ${index + 1}` : 'View PDF')}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground">Role description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {posting.role_description || 'No additional role description was provided.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Eligibility Rules
            </CardTitle>
            <CardDescription>
              These conditions are exposed to students and enforced during application submission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Eligible branches</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {posting.eligible_branches.length > 0 ? posting.eligible_branches.map((branch) => (
                    <Badge key={branch} variant="outline">{branch}</Badge>
                  )) : <Badge variant="secondary">Open to all branches</Badge>}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eligible batches</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {posting.eligible_batches.length > 0 ? posting.eligible_batches.map((batch) => (
                    <Badge key={batch} variant="secondary">{batch}</Badge>
                  )) : <Badge variant="secondary">Open to all batches</Badge>}
                </div>
              </div>
            </div>

            {posting.skill_requirements && (
              <div>
                <p className="text-sm text-muted-foreground">Skill requirements</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{posting.skill_requirements}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Selection Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              {posting.has_written_test ? (
                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">Written test</p>
                <p className="text-sm text-muted-foreground">
                  {posting.has_written_test
                    ? posting.written_test_details || 'Written round configured.'
                    : 'No written round configured.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              {posting.has_gd ? (
                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">Group discussion</p>
                <p className="text-sm text-muted-foreground">
                  {posting.has_gd ? posting.gd_details || 'GD round configured.' : 'No GD round configured.'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Technical rounds</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{posting.technical_rounds}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">HR rounds</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{posting.hr_rounds}</p>
              </div>
            </div>

            {posting.additional_info && (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="font-medium text-foreground">Additional information</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{posting.additional_info}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Posting Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Created: {formatDateTime(posting.created_at)}</p>
            <p>Published: {posting.published_at ? formatDateTime(posting.published_at) : 'Not published yet'}</p>
            {posting.closed_at && <p>Closed: {formatDateTime(posting.closed_at)}</p>}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this posting?</AlertDialogTitle>
            <AlertDialogDescription>
              Students will be able to discover and apply to this posting as soon as it is published.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this posting?</AlertDialogTitle>
            <AlertDialogDescription>
              Closing stops new applications and turns this record into a read-only archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>Close Posting</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
