import { useState } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Plus, Award, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const certificationSchema = z.object({
  name: z.string().min(2, 'Certification name is required').max(100),
  issuer: z.string().min(2, 'Issuing organization is required').max(100),
  issue_date: z.string().min(1, 'Issue date is required'),
  expiry_date: z.string().optional(),
  credential_id: z.string().max(100).optional(),
  credential_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

type CertificationFormData = z.infer<typeof certificationSchema>;

interface AddCertificationDialogProps {
  onAdd?: (certification: CertificationFormData & { id: string }) => void;
  children?: React.ReactNode;
}

export function AddCertificationDialog({ onAdd, children }: AddCertificationDialogProps) {
  const [open, setOpen] = useState(false);

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

  const onSubmit = (data: CertificationFormData) => {
    const newCertification = {
      ...data,
      id: `cert_${Date.now()}`,
    };
    
    onAdd?.(newCertification);
    toast.success('Certification added successfully!');
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Certification
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Add Certification
          </DialogTitle>
          <DialogDescription>
            Add your professional certifications to enhance your profile
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, focusFirstFormError)} className="space-y-4">
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
              name="credential_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credential ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ABC123XYZ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Add Certification
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
