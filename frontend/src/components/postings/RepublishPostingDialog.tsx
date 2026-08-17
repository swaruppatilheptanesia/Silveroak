import { useEffect, useMemo, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiPostingListItem } from '@/types/posting';
import type { RepublishPostingInput } from '@/types/posting';

interface RepublishPostingDialogProps {
  posting: ApiPostingListItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: RepublishPostingInput) => void;
  isPending?: boolean;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function RepublishPostingDialog({
  posting,
  onOpenChange,
  onConfirm,
  isPending = false,
}: RepublishPostingDialogProps) {
  const today = useMemo(() => toIsoDate(new Date()), []);
  const defaultEnd = useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() + 30);
    return toIsoDate(end);
  }, []);

  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  useEffect(() => {
    if (posting) {
      setStartDate(today);
      setEndDate(defaultEnd);
    }
  }, [posting, today, defaultEnd]);

  const validationError =
    !startDate || !endDate
      ? 'Both start and end dates are required.'
      : endDate < today
        ? 'End date must be today or later.'
        : endDate < startDate
          ? 'End date must be on or after the start date.'
          : null;

  const open = Boolean(posting);

  function handleConfirm() {
    if (validationError || !posting) return;
    onConfirm({ application_start_date: startDate, application_end_date: endDate });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Re-publish "{posting?.title ?? 'posting'}"?</DialogTitle>
          <DialogDescription>
            Set a fresh application window. The posting becomes visible to students again. Existing applications stay
            in their current stages.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="republish-start">Application start date</Label>
            <Input
              id="republish-start"
              type="date"
              value={startDate}
              min={today}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="republish-end">Application end date</Label>
            <Input
              id="republish-end"
              type="date"
              value={endDate}
              min={startDate || today}
              onChange={(event) => setEndDate(event.target.value)}
              disabled={isPending}
            />
          </div>
          {validationError && (
            <p className="text-sm text-destructive" role="alert">
              {validationError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || Boolean(validationError)}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Re-publish Posting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
