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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Opt-out confirmation dialog with a REQUIRED reason. Used for both the global and per-posting-type
 * opt-out. Confirm stays disabled until a reason is entered. (Re-enabling uses a plain confirm dialog.)
 */
export function PlacementOptOutDialog({
  open,
  onOpenChange,
  title,
  description,
  isPending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  isPending?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const canConfirm = reason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => (isPending ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="placement_opt_out_reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="placement_opt_out_reason"
            rows={3}
            placeholder="Tell the T&P office why you're opting out…"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canConfirm || isPending}
            onClick={() => void onConfirm(reason.trim())}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm opt-out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
