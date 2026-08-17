import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Building2, Loader2, Save } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUpdateCompany } from '@/hooks/use-employer-api';
import type { ApiCompany, ApiCompanyDetail } from '@/types/employer';
import type { Company as LegacyCompany } from '@/data/mockEmployerData';

interface EditCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: ApiCompany | ApiCompanyDetail | LegacyCompany | null;
}

const companySchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(300, 'Company name must be under 300 characters'),
  industry: z.string().trim().min(1, 'Industry is required').max(100, 'Industry must be under 100 characters'),
  address: z.string().trim().min(1, 'Address is required').max(500, 'Address must be under 500 characters'),
  website: z
    .string()
    .trim()
    .max(255, 'Website must be under 255 characters')
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), 'Enter a valid URL starting with http:// or https://'),
  description: z.string().trim().max(2000, 'Description must be under 2000 characters'),
  status: z.enum(['active', 'inactive']),
});

type CompanyFormState = z.infer<typeof companySchema>;

const emptyForm: CompanyFormState = {
  name: '',
  industry: '',
  address: '',
  website: '',
  description: '',
  status: 'active',
};

function getErrorMessage(error: unknown, fallback = 'Unable to update the company.') {
  return error instanceof Error ? error.message : fallback;
}

// EmployerApiError carries a `code` but is not exported from the service, so read it narrowly.
function getErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code as string | undefined
    : undefined;
}

export default function EditCompanyDialog({ open, onOpenChange, company }: EditCompanyDialogProps) {
  const { toast } = useToast();
  const updateCompany = useUpdateCompany();
  const [formData, setFormData] = useState<CompanyFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !company) return;

    setFormData({
      name: company.name,
      industry: company.industry ?? '',
      address: company.address ?? '',
      website: company.website ?? '',
      description: company.description ?? '',
      status: company.status,
    });
    setErrors({});
  }, [company, open]);

  function validate() {
    const result = companySchema.safeParse(formData);

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
    if (!company || !validate()) return;

    try {
      await updateCompany.mutateAsync({
        companyId: company.id,
        data: {
          name: formData.name.trim(),
          industry: formData.industry.trim() || null,
          address: formData.address.trim() || null,
          website: formData.website.trim() || null,
          description: formData.description.trim() || null,
          status: formData.status,
        },
      });

      toast({
        title: 'Company updated',
        description: `${formData.name.trim()} has been updated successfully.`,
      });
      onOpenChange(false);
    } catch (error) {
      // Renaming onto an existing company is rejected server-side; surface it on the field.
      if (getErrorCode(error) === 'COMPANY_ALREADY_EXISTS') {
        setErrors((current) => ({ ...current, name: getErrorMessage(error) }));
        return;
      }

      toast({
        title: 'Unable to update company',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit Company
          </DialogTitle>
          <DialogDescription>Update live company information for employer management.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-company-name">Company Name</Label>
            <Input
              id="edit-company-name"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-company-industry">Industry</Label>
              <Input
                id="edit-company-industry"
                value={formData.industry}
                onChange={(event) => setFormData((current) => ({ ...current, industry: event.target.value }))}
                className={errors.industry ? 'border-destructive' : ''}
              />
              {errors.industry ? <p className="text-sm text-destructive">{errors.industry}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((current) => ({ ...current, status: value as CompanyFormState['status'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-company-address">Address</Label>
            <Textarea
              id="edit-company-address"
              value={formData.address}
              onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))}
              className={errors.address ? 'border-destructive' : ''}
            />
            {errors.address ? <p className="text-sm text-destructive">{errors.address}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-company-website">Website</Label>
            <Input
              id="edit-company-website"
              value={formData.website}
              onChange={(event) => setFormData((current) => ({ ...current, website: event.target.value }))}
              className={errors.website ? 'border-destructive' : ''}
            />
            {errors.website ? <p className="text-sm text-destructive">{errors.website}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-company-description">Description</Label>
            <Textarea
              id="edit-company-description"
              value={formData.description}
              onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
              className={errors.description ? 'border-destructive' : ''}
              rows={4}
            />
            {errors.description ? <p className="text-sm text-destructive">{errors.description}</p> : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateCompany.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateCompany.isPending}>
            {updateCompany.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
