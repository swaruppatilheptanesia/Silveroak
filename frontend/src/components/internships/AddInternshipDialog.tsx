import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { focusFirstFormError } from '@/lib/formErrors';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  INTERNSHIP_TYPE_CONFIG, MINIMUM_STIPEND_AMOUNT,
  type InternshipType, type StipendFrequency,
} from '@/types/internship';

const DEPARTMENTS = ['Computer Science', 'Information Technology', 'Artificial Intelligence', 'Electronics', 'Mechanical'];
const BATCHES = ['2025', '2026', '2027'];

const internshipSchema = z.object({
  student_name: z.string().trim().min(1, 'Student name is required').max(100),
  enrollment_number: z.string().trim().min(1, 'Enrollment number is required').max(20),
  department: z.string().min(1, 'Department is required'),
  batch: z.string().min(1, 'Batch is required'),
  company_name: z.string().trim().min(1, 'Company name is required').max(100),
  role: z.string().trim().min(1, 'Role is required').max(100),
  internship_type: z.string().min(1, 'Internship type is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  stipend_amount: z.string().optional().or(z.literal('')),
  stipend_frequency: z.string().optional().or(z.literal('')),
  remarks: z.string().trim().max(500).optional().or(z.literal('')),
}).refine(
  (d) => !d.start_date || !d.end_date || new Date(d.end_date) > new Date(d.start_date),
  { message: 'End date must be after start date', path: ['end_date'] }
).refine(
  (d) => {
    if (d.internship_type !== 'stipend_based') return true;
    const amt = Number(d.stipend_amount);
    return d.stipend_amount && !isNaN(amt) && amt >= MINIMUM_STIPEND_AMOUNT;
  },
  { message: `Minimum stipend is ₹${MINIMUM_STIPEND_AMOUNT.toLocaleString('en-IN')}/month`, path: ['stipend_amount'] }
);

type InternshipFormData = z.infer<typeof internshipSchema>;

interface AddInternshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddInternshipDialog({ open, onOpenChange }: AddInternshipDialogProps) {
  const form = useForm<InternshipFormData>({
    resolver: zodResolver(internshipSchema),
    defaultValues: {
      student_name: '', enrollment_number: '', department: '', batch: '',
      company_name: '', role: '', internship_type: '', start_date: '',
      end_date: '', stipend_amount: '', stipend_frequency: '', remarks: '',
    },
  });

  const internshipType = form.watch('internship_type');
  const stipendAmount = form.watch('stipend_amount');
  const showStipendFields = internshipType === 'paid' || internshipType === 'stipend_based';
  const belowMinimum = internshipType === 'stipend_based' && stipendAmount && Number(stipendAmount) < MINIMUM_STIPEND_AMOUNT;

  const onSubmit = (data: InternshipFormData) => {
    toast.success(`Internship record created for ${data.student_name}`);
    form.reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Internship Record
          </DialogTitle>
          <DialogDescription>
            Manually create an internship record for off-campus or untracked internships.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, focusFirstFormError)} className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="student_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Student Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., Rahul Sharma" maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="enrollment_number" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Enrollment No. *</FormLabel>
                  <FormControl><Input placeholder="e.g., 21BCE1234" maxLength={20} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Department *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="batch" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Batch *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {BATCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="company_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Company Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., TechCorp Solutions" maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Role / Title *</FormLabel>
                  <FormControl><Input placeholder="e.g., Software Intern" maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="internship_type" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Internship Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(INTERNSHIP_TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Start Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="end_date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">End Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {showStipendFields && (
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="stipend_amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      Stipend Amount (₹/mo) {internshipType === 'stipend_based' && '*'}
                    </FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 25000" min={0} {...field} /></FormControl>
                    <FormMessage />
                    {belowMinimum && !form.formState.errors.stipend_amount && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Below minimum (₹{MINIMUM_STIPEND_AMOUNT.toLocaleString('en-IN')}/mo)
                      </p>
                    )}
                  </FormItem>
                )} />
                <FormField control={form.control} name="stipend_frequency" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="lump_sum">Lump Sum</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            <FormField control={form.control} name="remarks" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Remarks (optional)</FormLabel>
                <FormControl><Textarea placeholder="Any additional notes..." rows={2} maxLength={500} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit">Create Record</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
