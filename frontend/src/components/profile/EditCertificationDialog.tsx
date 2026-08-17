import { useState, useEffect } from 'react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Award, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { Certification } from '@/types/student';

const certificationSchema = z.object({
  name: z.string().min(2, 'Certification name is required').max(100),
  issuer: z.string().min(2, 'Issuing organization is required').max(100),
  issue_date: z.string().min(1, 'Issue date is required'),
  expiry_date: z.string().optional(),
  credential_id: z.string().max(100).optional(),
  credential_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

type CertificationFormData = z.infer<typeof certificationSchema>;

interface EditCertificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certification: Certification | null;
  onSave?: (certification: Certification) => void;
  onDelete?: (certificationId: string) => void;
}

export function EditCertificationDialog({ 
  open, 
  onOpenChange, 
  certification, 
  onSave, 
  onDelete 
}: EditCertificationDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm<CertificationFormData>({
    resolver: zodResolver(certificationSchema),
    defaultValues: {
      name: '',
      issuer: '',
      issue_date: '',
      expiry_date: '',
      credential_id: '',
      credential_url: '',
    },
  });

  useEffect(() => {
    if (certification) {
      form.reset({
        name: certification.name,
        issuer: certification.issuer,
        issue_date: certification.issue_date,
        expiry_date: certification.expiry_date || '',
        credential_id: '',
        credential_url: certification.credential_url || '',
      });
    }
  }, [certification, form]);

  const handleSave = (data: CertificationFormData) => {
    if (!certification) return;
    
    const updatedCertification: Certification = {
      ...certification,
      name: data.name,
      issuer: data.issuer,
      issue_date: data.issue_date,
      expiry_date: data.expiry_date || undefined,
      credential_url: data.credential_url || undefined,
    };
    
    onSave?.(updatedCertification);
    toast.success('Certification updated successfully!');
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!certification) return;
    onDelete?.(certification.id);
    toast.success('Certification deleted successfully!');
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  if (showDeleteConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Certification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{certification?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Certification
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
            <Award className="h-5 w-5 text-primary" />
            Edit Certification
          </DialogTitle>
          <DialogDescription>
            Update your certification details
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave, focusFirstFormError)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certification Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., AWS Solutions Architect" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issuer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issuing Organization *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Amazon Web Services" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
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
              name="credential_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Credential URL
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://verify.example.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
