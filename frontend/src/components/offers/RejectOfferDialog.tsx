import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { focusFirstFormError } from '@/lib/formErrors';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useOfferDetail, useRejectOffer } from '@/hooks/use-offer-api';
import { REJECTION_REASONS } from '@/types/offer';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';

const rejectSchema = z.object({
  rejection_reason: z.string().min(1, 'Rejection reason is required'),
  rejection_remarks: z
    .string()
    .trim()
    .max(2000, 'Remarks must be under 2000 characters')
    .optional()
    .or(z.literal('')),
});

type RejectFormData = z.infer<typeof rejectSchema>;

interface RejectOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string | null;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function RejectOfferDialog({ open, onOpenChange, offerId }: RejectOfferDialogProps) {
  const detailQuery = useOfferDetail(open && offerId ? offerId : '');
  const rejectOffer = useRejectOffer();

  const form = useForm<RejectFormData>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { rejection_reason: '', rejection_remarks: '' },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ rejection_reason: '', rejection_remarks: '' });
    }
  }, [form, open]);

  async function onSubmit(values: RejectFormData) {
    if (!offerId) return;

    try {
      await rejectOffer.mutateAsync({
        offerId,
        data: {
          rejection_reason: values.rejection_reason,
          rejection_remarks: values.rejection_remarks?.trim() || null,
        },
      });
      toast.success('Offer rejected successfully.');
      form.reset({ rejection_reason: '', rejection_remarks: '' });
      onOpenChange(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to reject the offer.'));
    }
  }

  const offer = detailQuery.data;
  const canReject = offer?.status === 'pending_student_action';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Reject Offer
          </DialogTitle>
          <DialogDescription>
            Only pending student-action offers can be rejected by the T&P office.
          </DialogDescription>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading offer details...
          </div>
        ) : detailQuery.error || !offer ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {getErrorMessage(detailQuery.error, 'Unable to load the offer details.')}
          </div>
        ) : !canReject ? (
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            This offer is currently <strong>{offer.status.replace(/_/g, ' ')}</strong> and can no
            longer be rejected through this action.
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, focusFirstFormError)} className="space-y-4 py-2">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-destructive">
                  {offer.student.full_name} - {offer.role} at {offer.company.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This action is intended for approved placement-policy exceptions.
                </p>
              </div>

              <FormField
                control={form.control}
                name="rejection_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejection Reason *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(REJECTION_REASONS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rejection_remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add context for the rejection..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={rejectOffer.isPending}>
                  {rejectOffer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Rejection
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
