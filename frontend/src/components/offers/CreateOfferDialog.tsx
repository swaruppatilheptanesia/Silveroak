import { useEffect, useMemo, useState } from 'react';
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
import { Label } from '@/components/ui/label';
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
import { useAllApplications } from '@/hooks/use-application-api';
import { useCreateOffer } from '@/hooks/use-offer-api';
import { usePostings } from '@/hooks/use-posting-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import {
  buildCreateOfferPayload,
  createEmptyOfferFormValues,
  getEligibleOfferStudents,
  postingTypeToOfferType,
  type OfferFormValues,
} from '@/lib/offerModule';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';

const offerSchema = z.object({
  posting_id: z.string().min(1, 'Opportunity is required'),
  student_id: z.string().min(1, 'Student is required'),
  type: z.enum(['job', 'internship']),
  role: z.string().trim().min(1, 'Role is required').max(200, 'Role must be under 200 characters'),
  ctc: z.string().optional().or(z.literal('')),
  stipend: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  offer_date: z.string().min(1, 'Offer date is required'),
});

type OfferFormData = z.infer<typeof offerSchema>;

interface CreateOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function CreateOfferDialog({ open, onOpenChange }: CreateOfferDialogProps) {
  const createOffer = useCreateOffer();
  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: createEmptyOfferFormValues(),
  });

  // UI-only filter: narrows the Posting list by posting type (not part of the offer payload).
  const [postingTypeMasterId, setPostingTypeMasterId] = useState<string>('all');
  const postingTypeOptions = usePostingTypeOptions();

  const postingsQuery = usePostings({
    page: 1,
    limit: 100,
    sort_by: 'created_at',
    sort_order: 'desc',
    posting_type_master_id: postingTypeMasterId === 'all' ? undefined : postingTypeMasterId,
  });

  const selectedPostingId = form.watch('posting_id');
  const selectedOfferType = form.watch('type');

  const applicationsQuery = useAllApplications({
    stage: 'offer_released',
    posting_id: selectedPostingId || undefined,
    sort_by: 'applied_at',
    sort_order: 'desc',
  }, Boolean(selectedPostingId));

  const postings = useMemo(() => {
    return (postingsQuery.data?.data ?? []).filter(
      (posting) => posting.status === 'published' || posting.status === 'closed'
    );
  }, [postingsQuery.data]);

  const selectedPosting = postings.find((posting) => posting.id === selectedPostingId);
  const eligibleStudents = useMemo(() => {
    return getEligibleOfferStudents(applicationsQuery.data ?? []);
  }, [applicationsQuery.data]);

  useEffect(() => {
    if (!selectedPosting) return;

    form.setValue('student_id', '');
    form.setValue('type', postingTypeToOfferType(selectedPosting.type), { shouldValidate: true });
    form.setValue('role', selectedPosting.role_name || '', { shouldValidate: true });
    form.setValue('ctc', selectedPosting.ctc ?? '');
    form.setValue('stipend', selectedPosting.stipend ?? '');
    form.setValue('location', selectedPosting.location ?? '');
  }, [form, selectedPosting]);

  useEffect(() => {
    if (open) return;
    form.reset(createEmptyOfferFormValues());
    setPostingTypeMasterId('all');
  }, [form, open]);

  async function onSubmit(values: OfferFormData) {
    if (!selectedPosting) {
      toast.error('Select a valid posting before creating the offer.');
      return;
    }

    const selectedStudent = eligibleStudents.find(
      (application) => application.student.id === values.student_id
    );

    try {
      await createOffer.mutateAsync(buildCreateOfferPayload(values as OfferFormValues, selectedPosting));
      toast.success(
        selectedStudent
          ? `Offer created for ${selectedStudent.student.full_name}.`
          : 'Offer created successfully.'
      );
      form.reset(createEmptyOfferFormValues());
      onOpenChange(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to create the offer.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Offer</DialogTitle>
          <DialogDescription>
            Create a live offer for a student who has already reached the offer-released stage.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, focusFirstFormError)} className="space-y-4 py-2">
            {postingsQuery.error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {getErrorMessage(postingsQuery.error, 'Unable to load postings right now.')}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="offer-posting-type">Posting Type</Label>
              <Select
                value={postingTypeMasterId}
                onValueChange={(value) => {
                  setPostingTypeMasterId(value);
                  // Clear any selected posting so a now-hidden posting can't stay chosen.
                  form.setValue('posting_id', '');
                }}
              >
                <SelectTrigger id="offer-posting-type">
                  <SelectValue placeholder="All posting types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All posting types</SelectItem>
                  {postingTypeOptions.options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FormField
              control={form.control}
              name="posting_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posting *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a published or closed posting" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {postings.map((posting) => (
                        <SelectItem key={posting.id} value={posting.id}>
                          {posting.title} - {posting.company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPosting && (
                    <p className="text-xs text-muted-foreground">
                      {selectedPosting.company.name} • {selectedPosting.role_name} • {selectedPosting.status}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="student_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedPostingId || applicationsQuery.isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedPostingId
                              ? 'Select a student from the live pipeline'
                              : 'Choose a posting first'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eligibleStudents.map((application) => (
                        <SelectItem key={application.student.id} value={application.student.id}>
                          {application.student.full_name} ({application.student.enrollment_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPostingId && applicationsQuery.isLoading && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading eligible students...
                    </p>
                  )}
                  {selectedPostingId && !applicationsQuery.isLoading && (
                    <p className="text-xs text-muted-foreground">
                      {eligibleStudents.length} eligible student(s) found in the live offer-released stage.
                    </p>
                  )}
                  {applicationsQuery.error && selectedPostingId && (
                    <p className="text-xs text-destructive">
                      {getErrorMessage(applicationsQuery.error, 'Unable to load eligible students.')}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select offer type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="job">Job</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <FormControl>
                    <Input placeholder="Software Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedOfferType === 'job' ? (
              <FormField
                control={form.control}
                name="ctc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTC</FormLabel>
                    <FormControl>
                      <Input placeholder="₹8 LPA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="stipend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stipend</FormLabel>
                    <FormControl>
                      <Input placeholder="₹25,000/month" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Bangalore" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="offer_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createOffer.isPending || postingsQuery.isLoading || !selectedPosting}
              >
                {createOffer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Offer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
