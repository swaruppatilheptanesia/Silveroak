import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Calendar, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateEngagement } from '@/hooks/use-employer-api';
import { useMasterValues } from '@/hooks/use-master-api';
import { useToast } from '@/hooks/use-toast';
import type { CreateEngagementInput } from '@/types/employer';

interface AddEngagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

const engagementSchema = z.object({
  visitor_type: z.enum(['placement', 'internship', 'campus_visit', 'guest_lecture', 'workshop']),
  academic_year: z.string().trim().min(1, 'Academic year is required').max(20, 'Academic year must be under 20 characters'),
  date: z.string().min(1, 'Date is required'),
  remarks: z.string().trim().min(1, 'Remarks are required').max(1000, 'Remarks must be under 1000 characters'),
  students_hired: z
    .string()
    .trim()
    .refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0), 'Students hired must be a valid number'),
  packages_offered: z.string().trim().max(500, 'Package notes must be under 500 characters'),
});

type EngagementFormState = z.infer<typeof engagementSchema>;

const emptyForm: EngagementFormState = {
  visitor_type: 'placement',
  academic_year: '',
  date: '',
  remarks: '',
  students_hired: '',
  packages_offered: '',
};

const engagementTypeOptions: Array<{ value: CreateEngagementInput['visitor_type']; label: string }> = [
  { value: 'placement', label: 'Placement Drive' },
  { value: 'internship', label: 'Internship Program' },
  { value: 'campus_visit', label: 'Campus Visit' },
  { value: 'guest_lecture', label: 'Guest Lecture' },
  { value: 'workshop', label: 'Workshop' },
];

function getErrorMessage(error: unknown, fallback = 'Unable to add the engagement.') {
  return error instanceof Error ? error.message : fallback;
}

export default function AddEngagementDialog({ open, onOpenChange, companyId }: AddEngagementDialogProps) {
  const { toast } = useToast();
  const createEngagement = useCreateEngagement();
  const academicYearQuery = useMasterValues('academic_year');
  const [formData, setFormData] = useState<EngagementFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const academicYearOptions = useMemo(
    () => [...(academicYearQuery.data ?? [])]
      .sort((left, right) => right.localeCompare(left))
      .map((year) => ({ value: year, label: year })),
    [academicYearQuery.data],
  );

  useEffect(() => {
    if (!open) {
      setFormData(emptyForm);
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (!open || formData.academic_year || academicYearOptions.length === 0) {
      return;
    }

    setFormData((current) => (
      current.academic_year || academicYearOptions.length === 0
        ? current
        : { ...current, academic_year: academicYearOptions[0].value }
    ));
  }, [academicYearOptions, formData.academic_year, open]);

  function validate() {
    const result = engagementSchema.safeParse(formData);

    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.errors) {
      const field = issue.path[0];
      if (typeof field === 'string') {
        fieldErrors[field] = issue.message;
      }
    }
    setErrors(fieldErrors);
    return false;
  }

  async function handleSubmit() {
    if (!validate()) return;

    try {
      await createEngagement.mutateAsync({
        companyId,
        data: {
          visitor_type: formData.visitor_type,
          academic_year: formData.academic_year.trim() || null,
          date: formData.date,
          remarks: formData.remarks.trim() || null,
          students_hired: formData.students_hired.trim() ? Number(formData.students_hired) : undefined,
          packages_offered: formData.packages_offered.trim() || null,
        },
      });

      toast({
        title: 'Engagement added',
        description: 'The company timeline has been updated with the new engagement.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Unable to add engagement',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  const showHiringFields = formData.visitor_type === 'placement' || formData.visitor_type === 'internship';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Add Engagement
          </DialogTitle>
          <DialogDescription>Track a live company interaction for the employer timeline.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Engagement Type</Label>
            <Select
              value={formData.visitor_type}
              onValueChange={(value) => setFormData((current) => ({ ...current, visitor_type: value as CreateEngagementInput['visitor_type'] }))}
            >
              <SelectTrigger className={errors.visitor_type ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select engagement type" />
              </SelectTrigger>
              <SelectContent>
                {engagementTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.visitor_type ? <p className="text-sm text-destructive">{errors.visitor_type}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="engagement-academic-year">Academic Year</Label>
              <SearchableSelect
                options={academicYearOptions}
                value={formData.academic_year}
                onValueChange={(value) => setFormData((current) => ({ ...current, academic_year: value }))}
                placeholder="Select academic year"
                searchPlaceholder="Search academic year..."
                emptyMessage="No academic years found."
                loadingMessage="Loading academic years..."
                isLoading={academicYearQuery.isLoading}
                clearable
              />
              {errors.academic_year ? <p className="text-sm text-destructive">{errors.academic_year}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="engagement-date">Date</Label>
              <Input
                id="engagement-date"
                type="date"
                value={formData.date}
                onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
                className={errors.date ? 'border-destructive' : ''}
              />
              {errors.date ? <p className="text-sm text-destructive">{errors.date}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="engagement-remarks">Remarks</Label>
            <Textarea
              id="engagement-remarks"
              value={formData.remarks}
              onChange={(event) => setFormData((current) => ({ ...current, remarks: event.target.value }))}
              className={errors.remarks ? 'border-destructive' : ''}
              rows={4}
              placeholder="What happened during this interaction?"
            />
            {errors.remarks ? <p className="text-sm text-destructive">{errors.remarks}</p> : null}
          </div>

          {showHiringFields ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="students-hired">Students Hired</Label>
                <Input
                  id="students-hired"
                  type="number"
                  min="0"
                  value={formData.students_hired}
                  onChange={(event) => setFormData((current) => ({ ...current, students_hired: event.target.value }))}
                  className={errors.students_hired ? 'border-destructive' : ''}
                />
                {errors.students_hired ? <p className="text-sm text-destructive">{errors.students_hired}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="packages-offered">Package Notes</Label>
                <Input
                  id="packages-offered"
                  value={formData.packages_offered}
                  onChange={(event) => setFormData((current) => ({ ...current, packages_offered: event.target.value }))}
                  className={errors.packages_offered ? 'border-destructive' : ''}
                  placeholder="8-12 LPA"
                />
                {errors.packages_offered ? <p className="text-sm text-destructive">{errors.packages_offered}</p> : null}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createEngagement.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createEngagement.isPending}>
            {createEngagement.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Engagement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
