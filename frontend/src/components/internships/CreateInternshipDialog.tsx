import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { focusFirstFormError } from '@/lib/formErrors';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileUp, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useMyOffers } from '@/hooks/use-offer-api';
import { useCreateInternship, useUploadInternshipDocument } from '@/hooks/use-internship-api';
import {
  buildCreateInternshipPayload,
  createEmptyInternshipFormValues,
  type InternshipFormValues,
} from '@/lib/internshipModule';
import {
  INTERNSHIP_TYPE_CONFIG,
  MINIMUM_STIPEND_AMOUNT,
  type InternshipType,
  type StipendFrequency,
} from '@/types/internship';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const internshipSchema = z.object({
  company_name: z.string().trim().min(1, 'Company name is required').max(300),
  role: z.string().trim().min(1, 'Role is required').max(200),
  internship_type: z.enum(['paid', 'unpaid', 'stipend_based']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  stipend_amount: z.string().optional(),
  stipend_frequency: z.enum(['monthly', 'lump_sum']).optional().or(z.literal('')),
  is_receiving_stipend: z.boolean(),
  certificate_url: z.string().min(1, 'Upload offer letter / internship certificate'),
  offer_id: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.end_date && value.start_date && new Date(value.end_date) < new Date(value.start_date)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date cannot be earlier than the start date',
      path: ['end_date'],
    });
  }

  if (value.internship_type === 'unpaid') {
    return;
  }

  if (value.is_receiving_stipend && !value.stipend_amount?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Enter the stipend amount you are receiving',
      path: ['stipend_amount'],
    });
  }

  if (value.internship_type === 'stipend_based' && value.stipend_amount?.trim()) {
    const stipendAmount = Number(value.stipend_amount);
    if (Number.isNaN(stipendAmount) || stipendAmount < MINIMUM_STIPEND_AMOUNT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Minimum stipend is Rs ${MINIMUM_STIPEND_AMOUNT.toLocaleString('en-IN')}`,
        path: ['stipend_amount'],
      });
    }
  }
});

interface CreateInternshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedOfferIds?: string[];
}

export function CreateInternshipDialog({
  open,
  onOpenChange,
  linkedOfferIds = [],
}: CreateInternshipDialogProps) {
  const createInternship = useCreateInternship();
  const uploadInternshipDocument = useUploadInternshipDocument();
  const myOffersQuery = useMyOffers();
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<InternshipFormValues>({
    resolver: zodResolver(internshipSchema),
    defaultValues: createEmptyInternshipFormValues(),
  });

  const internshipType = form.watch('internship_type');
  const isReceivingStipend = form.watch('is_receiving_stipend');
  const showStipendFields = internshipType !== 'unpaid';
  const availableOffers = useMemo(() => {
    const linkedIds = new Set(linkedOfferIds);
    return (myOffersQuery.data ?? []).filter(
      (offer) => offer.type === 'internship' && offer.status === 'accepted' && !linkedIds.has(offer.id)
    );
  }, [linkedOfferIds, myOffersQuery.data]);

  useEffect(() => {
    if (internshipType === 'unpaid') {
      form.setValue('is_receiving_stipend', false, { shouldValidate: true });
      form.setValue('stipend_amount', '', { shouldValidate: false });
      form.setValue('stipend_frequency', '', { shouldValidate: false });
      return;
    }

    if (!form.getValues('stipend_frequency')) {
      form.setValue('stipend_frequency', 'monthly', { shouldValidate: false });
    }
  }, [form, internshipType]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset(createEmptyInternshipFormValues());
      setSelectedDocument(null);
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!selectedDocument && !values.certificate_url) {
      form.setError('certificate_url', { message: 'Upload offer letter / internship certificate' });
      return;
    }

    try {
      let certificateUrl = values.certificate_url;
      if (selectedDocument) {
        const uploadedDocument = await uploadInternshipDocument.mutateAsync(selectedDocument);
        certificateUrl = uploadedDocument.certificate_url;
      }

      await createInternship.mutateAsync(buildCreateInternshipPayload({
        ...values,
        certificate_url: certificateUrl,
      }));
      toast.success('Internship record created');
      form.reset(createEmptyInternshipFormValues());
      setSelectedDocument(null);
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create internship record');
    }
  }, focusFirstFormError);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Internship Record
          </DialogTitle>
          <DialogDescription>
            Create a live internship record for your current or completed internship.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            {availableOffers.length > 0 && (
              <FormField
                control={form.control}
                name="offer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link accepted offer</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No linked offer</SelectItem>
                        {availableOffers.map((offer) => (
                          <SelectItem key={offer.id} value={offer.id}>
                            {offer.company_name} - {offer.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Google India" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SWE Intern" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="internship_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internship type</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value as InternshipType)} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(INTERNSHIP_TYPE_CONFIG).map(([type, config]) => (
                          <SelectItem key={type} value={type}>
                            {config.label}
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
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showStipendFields && (
              <>
                <FormField
                  control={form.control}
                  name="is_receiving_stipend"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border px-4 py-3">
                      <div>
                        <FormLabel className="text-sm">Receiving stipend</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Switch this off if the internship is paid in another form or currently unpaid.
                        </p>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="stipend_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stipend amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder={isReceivingStipend ? 'e.g. 25000' : 'Optional'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stipend_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value as StipendFrequency)}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="lump_sum">Lump sum</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <FormField
              control={form.control}
              name="certificate_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer letter / internship certificate</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        ref={documentInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setSelectedDocument(file);
                          field.onChange(file ? file.name : '');
                        }}
                      />
                      {selectedDocument ? (
                        <p className="text-xs text-muted-foreground">
                          Ready to upload: {selectedDocument.name}
                        </p>
                      ) : null}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInternship.isPending || uploadInternshipDocument.isPending}>
                {(createInternship.isPending || uploadInternshipDocument.isPending) ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="mr-2 h-4 w-4" />
                )}
                Create record
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
