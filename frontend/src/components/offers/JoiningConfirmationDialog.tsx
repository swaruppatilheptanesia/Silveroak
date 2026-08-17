import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { focusFirstFormError } from '@/lib/formErrors';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { useOfferDetail, useUpdateJoiningStatus } from '@/hooks/use-offer-api';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';

const joiningSchema = z
  .object({
    joining_status: z.enum(['joined', 'did_not_join']),
    joining_date: z.string().optional().or(z.literal('')),
    dnj_reason: z.string().trim().max(2000, 'Reason must be under 2000 characters').optional().or(z.literal('')),
  })
  .refine(
    (data) => data.joining_status !== 'joined' || Boolean(data.joining_date),
    { message: 'Joining date is required', path: ['joining_date'] }
  )
  .refine(
    (data) => data.joining_status !== 'did_not_join' || Boolean(data.dnj_reason?.trim()),
    { message: 'DNJ reason is required', path: ['dnj_reason'] }
  );

type JoiningFormData = z.infer<typeof joiningSchema>;

interface JoiningConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string | null;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function JoiningConfirmationDialog({
  open,
  onOpenChange,
  offerId,
}: JoiningConfirmationDialogProps) {
  const detailQuery = useOfferDetail(open && offerId ? offerId : '');
  const updateJoiningStatus = useUpdateJoiningStatus();
  const form = useForm<JoiningFormData>({
    resolver: zodResolver(joiningSchema),
    defaultValues: {
      joining_status: 'joined',
      joining_date: '',
      dnj_reason: '',
    },
  });

  const joiningStatus = form.watch('joining_status');

  useEffect(() => {
    if (!open) {
      form.reset({
        joining_status: 'joined',
        joining_date: '',
        dnj_reason: '',
      });
      return;
    }

    if (!detailQuery.data) return;

    form.reset({
      joining_status:
        detailQuery.data.joining_status === 'did_not_join' ? 'did_not_join' : 'joined',
      joining_date: detailQuery.data.joining_date?.slice(0, 10) ?? '',
      dnj_reason: detailQuery.data.dnj_reason ?? '',
    });
  }, [detailQuery.data, form, open]);

  async function onSubmit(values: JoiningFormData) {
    if (!offerId) return;

    try {
      await updateJoiningStatus.mutateAsync({
        offerId,
        data: {
          joining_status: values.joining_status,
          joining_date: values.joining_status === 'joined' ? values.joining_date || null : null,
          dnj_reason:
            values.joining_status === 'did_not_join' ? values.dnj_reason?.trim() || null : null,
        },
      });
      toast.success(
        values.joining_status === 'joined'
          ? 'Joining status updated to joined.'
          : 'Offer marked as did not join.'
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update the joining status.'));
    }
  }

  const offer = detailQuery.data;
  const canUpdateJoining = offer?.status === 'accepted';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Joining Status</DialogTitle>
          <DialogDescription>
            Confirm the final joining outcome for the selected offer.
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
        ) : !canUpdateJoining ? (
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            Joining status can only be updated after the student has accepted the offer.
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, focusFirstFormError)} className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium text-foreground">
                  {offer.student.full_name} - {offer.role} at {offer.company.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Save the final joining outcome for this offer here.
                </p>
              </div>

              <FormField
                control={form.control}
                name="joining_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Joining Status *</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="joined" id="offer-joined" />
                          <Label htmlFor="offer-joined">Joined</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="did_not_join" id="offer-dnj" />
                          <Label htmlFor="offer-dnj">Did Not Join</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {joiningStatus === 'joined' && (
                <FormField
                  control={form.control}
                  name="joining_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {joiningStatus === 'did_not_join' && (
                <FormField
                  control={form.control}
                  name="dnj_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNJ Reason *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Document the approved reason for not joining..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateJoiningStatus.isPending}>
                  {updateJoiningStatus.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Joining Status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
