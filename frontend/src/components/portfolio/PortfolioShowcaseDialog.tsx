import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { focusFirstFormError } from '@/lib/formErrors';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ExternalLink, FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RequiredLabel } from '@/components/shared/RequiredLabel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ApiMyInternship } from '@/types/internship';
import type { CreateShowcaseInput } from '@/types/portfolio';
import { formatPortfolioOutcomeList, parsePortfolioOutcomeList } from '@/lib/portfolioModule';
import { formatDate } from '@/lib/formatters';
import { useUploadShowcaseProof } from '@/hooks/use-portfolio-api';
import { resolveBackendAssetUrl } from '@/lib/studentModule';

const showcaseSchema = z.object({
  linked_internship_id: z.string().optional().or(z.literal('')),
  company_name: z.string().trim().min(1, 'Company name is required').max(300),
  role: z.string().trim().min(1, 'Role is required').max(200),
  duration_months: z.union([z.coerce.number().int().min(0), z.nan()]).optional(),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  key_outcomes: z.string().trim().min(1, 'Add at least one key outcome'),
  proof_url: z.string().trim().refine((value) => !value || /^(https?:\/\/|\/)/i.test(value), 'Enter a valid URL or uploaded file path').optional().or(z.literal('')),
});

type ShowcaseFormValues = z.infer<typeof showcaseSchema>;

function getDurationMonths(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return undefined;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return undefined;

  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return months > 0 ? months : undefined;
}

function getDefaultValues(): ShowcaseFormValues {
  return {
    linked_internship_id: '',
    company_name: '',
    role: '',
    duration_months: Number.NaN,
    start_date: '',
    end_date: '',
    key_outcomes: '',
    proof_url: '',
  };
}

export function PortfolioShowcaseDialog({
  open,
  onOpenChange,
  internships,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  internships: ApiMyInternship[];
  isPending?: boolean;
  onSubmit: (data: CreateShowcaseInput) => Promise<void> | void;
}) {
  const form = useForm<ShowcaseFormValues>({
    resolver: zodResolver(showcaseSchema),
    defaultValues: getDefaultValues(),
  });
  const proofInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const uploadShowcaseProof = useUploadShowcaseProof();

  useEffect(() => {
    if (!open) {
      form.reset(getDefaultValues());
      setSelectedProofFile(null);
      if (proofInputRef.current) {
        proofInputRef.current.value = '';
      }
    }
  }, [form, open]);

  const linkedInternshipId = form.watch('linked_internship_id');

  useEffect(() => {
    if (!linkedInternshipId) return;

    const linkedInternship = internships.find((internship) => internship.id === linkedInternshipId);
    if (!linkedInternship) return;

    form.setValue('company_name', linkedInternship.company_name, { shouldDirty: true });
    form.setValue('role', linkedInternship.role, { shouldDirty: true });
    form.setValue('start_date', linkedInternship.start_date?.slice(0, 10) ?? '', { shouldDirty: true });
    form.setValue('end_date', linkedInternship.end_date?.slice(0, 10) ?? '', { shouldDirty: true });
    form.setValue(
      'duration_months',
      linkedInternship.end_date
        ? getDurationMonths(linkedInternship.start_date, linkedInternship.end_date) ?? Number.NaN
        : Number.NaN,
      { shouldDirty: true }
    );
  }, [form, internships, linkedInternshipId]);

  const selectedInternship = internships.find((internship) => internship.id === linkedInternshipId);
  const proofUrl = form.watch('proof_url');

  async function handleProofUpload() {
    if (!selectedProofFile) {
      toast.error('Select a certificate file first.');
      return;
    }

    try {
      const uploaded = await uploadShowcaseProof.mutateAsync(selectedProofFile);
      form.setValue('proof_url', uploaded.proof_url, { shouldDirty: true, shouldValidate: true });
      toast.success('Internship completion certificate uploaded successfully.');
      setSelectedProofFile(null);
      if (proofInputRef.current) {
        proofInputRef.current.value = '';
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload the certificate.');
    }
  }

  function handleSubmit(values: ShowcaseFormValues) {
    return onSubmit({
      linked_internship_id: values.linked_internship_id || null,
      company_name: values.company_name.trim(),
      role: values.role.trim(),
      duration_months: Number.isFinite(values.duration_months) ? values.duration_months : null,
      start_date: values.start_date || null,
      end_date: values.end_date || null,
      key_outcomes: parsePortfolioOutcomeList(values.key_outcomes),
      proof_url: values.proof_url?.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Internship Showcase</DialogTitle>
          <DialogDescription>
            Create a recruiter-facing internship summary. You can optionally link it to one of your live internship records.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => void handleSubmit(values), focusFirstFormError)} className="space-y-4">
            <FormField
              control={form.control}
              name="linked_internship_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link Existing Internship Record</FormLabel>
                  <Select value={field.value || 'manual'} onValueChange={(value) => field.onChange(value === 'manual' ? '' : value)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Optional: choose an internship record" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Manual entry only</SelectItem>
                      {internships.map((internship) => (
                        <SelectItem key={internship.id} value={internship.id}>
                          {internship.company_name} • {internship.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedInternship ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                Linked to {selectedInternship.company_name} • {selectedInternship.role}
                {selectedInternship.start_date ? ` • ${formatDate(selectedInternship.start_date)}` : ''}
                {selectedInternship.end_date ? ` to ${formatDate(selectedInternship.end_date)}` : ''}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <RequiredLabel>Company Name</RequiredLabel>
                    </FormLabel>
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
                    <FormLabel>
                      <RequiredLabel>Role</RequiredLabel>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SWE Intern" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Months)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={Number.isFinite(field.value) ? String(field.value) : ''}
                        onChange={(event) => field.onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="proof_url"
                render={() => (
                  <FormItem>
                    <FormLabel>Internship Completion Certificate (Optional)</FormLabel>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          ref={proofInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
                          onChange={(event) => setSelectedProofFile(event.target.files?.[0] ?? null)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!selectedProofFile || uploadShowcaseProof.isPending}
                          onClick={() => void handleProofUpload()}
                        >
                          {uploadShowcaseProof.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <FileUp className="mr-2 h-4 w-4" />
                          )}
                          Upload Certificate
                        </Button>
                      </div>
                      {proofUrl ? (
                        <Button variant="ghost" asChild className="px-0">
                          <a href={resolveBackendAssetUrl(proofUrl)} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View uploaded certificate
                          </a>
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
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
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="key_outcomes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <RequiredLabel>Key Outcomes</RequiredLabel>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder={'Add one achievement per line.\nBuilt a dashboard used by 200+ employees\nImproved response time by 40%'}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    One outcome per line. These become bullet points in your portfolio.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Showcase
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
