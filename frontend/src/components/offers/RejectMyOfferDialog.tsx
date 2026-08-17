import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRejectOfferByStudent } from '@/hooks/use-offer-api';
import { formatApiErrorMessage } from '@/lib/apiError';

interface RejectMyOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string | null;
  companyName?: string;
  role?: string;
}

const MAX_REASON_LENGTH = 500;

export function RejectMyOfferDialog({
  open,
  onOpenChange,
  offerId,
  companyName,
  role,
}: RejectMyOfferDialogProps) {
  const rejectMutation = useRejectOfferByStudent();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  async function handleReject() {
    if (!offerId) return;
    try {
      await rejectMutation.mutateAsync({ offerId, reason: reason.trim() || undefined });
      toast.success('Offer rejected.');
      onOpenChange(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to reject the offer.'));
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Reject this offer?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {companyName && role
              ? `You are about to reject the ${role} offer from ${companyName}.`
              : 'You are about to reject this offer.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">This action is permanent.</p>
          <p className="text-muted-foreground">
            Once you reject this offer, you will not be able to apply to or register interest in any
            future postings (job or internship) for this placement cycle. Continue only if you are
            sure.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="reject-reason">Reason (optional)</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, MAX_REASON_LENGTH))}
            placeholder="Share your reason so the TPO team has context"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {reason.length}/{MAX_REASON_LENGTH}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={rejectMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleReject();
            }}
            disabled={rejectMutation.isPending || !offerId}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {rejectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              'Reject Offer'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
