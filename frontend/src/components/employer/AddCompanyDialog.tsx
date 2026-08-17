import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AlertTriangle, Building2, Loader2 } from 'lucide-react';
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
import { useCompanies, useCreateCompany } from '@/hooks/use-employer-api';
import {
  buildCompanySearchTerm,
  findExactCompanyMatch,
  findSimilarCompanies,
} from '@/lib/employerModule';
import { useToast } from '@/hooks/use-toast';

interface AddCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const companySchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(300, 'Company name must be under 300 characters'),
  industry: z.string().trim().min(1, 'Industry is required').max(100, 'Industry must be under 100 characters'),
  address: z.string().trim().min(1, 'Address is required').max(500, 'Address must be under 500 characters'),
  website: z.string().trim().max(255, 'Website must be under 255 characters').optional().or(z.literal('')),
  description: z.string().trim().max(2000, 'Description must be under 2000 characters').optional().or(z.literal('')),
});

type CompanyFormState = z.infer<typeof companySchema>;

const emptyForm: CompanyFormState = {
  name: '',
  industry: '',
  address: '',
  website: '',
  description: '',
};

function getErrorMessage(error: unknown, fallback = 'Unable to save the company.') {
  return error instanceof Error ? error.message : fallback;
}

// EmployerApiError carries a `code` but is not exported from the service, so read it narrowly.
function getErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code as string | undefined
    : undefined;
}

const SUGGESTION_MIN_LENGTH = 2;
const SUGGESTION_DEBOUNCE_MS = 300;

export default function AddCompanyDialog({ open, onOpenChange }: AddCompanyDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const createCompany = useCreateCompany();
  const [formData, setFormData] = useState<CompanyFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [debouncedName, setDebouncedName] = useState('');

  useEffect(() => {
    if (!open) {
      setFormData(emptyForm);
      setErrors({});
      setDebouncedName('');
    }
  }, [open]);

  // Debounce locally — there is no shared useDebounce hook in this codebase.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(formData.name.trim()), SUGGESTION_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [formData.name]);

  const suggestionSearch =
    debouncedName.length >= SUGGESTION_MIN_LENGTH ? buildCompanySearchTerm(debouncedName) : '';
  const suggestionsEnabled = open && suggestionSearch.length > 0;
  const { data: suggestionData } = useCompanies(
    { search: suggestionSearch, limit: 20 },
    suggestionsEnabled,
  );
  const candidates = suggestionsEnabled ? suggestionData?.data ?? [] : [];

  const exactMatch = useMemo(
    () => findExactCompanyMatch(formData.name, candidates),
    [formData.name, candidates],
  );
  const similarCompanies = useMemo(
    () => findSimilarCompanies(formData.name, candidates),
    [formData.name, candidates],
  );

  function handleUseExisting(companyId: string) {
    onOpenChange(false);
    navigate(`/admin/companies/${companyId}`);
  }

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
    if (!validate()) return;

    try {
      await createCompany.mutateAsync({
        name: formData.name.trim(),
        industry: formData.industry.trim() || null,
        address: formData.address.trim() || null,
        website: formData.website.trim() || null,
        description: formData.description.trim() || null,
      });

      toast({
        title: 'Company added',
        description: `${formData.name.trim()} is now available in the employer module.`,
      });
      onOpenChange(false);
    } catch (error) {
      // The server runs the same duplicate check; show it on the field, not as a toast.
      if (getErrorCode(error) === 'COMPANY_ALREADY_EXISTS') {
        setErrors((current) => ({ ...current, name: getErrorMessage(error) }));
        return;
      }

      toast({
        title: 'Unable to add company',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add New Company
          </DialogTitle>
          <DialogDescription>Create a live company record for future postings, recruiters, and engagements.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company-name"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              className={errors.name ? 'border-destructive' : ''}
              placeholder="TechCorp Solutions"
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}

            {exactMatch ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    A similar company already exists. Please select it from the list.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseExisting(exactMatch.id)}
                  >
                    Use {exactMatch.name}
                  </Button>
                </div>
              </div>
            ) : null}

            {!exactMatch && similarCompanies.length > 0 ? (
              <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                <p className="text-sm text-muted-foreground">
                  Similar companies already exist. Select one instead of creating a duplicate, or
                  continue if this is a different company.
                </p>
                <div className="flex flex-wrap gap-2">
                  {similarCompanies.map((company) => (
                    <Button
                      key={company.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleUseExisting(company.id)}
                    >
                      {company.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-industry">
              Industry <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company-industry"
              value={formData.industry}
              onChange={(event) => setFormData((current) => ({ ...current, industry: event.target.value }))}
              className={errors.industry ? 'border-destructive' : ''}
              placeholder="Information Technology"
            />
            {errors.industry ? <p className="text-sm text-destructive">{errors.industry}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-address">
              Address <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="company-address"
              value={formData.address}
              onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))}
              className={errors.address ? 'border-destructive' : ''}
              placeholder="Full company address"
            />
            {errors.address ? <p className="text-sm text-destructive">{errors.address}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-website">
              Website <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="company-website"
              value={formData.website}
              onChange={(event) => setFormData((current) => ({ ...current, website: event.target.value }))}
              className={errors.website ? 'border-destructive' : ''}
              placeholder="company.com"
            />
            {errors.website ? <p className="text-sm text-destructive">{errors.website}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-description">
              Description <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="company-description"
              value={formData.description}
              onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
              className={errors.description ? 'border-destructive' : ''}
              placeholder="Brief description of the company and its hiring focus"
              rows={4}
            />
            {errors.description ? <p className="text-sm text-destructive">{errors.description}</p> : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createCompany.isPending}>
            Cancel
          </Button>
          {/* Exact duplicates are blocked; near matches only warn, so Save stays enabled. */}
          <Button onClick={handleSubmit} disabled={createCompany.isPending || Boolean(exactMatch)}>
            {createCompany.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Company
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
