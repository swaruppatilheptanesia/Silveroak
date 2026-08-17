import { useEffect, useState } from 'react';
import { z } from 'zod';
import { KeyRound, Loader2, Users } from 'lucide-react';
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
import { useCreateRecruiter } from '@/hooks/use-employer-api';
import { useToast } from '@/hooks/use-toast';
import { TemporaryPasswordDialog } from '@/components/shared/TemporaryPasswordDialog';

interface AddRecruiterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

const recruiterSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name must be under 200 characters'),
  email: z.string().trim().email('Enter a valid email address').max(255, 'Email must be under 255 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/u, 'Enter a valid phone number')
    .or(z.literal('')),
  designation: z.string().trim().min(1, 'Designation is required').max(100, 'Designation must be under 100 characters'),
});

type RecruiterFormState = z.infer<typeof recruiterSchema>;

const emptyForm: RecruiterFormState = {
  name: '',
  email: '',
  phone: '',
  designation: '',
};

function getErrorMessage(error: unknown, fallback = 'Unable to add the recruiter.') {
  return error instanceof Error ? error.message : fallback;
}

export default function AddRecruiterDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
}: AddRecruiterDialogProps) {
  const { toast } = useToast();
  const createRecruiter = useCreateRecruiter();
  const [formData, setFormData] = useState<RecruiterFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issuedPassword, setIssuedPassword] = useState<{ password: string; userLabel: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setFormData(emptyForm);
      setErrors({});
    }
  }, [open]);

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

  async function handleSubmit() {
    if (!validate()) return;

    try {
      const result = await createRecruiter.mutateAsync({
        companyId,
        data: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          designation: formData.designation.trim() || null,
        },
      });

      toast({
        title: 'Recruiter added',
        description: `${formData.name.trim()} is verified for ${companyName}. Share the temporary password shown next.`,
      });

      setIssuedPassword({
        password: result.temporary_password,
        userLabel: formData.email.trim(),
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Unable to add recruiter',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add Recruiter
          </DialogTitle>
          <DialogDescription>Create a recruiter account for {companyName}. We'll auto-verify the recruiter and generate a one-time password on save.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recruiter-name">Full Name</Label>
            <Input
              id="recruiter-name"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recruiter-email">Official Email</Label>
            <Input
              id="recruiter-email"
              type="email"
              value={formData.email}
              onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recruiter-phone">Phone</Label>
              <Input
                id="recruiter-phone"
                value={formData.phone}
                onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recruiter-designation">Designation</Label>
              <Input
                id="recruiter-designation"
                value={formData.designation}
                onChange={(event) => setFormData((current) => ({ ...current, designation: event.target.value }))}
                className={errors.designation ? 'border-destructive' : ''}
              />
              {errors.designation ? <p className="text-sm text-destructive">{errors.designation}</p> : null}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
            <span>On save we'll create the user, mark the recruiter verified, and show a one-time password to share with them.</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createRecruiter.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createRecruiter.isPending}>
            {createRecruiter.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add Recruiter
          </Button>
        </DialogFooter>
      </DialogContent>

      <TemporaryPasswordDialog
        open={Boolean(issuedPassword)}
        onOpenChange={(next) => {
          if (!next) setIssuedPassword(null);
        }}
        password={issuedPassword?.password ?? null}
        userLabel={issuedPassword?.userLabel}
      />
    </Dialog>
  );
}
