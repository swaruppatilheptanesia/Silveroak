import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { focusFirstFormError } from '@/lib/formErrors';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useMasterValues } from '@/hooks/use-master-api';
import type { EngagementRecord } from '@/services/employerService';

const engagementSchema = z.object({
  visitorType: z.enum(['campus_visit', 'internship', 'placement', 'guest_lecture', 'workshop']),
  academicYear: z.string().min(1, 'Academic year is required'),
  date: z.string().min(1, 'Date is required'),
  remarks: z.string().min(5, 'Remarks are required'),
  studentsHired: z.string().optional(),
  packagesOffered: z.string().optional(),
});

type EngagementFormData = z.infer<typeof engagementSchema>;

interface EditEngagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagement: EngagementRecord | null;
  onSave?: (engagement: EngagementRecord) => void;
  onDelete?: (engagementId: string) => void;
}

const visitorTypeLabels: Record<string, string> = {
  campus_visit: 'Campus Visit',
  internship: 'Internship',
  placement: 'Placement',
  guest_lecture: 'Guest Lecture',
  workshop: 'Workshop',
};

export function EditEngagementDialog({ 
  open, 
  onOpenChange, 
  engagement, 
  onSave, 
  onDelete 
}: EditEngagementDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const academicYearQuery = useMasterValues('academic_year');
  const academicYearOptions = useMemo(
    () => [...(academicYearQuery.data ?? [])]
      .sort((left, right) => right.localeCompare(left))
      .map((year) => ({ value: year, label: year })),
    [academicYearQuery.data],
  );

  const form = useForm<EngagementFormData>({
    resolver: zodResolver(engagementSchema),
    defaultValues: {
      visitorType: 'campus_visit',
      academicYear: '',
      date: '',
      remarks: '',
      studentsHired: '',
      packagesOffered: '',
    },
  });

  useEffect(() => {
    if (engagement) {
      form.reset({
        visitorType: engagement.visitorType,
        academicYear: engagement.academicYear,
        date: engagement.date,
        remarks: engagement.remarks,
        studentsHired: engagement.studentsHired?.toString() || '',
        packagesOffered: engagement.packagesOffered || '',
      });
    }
  }, [engagement, form]);

  const handleSave = (data: EngagementFormData) => {
    if (!engagement) return;
    
    const updatedEngagement: EngagementRecord = {
      ...engagement,
      visitorType: data.visitorType,
      academicYear: data.academicYear,
      date: data.date,
      remarks: data.remarks,
      studentsHired: data.studentsHired ? parseInt(data.studentsHired) : undefined,
      packagesOffered: data.packagesOffered || undefined,
    };
    
    onSave?.(updatedEngagement);
    toast.success('Engagement updated successfully!');
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!engagement) return;
    onDelete?.(engagement.id);
    toast.success('Engagement deleted successfully!');
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  if (showDeleteConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Engagement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this engagement record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Engagement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Edit Engagement
          </DialogTitle>
          <DialogDescription>
            Update engagement record details
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave, focusFirstFormError)} className="space-y-4">
            <FormField
              control={form.control}
              name="visitorType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Engagement Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(visitorTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={academicYearOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select academic year"
                        searchPlaceholder="Search academic year..."
                        emptyMessage="No academic years found."
                        loadingMessage="Loading academic years..."
                        isLoading={academicYearQuery.isLoading}
                        clearable
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
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
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Details about the engagement..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="studentsHired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Students Hired</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="packagesOffered"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Packages Offered</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 8-12 LPA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 flex-col sm:flex-row pt-4">
              <Button 
                type="button"
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)}
                className="sm:mr-auto"
              >
                Delete
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default EditEngagementDialog;
