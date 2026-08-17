import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  FileCheck,
  GraduationCap,
  IndianRupee,
  Loader2,
  Plus,
  User,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';
import { useRole } from '@/contexts/RoleContext';
import { useCreateIssue, useInternshipDetail, useResolveIssue, useUpdateInternship } from '@/hooks/use-internship-api';
import {
  getInternshipDaysRemaining,
  getInternshipIssueCount,
  isInternshipCertificatePending,
} from '@/lib/internshipModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import {
  INTERNSHIP_STATUS_CONFIG,
  INTERNSHIP_TYPE_CONFIG,
  ISSUE_STATUS_CONFIG,
  MINIMUM_STIPEND_AMOUNT,
} from '@/types/internship';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

interface InternshipDetailSheetProps {
  internshipId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManageStatus?: boolean;
  canCreateIssues?: boolean;
  canResolveIssues?: boolean;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function InternshipDetailSheet({
  internshipId,
  open,
  onOpenChange,
  canManageStatus = false,
  canCreateIssues = false,
  canResolveIssues = false,
}: InternshipDetailSheetProps) {
  const { isRecruiter } = useRole();
  const detailQuery = useInternshipDetail(internshipId ?? '');
  const updateInternship = useUpdateInternship();
  const createIssue = useCreateIssue();
  const resolveIssue = useResolveIssue();
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [certificateUploaded, setCertificateUploaded] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState('');

  const internship = detailQuery.data;

  useEffect(() => {
    if (!internship) return;
    setCertificateUploaded(internship.certificate_uploaded);
    setCertificateUrl(internship.certificate_url ?? '');
  }, [internship]);

  if (!internshipId) return null;

  const isFinalized = internship ? internship.status === 'completed' || internship.status === 'discontinued' : false;
  const belowMinimumStipend = internship?.internship_type === 'stipend_based'
    && typeof internship.stipend_amount === 'number'
    && internship.stipend_amount < MINIMUM_STIPEND_AMOUNT;
  const daysRemaining = internship ? getInternshipDaysRemaining(internship) : null;
  const hasCertificateChanges = internship
    ? internship.certificate_uploaded !== certificateUploaded || (internship.certificate_url ?? '') !== certificateUrl.trim()
    : false;

  const handleLogIssue = async () => {
    if (!internshipId || !issueTitle.trim()) return;

    try {
      await createIssue.mutateAsync({
        internshipId,
        data: {
          title: issueTitle.trim(),
          description: issueDescription.trim() || null,
        },
      });
      toast.success('Issue logged successfully');
      setIssueTitle('');
      setIssueDescription('');
      setShowIssueForm(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to log the issue'));
    }
  };

  const handleResolveIssue = async (issueId: string) => {
    if (!internshipId) return;

    try {
      await resolveIssue.mutateAsync({ issueId, internshipId });
      toast.success('Issue resolved');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to resolve the issue'));
    }
  };

  const handleSaveCertificate = async () => {
    if (!internshipId) return;

    try {
      await updateInternship.mutateAsync({
        internshipId,
        data: {
          certificate_uploaded: certificateUploaded,
          certificate_url: certificateUrl.trim() || null,
        },
      });
      toast.success('Certificate details updated');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to save certificate details'));
    }
  };

  const handleUpdateStatus = async (status: 'completed' | 'discontinued') => {
    if (!internshipId) return;

    try {
      await updateInternship.mutateAsync({
        internshipId,
        data: { status },
      });
      toast.success(`Internship marked as ${status}`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update the internship status'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Internship Details
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {detailQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading internship details...
            </div>
          )}

          {detailQuery.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Unable to load this internship</AlertTitle>
              <AlertDescription>
                {getErrorMessage(detailQuery.error, 'Please refresh and try again.')}
              </AlertDescription>
            </Alert>
          )}

          {internship && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={INTERNSHIP_STATUS_CONFIG[internship.status].color} variant="outline">
                  {INTERNSHIP_STATUS_CONFIG[internship.status].label}
                </Badge>
                <Badge className={INTERNSHIP_TYPE_CONFIG[internship.internship_type].color} variant="outline">
                  {INTERNSHIP_TYPE_CONFIG[internship.internship_type].label}
                </Badge>
                <Badge variant="secondary">
                  {getInternshipIssueCount(internship)} issue{getInternshipIssueCount(internship) === 1 ? '' : 's'}
                </Badge>
              </div>

              {isInternshipCertificatePending(internship) && internship.status === 'ongoing' && daysRemaining !== null && daysRemaining <= 25 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Certificate deadline is approaching</AlertTitle>
                  <AlertDescription>
                    This internship ends in {daysRemaining} day{daysRemaining === 1 ? '' : 's'} and the certificate is still pending.
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      Student
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{internship.student.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {internship.student.enrollment_number} • {internship.student.department}
                        {internship.student.batch ? ` • Batch ${internship.student.batch}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Company
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{internship.company_name}</p>
                      <p className="text-sm text-muted-foreground">{internship.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Start</span>
                      <span>{format(new Date(internship.start_date), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">End</span>
                      <span>{internship.end_date ? format(new Date(internship.end_date), 'dd MMM yyyy') : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Duration status</span>
                      <span>
                        {daysRemaining === null ? 'Completed' : daysRemaining > 0 ? `${daysRemaining} days left` : 'Ended'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <IndianRupee className="h-4 w-4" />
                      Stipend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Receiving stipend</span>
                      <span>{internship.is_receiving_stipend ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Amount</span>
                      <span>
                        {internship.stipend_amount !== null
                          ? `Rs ${internship.stipend_amount.toLocaleString('en-IN')}`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Frequency</span>
                      <span>{internship.stipend_frequency ? internship.stipend_frequency.replace('_', ' ') : '—'}</span>
                    </div>
                    {belowMinimumStipend && (
                      <p className="text-xs text-destructive">
                        This stipend is below the guideline minimum of Rs {MINIMUM_STIPEND_AMOUNT.toLocaleString('en-IN')}.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Completion Certificate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={
                        internship.certificate_uploaded
                          ? 'bg-green-500/10 text-green-600 border-green-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }
                      variant="outline"
                    >
                      {internship.certificate_uploaded ? 'Uploaded' : 'Pending'}
                    </Badge>
                    {!isRecruiter && internship.certificate_url && (
                      <a
                        className="text-sm text-primary underline-offset-4 hover:underline"
                        href={resolveBackendAssetUrl(internship.certificate_url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open certificate
                      </a>
                    )}
                  </div>

                  {canManageStatus && (
                    <div className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">Certificate uploaded</p>
                          <p className="text-xs text-muted-foreground">
                            Save this when the completion proof is available.
                          </p>
                        </div>
                        <Checkbox
                          checked={certificateUploaded}
                          onCheckedChange={(checked) => setCertificateUploaded(Boolean(checked))}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Certificate URL</p>
                        <Input
                          placeholder="https://..."
                          value={certificateUrl}
                          onChange={(event) => setCertificateUrl(event.target.value)}
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          disabled={!hasCertificateChanges || updateInternship.isPending}
                          onClick={handleSaveCertificate}
                        >
                          {updateInternship.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save certificate details
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Issues & Notes
                  </h3>
                  {canCreateIssues && (
                    <Button variant="outline" size="sm" onClick={() => setShowIssueForm((current) => !current)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Report issue
                    </Button>
                  )}
                </div>

                {showIssueForm && (
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Issue title</p>
                        <Input
                          placeholder="e.g. Stipend payment delayed"
                          value={issueTitle}
                          onChange={(event) => setIssueTitle(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Description</p>
                        <Textarea
                          rows={4}
                          placeholder="Share any context that will help the TPO team act on this."
                          value={issueDescription}
                          onChange={(event) => setIssueDescription(event.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setShowIssueForm(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleLogIssue} disabled={!issueTitle.trim() || createIssue.isPending}>
                          {createIssue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Submit issue
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  {internship.issues.map((issue) => (
                    <Card key={issue.id}>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{issue.title}</p>
                            {issue.description && (
                              <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
                            )}
                          </div>
                          <Badge className={ISSUE_STATUS_CONFIG[issue.status].color} variant="outline">
                            {ISSUE_STATUS_CONFIG[issue.status].label}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Reported {format(new Date(issue.created_at), 'dd MMM yyyy, p')}
                          {issue.reported_by_user ? ` by ${issue.reported_by_user.name}` : ''}
                          {issue.resolved_at ? ` • Resolved ${format(new Date(issue.resolved_at), 'dd MMM yyyy, p')}` : ''}
                        </div>

                        {issue.status === 'open' && canResolveIssues && (
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={resolveIssue.isPending}
                              onClick={() => handleResolveIssue(issue.id)}
                            >
                              {resolveIssue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Resolve issue
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {internship.issues.length === 0 && (
                    <p className="text-sm text-muted-foreground">No issues have been logged for this internship.</p>
                  )}
                </div>
              </div>

              {canManageStatus && !isFinalized && (
                <>
                  <Separator />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      disabled={updateInternship.isPending}
                      onClick={() => handleUpdateStatus('completed')}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark completed
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={updateInternship.isPending}
                      onClick={() => handleUpdateStatus('discontinued')}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Mark discontinued
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
