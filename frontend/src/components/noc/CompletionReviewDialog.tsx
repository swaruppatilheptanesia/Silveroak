import { useEffect, useState } from 'react';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ApiNocListItem } from '@/types/noc';
import {
  useApproveCompletionCertificate,
  useRejectCompletionCertificate,
} from '@/hooks/use-noc-api';
import { getNocProgramLabel } from '@/lib/nocModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { formatApiErrorMessage } from '@/lib/apiError';

interface CompletionReviewDialogProps {
  noc: ApiNocListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * TPO review of a submitted internship completion certificate: view the file, then Approve or
 * Reject (rejection requires a mandatory remark; the student may then re-upload).
 */
export function CompletionReviewDialog({ noc, open, onOpenChange }: CompletionReviewDialogProps) {
  const [remarks, setRemarks] = useState('');
  const approveMutation = useApproveCompletionCertificate();
  const rejectMutation = useRejectCompletionCertificate();
  const busy = approveMutation.isPending || rejectMutation.isPending;

  useEffect(() => {
    if (open) setRemarks('');
  }, [open, noc?.id]);

  if (!noc) return null;

  const certificateUrl = noc.completion_certificate_url
    ? resolveBackendAssetUrl(noc.completion_certificate_url)
    : null;

  async function handleApprove() {
    if (!noc) return;
    try {
      await approveMutation.mutateAsync(noc.id);
      toast.success('Completion certificate approved and added to the student portfolio.');
      onOpenChange(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to approve the completion certificate.'));
    }
  }

  async function handleReject() {
    if (!noc) return;
    if (!remarks.trim()) {
      toast.error('A rejection remark is required.');
      return;
    }
    try {
      await rejectMutation.mutateAsync({ nocId: noc.id, remarks: remarks.trim() });
      toast.success('Completion certificate rejected.');
      onOpenChange(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to reject the completion certificate.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Completion Certificate</DialogTitle>
          <DialogDescription>
            {noc.student.full_name} — {noc.company_name} ({getNocProgramLabel(noc.program)})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex-1">
              <p className="text-sm font-medium">Uploaded Certificate</p>
              <p className="text-xs text-muted-foreground break-all">
                {noc.completion_certificate_name || noc.completion_certificate_url || '—'}
              </p>
            </div>
            {certificateUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={certificateUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </a>
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="completion-remarks">Remarks (required to reject)</Label>
            <Textarea
              id="completion-remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Add a remark — mandatory when rejecting."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={handleReject} disabled={busy} className="gap-2">
            {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Reject
          </Button>
          <Button onClick={handleApprove} disabled={busy} className="gap-2">
            {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
