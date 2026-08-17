import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GlobalPolicyCard } from '@/components/policies/GlobalPolicyCard';
import { usePolicies } from '@/hooks/use-policy-api';

interface PostingTypePolicyDialogProps {
  /** Set true to request the gate; the dialog resolves it (transparently or via user accept). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postingTypeMasterId: string | null | undefined;
  postingTypeLabel?: string;
  /** Fired once every linked policy for this posting type has been accepted (or none exist). */
  onProceed: () => void;
}

/**
 * Gate modal: shows the policy(ies) linked to a posting type with an "I Agree" per policy.
 * If the posting type has no linked policy, or all are already accepted, it proceeds
 * transparently (no modal shown). Otherwise the student must accept ALL before continuing.
 */
export function PostingTypePolicyDialog({
  open,
  onOpenChange,
  postingTypeMasterId,
  postingTypeLabel,
  onProceed,
}: PostingTypePolicyDialogProps) {
  const query = usePolicies(
    { posting_type_master_id: postingTypeMasterId ?? undefined, limit: 100, sort_by: 'effective_date', sort_order: 'desc' },
    Boolean(open && postingTypeMasterId),
  );

  const policies = query.data?.data ?? [];
  const pending = policies.filter((policy) => policy.accepted_current !== true);

  // `engaged` = the modal UI is actually shown (there are policies to accept). The transparent
  // case (no linked policy / already all accepted) is resolved once, without showing the modal.
  const [engaged, setEngaged] = useState(false);
  const [resolved, setResolved] = useState(false);

  // Note: proceed/close only flip the parent `open`; the effect's `!open` branch resets the
  // local guards. Resetting them here could re-trigger the effect and double-fire onProceed.
  const proceed = () => {
    onProceed();
    onOpenChange(false);
  };

  const close = () => {
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      setEngaged(false);
      setResolved(false);
      return;
    }
    if (resolved) return;
    if (!postingTypeMasterId) {
      setResolved(true);
      proceed();
      return;
    }
    if (query.isSuccess) {
      setResolved(true);
      if (policies.some((policy) => policy.accepted_current !== true)) {
        setEngaged(true); // there is at least one policy to accept → show the modal
      } else {
        proceed(); // no linked policy or all already accepted → transparent
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resolved, postingTypeMasterId, query.isSuccess]);

  return (
    <Dialog open={engaged} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Policy acceptance required</DialogTitle>
          <DialogDescription>
            Please read and accept the {postingTypeLabel ? `${postingTypeLabel} ` : ''}policy before continuing.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4">
            {policies.map((policy) => (
              <GlobalPolicyCard key={policy.id} policy={policy} defaultExpanded />
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button disabled={pending.length > 0 || query.isFetching} onClick={proceed}>
            {query.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
