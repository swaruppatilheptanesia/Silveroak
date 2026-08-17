import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  GraduationCap,
  IndianRupee,
  Loader2,
  Mail,
  Phone,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useFacultyApproveNoc, useIssueNoc, useNocDetail, useRejectNoc, useTpoApproveNoc } from '@/hooks/use-noc-api';
import {
  getNocBatch,
  getNocCompanyLocation,
  getNocDepartment,
  getNocEmail,
  getNocFacultyApproverName,
  getNocMobile,
  getNocProgramLabel,
  getNocStipendAmount,
  getNocStudentName,
  getNocTpoApproverName,
} from '@/lib/nocModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { resolveNocCertificatePreview } from '@/lib/nocTemplateModule';
import { useNocTemplates } from '@/hooks/use-noc-template-api';
import { NocTemplatePreview } from './NocTemplatePreview';
import { NOC_STATUS_CONFIG, NOC_TYPE_LABELS, PLACEMENT_SOURCE_LABELS } from '@/types/noc';
import { NOCStatusTimeline } from './NOCStatusTimeline';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface NOCReviewDialogProps {
  nocId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'faculty' | 'admin';
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function NOCReviewDialog({
  nocId,
  open,
  onOpenChange,
  mode,
}: NOCReviewDialogProps) {
  const detailQuery = useNocDetail(open && nocId ? nocId : '');
  const templatesQuery = useNocTemplates(open && Boolean(nocId) && mode === 'admin');
  const facultyApprove = useFacultyApproveNoc();
  const tpoApprove = useTpoApproveNoc();
  const rejectNoc = useRejectNoc();
  const issueNoc = useIssueNoc();
  const [remarks, setRemarks] = useState('');
  const [pendingAction, setPendingAction] = useState<
    | { type: 'approve' }
    | { type: 'reject' }
    | { type: 'issue' }
    | null
  >(null);

  useEffect(() => {
    if (!open) {
      setRemarks('');
      setPendingAction(null);
      return;
    }

    setRemarks('');
    setPendingAction(null);
  }, [nocId, open]);

  const request = detailQuery.data;
  const template = useMemo(() => {
    if (!request) return null;
    if (mode === 'faculty') return null;

    return (
      templatesQuery.data?.find(
        (item) =>
          item.posting_type_master.value === request.program
          && item.branch_scope === request.student.department
      )
      ?? templatesQuery.data?.find(
        (item) =>
          item.posting_type_master.value === request.program
          && item.branch_scope === 'ALL'
      )
      ?? null
    );
  }, [request, templatesQuery.data]);
  const certificatePreview = useMemo(() => {
    if (!request) return null;
    if (!template && !request.certificate_snapshot) return null;
    return resolveNocCertificatePreview(request, template);
  }, [request, template]);
  const isTemplatePreviewLoading = templatesQuery.isLoading && !request?.certificate_snapshot;

  const studentName = request ? getNocStudentName(request) : 'student';
  const stipendAmount = request ? getNocStipendAmount(request) : null;
  const canApprove = Boolean(
    request &&
      ((mode === 'faculty' && request.status === 'pending_faculty') ||
        (mode === 'admin' && request.status === 'pending_tpo'))
  );
  const canReject = Boolean(request && request.status !== 'issued' && request.status !== 'rejected');
  const canIssue = Boolean(mode === 'admin' && request?.status === 'approved');
  const isBusy = facultyApprove.isPending || tpoApprove.isPending || rejectNoc.isPending || issueNoc.isPending;

  const approveLabel = useMemo(() => {
    return mode === 'faculty' ? 'Approve for TPO' : 'Approve & Issue';
  }, [mode]);

  async function handleApprove() {
    setPendingAction({ type: 'approve' });
  }

  async function handleReject() {
    if (!remarks.trim()) {
      toast.error('Please add a rejection reason.');
      return;
    }
    setPendingAction({ type: 'reject' });
  }

  async function handleIssue() {
    setPendingAction({ type: 'issue' });
  }

  async function handleConfirmAction() {
    if (!nocId || !request || !pendingAction) return;

    try {
      if (pendingAction.type === 'approve') {
        if (mode === 'faculty') {
          await facultyApprove.mutateAsync({ nocId, data: { remarks: remarks.trim() || null } });
        } else {
          await tpoApprove.mutateAsync({ nocId, data: { remarks: remarks.trim() || null } });
        }
        toast.success(
          mode === 'faculty'
            ? `NOC approved for ${getNocStudentName(request)}.`
            : `NOC approved and issued for ${getNocStudentName(request)}.`
        );
      } else if (pendingAction.type === 'reject') {
        await rejectNoc.mutateAsync({
          nocId,
          data: { rejection_reason: remarks.trim() },
        });
        toast.success(`NOC rejected for ${getNocStudentName(request)}.`);
      } else {
        const updated = await issueNoc.mutateAsync(nocId);
        toast.success(`NOC issued: ${updated.noc_number}`);
      }
      setPendingAction(null);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          pendingAction.type === 'reject'
            ? 'Unable to reject the NOC request.'
            : pendingAction.type === 'approve'
              ? 'Unable to approve the NOC request.'
              : 'Unable to issue the NOC.'
        )
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !h-[90vh] !max-w-3xl !flex-col !overflow-hidden !p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{mode === 'faculty' ? 'Faculty Review' : 'NOC Review'}</DialogTitle>
          <DialogDescription>
            Review the live NOC request, comments, and current approval stage.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          {!nocId ? (
            <div className="py-8 text-sm text-muted-foreground">Select a request first.</div>
          ) : detailQuery.isLoading ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-10 w-full bg-muted" />
              <Skeleton className="h-28 w-full bg-muted" />
              <Skeleton className="h-40 w-full bg-muted" />
            </div>
          ) : detailQuery.error || !request ? (
            <div className="py-8 text-sm text-destructive">
              {getErrorMessage(detailQuery.error, 'Unable to load the NOC request.')}
            </div>
          ) : (
            <div className="space-y-6 py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{NOC_TYPE_LABELS[request.noc_type]}</Badge>
                    <Badge variant="outline">{getNocProgramLabel(request.program)}</Badge>
                    <Badge className={NOC_STATUS_CONFIG[request.status].color}>
                      {NOC_STATUS_CONFIG[request.status].label}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">{request.role_title}</h2>
                  <p className="text-sm text-muted-foreground">{request.company_name}</p>
                </div>
                {request.noc_number && (
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-right">
                    <p className="text-xs text-muted-foreground">NOC Number</p>
                    <p className="font-semibold text-foreground">{request.noc_number}</p>
                  </div>
                )}
              </div>

              <NOCStatusTimeline
                currentStatus={request.status}
                facultyApprovedAt={request.faculty_approved_at ?? undefined}
                facultyApproverName={getNocFacultyApproverName(request) ?? undefined}
                tpoApprovedAt={request.tpo_approved_at ?? undefined}
                tpoApproverName={getNocTpoApproverName(request) ?? undefined}
                issuedAt={request.issued_at ?? undefined}
                rejectedAt={request.rejected_at ?? undefined}
                rejectionReason={request.rejection_reason ?? undefined}
              />

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <GraduationCap className="h-4 w-4" />
                    Student
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-foreground">{getNocStudentName(request)}</p>
                    <p className="text-muted-foreground">{request.student.enrollment_number}</p>
                    <p>{getNocDepartment(request)}</p>
                    <p>Batch: {getNocBatch(request)}</p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {getNocEmail(request)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {getNocMobile(request)}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <Building2 className="h-4 w-4" />
                    Company
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{request.company_name}</p>
                      {request.company?.verification_status === 'verified' && (
                        <Badge variant="outline" className="text-emerald-600 text-xs">Company Verified</Badge>
                      )}
                      {request.company?.source === 'student' && (
                        <Badge variant="outline" className="text-amber-600 text-xs">Added by Student</Badge>
                      )}
                    </div>
                    <p>{getNocCompanyLocation(request)}</p>
                    {request.company_address && <p>{request.company_address}</p>}
                    {(request.company_pan || request.company_gst) && (
                      <p>PAN / GST: {[request.company_pan, request.company_gst].filter(Boolean).join(' · ')}</p>
                    )}
                    <p>Status: {request.company_verification_status}</p>
                    <p>Contact: {request.contact_person_name || 'Not provided'}</p>
                    <p>{request.contact_person_email || request.contact_person_phone || 'No contact details provided'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileText className="h-4 w-4" />
                  Request Details
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="text-sm">
                    <p className="text-muted-foreground">Placement Source</p>
                    <p className="font-medium text-foreground">
                      {PLACEMENT_SOURCE_LABELS[request.placement_source]}
                    </p>
                  </div>
                  {request.internship_type && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Internship Type</p>
                      <p className="font-medium capitalize text-foreground">{request.internship_type}</p>
                    </div>
                  )}
                  <div className="text-sm">
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium text-foreground">
                      {format(new Date(request.start_date), 'dd MMM yyyy')} - {request.end_date ? format(new Date(request.end_date), 'dd MMM yyyy') : 'Ongoing'}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Technology / Domain</p>
                    <p className="font-medium text-foreground">{request.technology_domain || 'Not provided'}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Stipend</p>
                    <p className="font-medium text-foreground">
                      {stipendAmount !== null ? `₹${stipendAmount.toLocaleString('en-IN')}/month` : 'Not provided'}
                    </p>
                  </div>
                </div>
                {request.job_description && (
                  <div className="mt-4 text-sm">
                    <p className="text-muted-foreground">Job Description</p>
                    <p className="mt-1 text-foreground">{request.job_description}</p>
                  </div>
                )}
                {(request.offer_letter_url || request.supporting_document_url) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {request.offer_letter_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={resolveBackendAssetUrl(request.offer_letter_url)} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Offer Letter
                        </a>
                      </Button>
                    )}
                    {request.supporting_document_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={resolveBackendAssetUrl(request.supporting_document_url)} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {request.supporting_document_name || 'Open Supporting Document'}
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {mode === 'admin' && (
                <div className="rounded-lg border border-border p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <Calendar className="h-4 w-4" />
                    NOC Template Preview
                  </h3>
                  {isTemplatePreviewLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading template preview...
                    </div>
                  ) : certificatePreview ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">
                          {certificatePreview.isSnapshot ? 'Issued certificate' : template?.posting_type_master.value}
                        </Badge>
                        <span>{certificatePreview.templateName ?? template?.name}</span>
                      </div>
                      <NocTemplatePreview
                        subject={certificatePreview.subject}
                        bodyHtml={certificatePreview.bodyHtml}
                        values={certificatePreview.values}
                        className="max-w-none"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No certificate template is configured for {request.program}. The issue flow will fall back to the built-in default template.
                    </p>
                  )}
                </div>
              )}

              {(canApprove || canReject) && (
                <div className="space-y-2">
                  <Label htmlFor="noc-review-remarks">
                    {mode === 'faculty' ? 'Remarks' : 'Remarks / Notes'}
                  </Label>
                  <Textarea
                    id="noc-review-remarks"
                    rows={4}
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Add optional approval remarks or a required rejection reason..."
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          <div className="flex w-full items-center justify-between gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              {canReject && (
                <Button variant="destructive" onClick={handleReject} disabled={isBusy}>
                  {rejectNoc.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!rejectNoc.isPending && <ThumbsDown className="mr-2 h-4 w-4" />}
                  Reject
                </Button>
              )}
              {canApprove && (
                <Button onClick={handleApprove} disabled={isBusy}>
                  {(facultyApprove.isPending || tpoApprove.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {!facultyApprove.isPending && !tpoApprove.isPending && <ThumbsUp className="mr-2 h-4 w-4" />}
                  {approveLabel}
                </Button>
              )}
              {canIssue && (
                <Button onClick={handleIssue} disabled={isBusy}>
                  {issueNoc.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!issueNoc.isPending && <FileText className="mr-2 h-4 w-4" />}
                  Issue NOC
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>

      <ConfirmActionDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={
          pendingAction?.type === 'approve'
            ? mode === 'faculty'
              ? `Approve ${studentName}?`
              : `Approve and issue NOC for ${studentName}?`
            : pendingAction?.type === 'reject'
              ? `Reject ${studentName}?`
              : `Issue NOC for ${studentName}?`
        }
        description={
          pendingAction?.type === 'approve'
            ? mode === 'faculty'
              ? 'This will move the request to the TPO approval stage.'
              : 'This will approve the request, generate the certificate, and issue the NOC.'
            : pendingAction?.type === 'reject'
              ? 'This will reject the request using the rejection reason you entered.'
              : 'This will generate the final NOC certificate.'
        }
        confirmLabel={
          pendingAction?.type === 'approve'
            ? approveLabel
            : pendingAction?.type === 'reject'
              ? 'Reject NOC'
              : 'Issue NOC'
        }
        confirmVariant={pendingAction?.type === 'reject' ? 'destructive' : 'default'}
        isPending={isBusy}
        onConfirm={handleConfirmAction}
      />
    </Dialog>
  );
}
