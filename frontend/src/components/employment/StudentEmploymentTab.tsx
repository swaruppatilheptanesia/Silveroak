import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Briefcase, Download, Loader2, Lock, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { EmploymentCloseDialog } from '@/components/employment/EmploymentCloseDialog';
import {
  useCloseEmployment,
  useCreateEmployment,
  useDeleteEmployment,
  useStudentEmployments,
} from '@/hooks/use-student-api';
import { formatApiErrorMessage } from '@/lib/apiError';
import { formatDate, formatLPA } from '@/lib/formatters';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import type { ApiEmployment } from '@/types/student';

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time_job', label: 'Full-Time Job' },
  { value: 'part-time', label: 'Part-Time' },
] as const;

function employmentTypeLabel(value: string | null): string {
  return EMPLOYMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? (value || 'Not specified');
}

const emptyDraft = { employment_type: '', company_name: '', designation: '', package_lpa: '' };

export function StudentEmploymentTab() {
  const employmentsQuery = useStudentEmployments();
  const createEmployment = useCreateEmployment();
  const closeEmployment = useCloseEmployment();
  const deleteEmployment = useDeleteEmployment();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [offerLetter, setOfferLetter] = useState<File | null>(null);
  const offerLetterInputRef = useRef<HTMLInputElement | null>(null);
  const [closeTarget, setCloseTarget] = useState<ApiEmployment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiEmployment | null>(null);

  const employments = employmentsQuery.data ?? [];

  function resetForm() {
    setShowForm(false);
    setDraft(emptyDraft);
    setOfferLetter(null);
    if (offerLetterInputRef.current) offerLetterInputRef.current.value = '';
  }

  async function handleAdd() {
    if (!draft.employment_type || !draft.company_name.trim() || !draft.designation.trim()) {
      toast.error('Employment type, company, and designation are required.');
      return;
    }
    if (!offerLetter) {
      toast.error('An offer letter document is required.');
      return;
    }
    const packageValue = draft.package_lpa.trim() ? Number(draft.package_lpa) : null;
    if (packageValue != null && !Number.isFinite(packageValue)) {
      toast.error('Package must be a valid number.');
      return;
    }
    try {
      await createEmployment.mutateAsync({
        data: {
          employment_type: draft.employment_type,
          company_name: draft.company_name.trim(),
          designation: draft.designation.trim(),
          package_lpa: packageValue,
        },
        file: offerLetter,
      });
      toast.success('Employment added.');
      resetForm();
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to add employment.'));
    }
  }

  async function handleClose(file: File) {
    if (!closeTarget) return;
    try {
      await closeEmployment.mutateAsync({ id: closeTarget.id, file });
      toast.success('Employment closed.');
      setCloseTarget(null);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to close employment.'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteEmployment.mutateAsync(deleteTarget.id);
      toast.success('Employment removed.');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to remove employment.'));
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Employment
            </CardTitle>
            <CardDescription>
              Add each employment you take up. Closing an entry requires a completion proof and locks it.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm((value) => !value)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'Close Form' : 'Add Employment'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <div className="space-y-4 rounded-lg border border-primary/30 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emp_type">Employment Type</Label>
                <Select
                  value={draft.employment_type || undefined}
                  onValueChange={(value) => setDraft((current) => ({ ...current, employment_type: value }))}
                >
                  <SelectTrigger id="emp_type">
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp_package">Package (LPA)</Label>
                <Input
                  id="emp_package"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.package_lpa}
                  onChange={(event) => setDraft((current) => ({ ...current, package_lpa: event.target.value }))}
                  placeholder="e.g. 6"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp_company">Company Name</Label>
                <Input
                  id="emp_company"
                  value={draft.company_name}
                  onChange={(event) => setDraft((current) => ({ ...current, company_name: event.target.value }))}
                  placeholder="e.g. Infosys"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp_designation">Designation</Label>
                <Input
                  id="emp_designation"
                  value={draft.designation}
                  onChange={(event) => setDraft((current) => ({ ...current, designation: event.target.value }))}
                  placeholder="e.g. Software Engineer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp_offer_letter">
                Offer letter <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={offerLetterInputRef}
                id="emp_offer_letter"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => setOfferLetter(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">PDF files only. Required.</p>
              {offerLetter ? <p className="text-xs text-muted-foreground">Ready to upload: {offerLetter.name}</p> : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={createEmployment.isPending}>
                {createEmployment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Employment
              </Button>
            </div>
          </div>
        ) : null}

        {employmentsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading employment…
          </div>
        ) : employmentsQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load employment</AlertTitle>
            <AlertDescription>{formatApiErrorMessage(employmentsQuery.error, 'Please refresh and try again.')}</AlertDescription>
          </Alert>
        ) : employments.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No employment added"
            description="Add an employment entry when you take up a job or internship."
            compact
          />
        ) : (
          <div className="space-y-3">
            {employments.map((employment) => {
              const closed = employment.status === 'closed';
              return (
                <div key={employment.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{employment.company_name || 'Company'}</p>
                        <Badge variant={closed ? 'secondary' : 'success'}>{closed ? 'Closed' : 'Active'}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {employment.designation || 'Role'} · {employmentTypeLabel(employment.employment_type)}
                        {employment.package_lpa != null ? ` · ${formatLPA(employment.package_lpa)}` : ''}
                      </p>
                      {closed && employment.closed_at ? (
                        <p className="mt-1 text-xs text-muted-foreground">Closed on {formatDate(employment.closed_at)}</p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap gap-x-4">
                        {employment.offer_letter_url ? (
                          <Button variant="link" className="h-auto p-0 text-sm" asChild>
                            <a href={resolveBackendAssetUrl(employment.offer_letter_url)} target="_blank" rel="noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              Offer letter
                            </a>
                          </Button>
                        ) : null}
                        {closed && employment.completion_proof_url ? (
                          <Button variant="link" className="h-auto p-0 text-sm" asChild>
                            <a href={resolveBackendAssetUrl(employment.completion_proof_url)} target="_blank" rel="noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              {employment.completion_proof_name || 'Completion proof'}
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {closed ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" /> Locked
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setCloseTarget(employment)}>
                          Close
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(employment)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <EmploymentCloseDialog
        open={Boolean(closeTarget)}
        onOpenChange={(open) => (open ? undefined : setCloseTarget(null))}
        companyName={closeTarget?.company_name ?? ''}
        isPending={closeEmployment.isPending}
        onConfirm={handleClose}
      />
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete employment?"
        description={`This will permanently remove "${deleteTarget?.company_name ?? 'this employment'}" from your profile.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isPending={deleteEmployment.isPending}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
