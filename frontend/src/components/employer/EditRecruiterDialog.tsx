import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Loader2, Trash2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDeleteRecruiter, useUpdateRecruiter } from '@/hooks/use-employer-api';
import { useToast } from '@/hooks/use-toast';
import type { ApiRecruiter, ApiRecruiterListItem } from '@/types/employer';

interface EditRecruiterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recruiter: ApiRecruiter | ApiRecruiterListItem | null;
}

const recruiterSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name must be under 200 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/u, 'Enter a valid phone number')
    .or(z.literal('')),
  designation: z.string().trim().max(100, 'Designation must be under 100 characters'),
});

type RecruiterFormState = z.infer<typeof recruiterSchema>;

const emptyForm: RecruiterFormState = {
  name: '',
  phone: '',
  designation: '',
};

function getErrorMessage(error: unknown, fallback = 'Unable to update the recruiter.') {
  return error instanceof Error ? error.message : fallback;
}

export default function EditRecruiterDialog({ open, onOpenChange, recruiter }: EditRecruiterDialogProps) {
  const { toast } = useToast();
  const updateRecruiter = useUpdateRecruiter();
  const deleteRecruiter = useDeleteRecruiter();
  const [formData, setFormData] = useState<RecruiterFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open || !recruiter) return;
    setFormData({
      name: recruiter.name,
      phone: recruiter.phone ?? '',
      designation: recruiter.designation ?? '',
    });
    setErrors({});
    setConfirmSaveOpen(false);
    setConfirmDeleteOpen(false);
  }, [open, recruiter]);

  function validate() {
    const result = recruiterSchema.safeParse(formData);

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

  async function commitSave() {
    if (!recruiter) return;

    await updateRecruiter.mutateAsync({
      recruiterId: recruiter.id,
      data: {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        designation: formData.designation.trim() || null,
      },
    });

    toast({
      title: 'Recruiter updated',
      description: `${formData.name.trim()} has been updated successfully.`,
    });
    onOpenChange(false);
  }

  async function handleSave() {
    if (!recruiter || !validate()) return;
    setConfirmSaveOpen(true);
  }

  async function handleConfirmSave() {
    try {
      await commitSave();
      setConfirmSaveOpen(false);
    } catch (error) {
      toast({
        title: 'Unable to update recruiter',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function handleDelete() {
    if (!recruiter) return;
    setConfirmDeleteOpen(true);
  }

  async function handleConfirmDelete() {
    if (!recruiter) return;

    try {
      await deleteRecruiter.mutateAsync(recruiter.id);
      toast({
        title: 'Recruiter removed',
        description: `${recruiter.name} has been removed from the company.`,
      });
      onOpenChange(false);
      setConfirmDeleteOpen(false);
    } catch (error) {
      toast({
        title: 'Unable to remove recruiter',
        description: getErrorMessage(error, 'Unable to remove the recruiter.'),
        variant: 'destructive',
      });
    }
  }

  if (!recruiter) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Edit Recruiter
          </DialogTitle>
          <DialogDescription>Update the live recruiter record. Email is read-only after creation.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-recruiter-name">Full Name</Label>
            <Input
              id="edit-recruiter-name"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-recruiter-email">Email</Label>
            <Input id="edit-recruiter-email" value={recruiter.email} readOnly disabled />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-recruiter-phone">Phone</Label>
              <Input
                id="edit-recruiter-phone"
                value={formData.phone}
                onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-recruiter-designation">Designation</Label>
              <Input
                id="edit-recruiter-designation"
                value={formData.designation}
                onChange={(event) => setFormData((current) => ({ ...current, designation: event.target.value }))}
                className={errors.designation ? 'border-destructive' : ''}
              />
              {errors.designation ? <p className="text-sm text-destructive">{errors.designation}</p> : null}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteRecruiter.isPending || updateRecruiter.isPending}
          >
            {deleteRecruiter.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Remove
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteRecruiter.isPending || updateRecruiter.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateRecruiter.isPending || deleteRecruiter.isPending}>
              {updateRecruiter.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={`Save changes for ${recruiter?.name ?? 'recruiter'}?`}
        description="This will update the recruiter record in the live registry."
        confirmLabel="Save Changes"
        isPending={updateRecruiter.isPending}
        onConfirm={handleConfirmSave}
      />

      <ConfirmActionDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Remove ${recruiter?.name ?? 'recruiter'}?`}
        description="This will permanently remove the recruiter from the company registry."
        confirmLabel="Remove Recruiter"
        confirmVariant="destructive"
        isPending={deleteRecruiter.isPending}
        onConfirm={handleConfirmDelete}
      />
    </Dialog>
  );
}
