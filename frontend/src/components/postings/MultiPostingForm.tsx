import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  FileUp,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { UserScopeSelector } from '@/components/admin/UserScopeSelector'; // Student Visibility hidden per request
import { LocationChipsInput } from '@/components/postings/LocationChipsInput';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useMasterValues } from '@/hooks/use-master-api';
import { useUploadPostingJobDescription } from '@/hooks/use-posting-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import type { ApiCompany } from '@/types/employer';
import type { ApiPostingStatus } from '@/types/posting';
import { type PostingFormValues } from '@/lib/postingModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';

type PostingRoleDraft = {
  role_name: string;
  posting_type_master_id: string;
  locations: string[];
  work_mode: PostingFormValues['work_mode'] | '';
  ctc: string;
  stipend: string;
  duration_value: string;
  duration_unit: PostingFormValues['duration_unit'];
  role_description: string;
};

type FormMode = 'draft' | 'primary' | 'secondary';

interface MultiPostingFormProps {
  title: string;
  subtitle: string;
  companies: ApiCompany[];
  initialValues: PostingFormValues;
  status?: ApiPostingStatus;
  disableCompanySelection?: boolean;
  primaryLabel: string;
  primaryPending?: boolean;
  onPrimaryAction: (values: PostingFormValues[]) => Promise<void> | void;
  draftLabel?: string;
  draftPending?: boolean;
  onDraftAction?: (values: PostingFormValues[]) => Promise<void> | void;
  secondaryLabel?: string;
  secondaryPending?: boolean;
  onSecondaryAction?: (values: PostingFormValues[]) => Promise<void> | void;
}

function getStatusBadge(status?: ApiPostingStatus) {
  if (!status) return null;
  if (status === 'draft') return <Badge variant="warning">Draft</Badge>;
  if (status === 'published') return <Badge variant="success">Published</Badge>;
  return <Badge variant="secondary">Closed</Badge>;
}

function createEmptyRoleDraft(): PostingRoleDraft {
  return {
    role_name: '',
    posting_type_master_id: '',
    locations: [],
    work_mode: '',
    ctc: '',
    stipend: '',
    duration_value: '',
    duration_unit: 'months',
    role_description: '',
  };
}

function cloneRoleDraft(previous: PostingRoleDraft | null): PostingRoleDraft {
  if (!previous) return createEmptyRoleDraft();
  return { ...previous };
}

function normalizeNullableString(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function safeTrim(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseInteger(value: string, fallback = 0): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function buildPostingTitle(prefix: string | null | undefined, roleName: string | null | undefined) {
  const trimmedPrefix = safeTrim(prefix);
  const trimmedRole = safeTrim(roleName);
  if (!trimmedPrefix) return trimmedRole;
  if (!trimmedRole) return trimmedPrefix;
  return `${trimmedPrefix} - ${trimmedRole}`;
}

function buildCreateValues(shared: PostingFormValues, role: PostingRoleDraft): PostingFormValues {
  return {
    ...shared,
    title: buildPostingTitle(shared.title, role.role_name),
    role_name: safeTrim(role.role_name),
    posting_type_master_id: role.posting_type_master_id || shared.posting_type_master_id,
    // Per-role locations take precedence; fall back to any shared locations.
    locations: role.locations.length > 0 ? role.locations : shared.locations,
    work_mode: (role.work_mode || shared.work_mode) as PostingFormValues['work_mode'],
    // ctc/stipend hold the free-typed range string verbatim (e.g. "3 - 6 LPA").
    ctc: role.ctc || shared.ctc,
    stipend: role.stipend || shared.stipend,
    duration_value: role.duration_value || shared.duration_value,
    duration_unit: role.duration_value ? role.duration_unit : shared.duration_unit,
    role_description: normalizeNullableString(role.role_description ?? shared.role_description),
  };
}

export function MultiPostingForm({
  title,
  subtitle,
  companies,
  initialValues,
  status,
  disableCompanySelection = false,
  primaryLabel,
  primaryPending = false,
  onPrimaryAction,
  draftLabel,
  draftPending = false,
  onDraftAction,
  secondaryLabel,
  secondaryPending = false,
  onSecondaryAction,
}: MultiPostingFormProps) {
  const [sharedValues, setSharedValues] = useState<PostingFormValues>(initialValues);
  const [roleRows, setRoleRows] = useState<PostingRoleDraft[]>(() => [createEmptyRoleDraft()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const jobDescriptionInputRef = useRef<HTMLInputElement | null>(null);
  const academicYearOptionsQuery = useMasterValues('academic_year');
  const { options: postingTypeOptions } = usePostingTypeOptions();
  const uploadJobDescription = useUploadPostingJobDescription();

  const companyOptions = useMemo(
    () => companies.map((company) => ({
      value: company.id,
      label: company.name,
      description: company.industry || undefined,
      keywords: [company.website || '', company.address || ''].filter(Boolean),
    })),
    [companies],
  );

  const academicYearOptions = useMemo(
    () => [...(academicYearOptionsQuery.data ?? [])]
      .sort((left, right) => right.localeCompare(left))
      .map((year) => ({ value: year, label: year })),
    [academicYearOptionsQuery.data],
  );

  const actionButtonsDisabled = primaryPending || draftPending || secondaryPending || uploadJobDescription.isPending;

  useEffect(() => {
    setSharedValues(initialValues);
    setRoleRows([createEmptyRoleDraft()]);
    setErrors({});
    if (jobDescriptionInputRef.current) {
      jobDescriptionInputRef.current.value = '';
    }
  }, [initialValues]);

  useEffect(() => {
    if (sharedValues.academic_year || academicYearOptions.length === 0) {
      return;
    }

    setSharedValues((current) => (
      current.academic_year || academicYearOptions.length === 0
        ? current
        : { ...current, academic_year: academicYearOptions[0].value }
    ));
  }, [academicYearOptions, sharedValues.academic_year]);

  function updateSharedValue<K extends keyof PostingFormValues>(key: K, value: PostingFormValues[K]) {
    setSharedValues((current) => ({ ...current, [key]: value }));
  }

  function updateRoleValue<K extends keyof PostingRoleDraft>(index: number, key: K, value: PostingRoleDraft[K]) {
    setRoleRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  function addRoleRow() {
    setRoleRows((current) => [...current, cloneRoleDraft(current[current.length - 1] ?? null)]);
  }

  function removeRoleRow(index: number) {
    setRoleRows((current) => (current.length <= 1 ? current : current.filter((_, rowIndex) => rowIndex !== index)));
  }

  async function handleJobDescriptionUpload(file: File | null) {
    if (!file) return;

    try {
      const uploaded = await uploadJobDescription.mutateAsync(file);
      setSharedValues((current) => (
        current.job_description_pdf_urls.includes(uploaded.job_description_pdf_url)
          ? current
          : {
              ...current,
              job_description_pdf_urls: [...current.job_description_pdf_urls, uploaded.job_description_pdf_url],
              job_description_pdf_names: [...current.job_description_pdf_names, file.name],
            }
      ));
      toast.success('Job description PDF uploaded successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload the job description PDF.');
      if (jobDescriptionInputRef.current) {
        jobDescriptionInputRef.current.value = '';
      }
      return;
    }

    if (jobDescriptionInputRef.current) {
      jobDescriptionInputRef.current.value = '';
    }
  }

  function validate(action: FormMode) {
    const nextErrors: Record<string, string> = {};

    if (!sharedValues.company_id) nextErrors.company_id = 'Company is required.';
    if (!safeTrim(sharedValues.academic_year)) nextErrors.academic_year = 'Academic year is required.';

    if (sharedValues.application_start_date && sharedValues.application_end_date) {
      if (new Date(sharedValues.application_end_date) < new Date(sharedValues.application_start_date)) {
        nextErrors.application_end_date = 'Application end date must be on or after the start date.';
      }
    }

    if (action !== 'draft') {
      if (sharedValues.has_written_test && !safeTrim(sharedValues.written_test_details)) {
        nextErrors.written_test_details = 'Add written test details or disable the written test flag.';
      }
      if (sharedValues.has_gd && !safeTrim(sharedValues.gd_details)) {
        nextErrors.gd_details = 'Add group discussion details or disable the GD flag.';
      }
    }

    if (roleRows.length === 0) {
      nextErrors.roles = 'Add at least one role.';
    }

    roleRows.forEach((role, index) => {
      if (!safeTrim(role.role_name)) nextErrors[`role-${index}.role_name`] = 'Role name is required.';
      if (!role.posting_type_master_id) nextErrors[`role-${index}.posting_type_master_id`] = 'Posting type is required.';
      if (role.locations.length === 0) nextErrors[`role-${index}.location`] = 'Add at least one location.';
      if (!role.work_mode) nextErrors[`role-${index}.work_mode`] = 'Work mode is required.';
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function runAction(action: FormMode) {
    if (!validate(action)) return;

    const values = roleRows.map((role) => buildCreateValues(sharedValues, role));

    if (action === 'draft' && onDraftAction) {
      await onDraftAction(values);
      return;
    }
    if (action === 'secondary' && onSecondaryAction) {
      await onSecondaryAction(values);
      setRoleRows([cloneRoleDraft(roleRows[roleRows.length - 1] ?? null)]);
      setErrors({});
      return;
    }
    await onPrimaryAction(values);
  }

  function formatRowLabel(index: number) {
    return `Role ${index + 1}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {getStatusBadge(status)}
          </div>
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Each role row below becomes its own student-visible posting. New rows duplicate the previous role values so you can reuse common role details quickly.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {onDraftAction && draftLabel && (
            <Button
              variant="outline"
              disabled={actionButtonsDisabled}
              onClick={() => runAction('draft')}
            >
              {draftPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {draftLabel}
            </Button>
          )}
          <Button
            disabled={actionButtonsDisabled}
            onClick={() => runAction('primary')}
          >
            {primaryPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {primaryLabel}
          </Button>
          {onSecondaryAction && secondaryLabel && (
            <Button
              variant="secondary"
              disabled={actionButtonsDisabled}
              onClick={() => runAction('secondary')}
            >
              {secondaryPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {secondaryLabel}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Common Posting Details
          </CardTitle>
          <CardDescription>
            Fill these once. Every role row will use the same company and shared details.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Company</Label>
            <SearchableSelect
              options={companyOptions}
              value={sharedValues.company_id}
              onValueChange={(value) => updateSharedValue('company_id', value)}
              placeholder="Select company"
              searchPlaceholder="Search company..."
              emptyMessage="No company found."
              loadingMessage="Loading companies..."
              disabled={disableCompanySelection}
              clearable
              contentClassName="w-[min(40rem,calc(100vw-2rem))]"
            />
            {errors.company_id && <p className="text-sm text-destructive">{errors.company_id}</p>}
            {disableCompanySelection && (
              <p className="text-sm text-muted-foreground">Company selection is locked after creation.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="posting-title-prefix">Posting Title Prefix</Label>
            <Input
              id="posting-title-prefix"
              value={sharedValues.title}
              onChange={(event) => updateSharedValue('title', event.target.value)}
              placeholder="Optional. Example: Accenture Campus Drive 2026"
            />
            <p className="text-xs text-muted-foreground">
              Each role title will be built from this prefix plus the role name.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Academic Year</Label>
            <SearchableSelect
              options={academicYearOptions}
              value={sharedValues.academic_year}
              onValueChange={(value) => updateSharedValue('academic_year', value)}
              placeholder="Select academic year"
              searchPlaceholder="Search academic year..."
              emptyMessage="No academic years found."
              loadingMessage="Loading academic years..."
              clearable
              contentClassName="w-[min(28rem,calc(100vw-2rem))]"
            />
            {errors.academic_year && <p className="text-sm text-destructive">{errors.academic_year}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Shared Role Assets
          </CardTitle>
          <CardDescription>
            These values are copied into each role posting and can stay the same across every row.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bond-details-text">Bond Details (Optional)</Label>
            <Textarea
              id="bond-details-text"
              rows={3}
              value={sharedValues.bond_details}
              onChange={(event) => updateSharedValue('bond_details', event.target.value)}
              placeholder="e.g. 2 years service bond, refundable security deposit, or any other condition"
            />
            <p className="text-xs text-muted-foreground">
              Add any extra bond terms here. Leave it blank if there is no bond requirement.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="job-description-pdf">Job Description PDFs (Optional)</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload one or more PDFs that students can open directly from every posting created from these roles.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                ref={jobDescriptionInputRef}
                id="job-description-pdf"
                type="file"
                accept=".pdf"
                onChange={(event) => void handleJobDescriptionUpload(event.target.files?.[0] ?? null)}
                disabled={uploadJobDescription.isPending}
                className="max-w-lg"
              />
              {uploadJobDescription.isPending ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading PDF...
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileUp className="h-4 w-4" />
                  PDF only — upload again to add more
                </span>
              )}
            </div>
            {sharedValues.job_description_pdf_urls.length > 0 ? (
              <ul className="space-y-2">
                {sharedValues.job_description_pdf_urls.map((url, urlIndex) => (
                  <li key={url} className="flex items-center justify-between gap-3 rounded-md border border-border p-2">
                    <a
                      href={resolveBackendAssetUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 truncate text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span className="truncate">{sharedValues.job_description_pdf_names[urlIndex] || `PDF ${urlIndex + 1}`}</span>
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setSharedValues((current) => ({
                        ...current,
                        job_description_pdf_urls: current.job_description_pdf_urls.filter((_, i) => i !== urlIndex),
                        job_description_pdf_names: current.job_description_pdf_names.filter((_, i) => i !== urlIndex),
                      }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/*
        Student Visibility hidden per request — re-enable later. The target_* values stay at
        their defaults (empty), which the backend treats as "visible to all students".
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Student Visibility (Optional)
          </CardTitle>
          <CardDescription>
            Leave all fields empty to make every role posting visible to every student. Add one or more filters to restrict visibility in student login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <UserScopeSelector
            targetInstitutes={sharedValues.target_institutes}
            targetCourses={sharedValues.target_courses}
            targetBranches={sharedValues.target_branches}
            targetSemesters={sharedValues.target_semesters}
            onTargetInstitutesChange={(nextValues) => updateSharedValue('target_institutes', nextValues)}
            onTargetCoursesChange={(nextValues) => updateSharedValue('target_courses', nextValues)}
            onTargetBranchesChange={(nextValues) => updateSharedValue('target_branches', nextValues)}
            onTargetSemestersChange={(nextValues) => updateSharedValue('target_semesters', nextValues)}
          />
          <p className="text-xs text-muted-foreground">
            If you do not select any institute, course, branch, or semester, the role postings will be visible to all students.
          </p>
        </CardContent>
      </Card>
      */}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Additional Eligibility
          </CardTitle>
          <CardDescription>
            Optional extra filters for who can apply. Student visibility is controlled above, so you do not need to repeat institute, branch, or semester targeting here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min-cgpa">Minimum CGPA</Label>
              <Input
                id="min-cgpa"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={sharedValues.min_cgpa}
                onChange={(event) => updateSharedValue('min_cgpa', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-backlogs">Maximum Backlogs</Label>
              <Input
                id="max-backlogs"
                type="number"
                min="0"
                value={sharedValues.max_backlogs}
                onChange={(event) => updateSharedValue('max_backlogs', event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-requirements">Skill Requirements</Label>
            <Textarea
              id="skill-requirements"
              rows={4}
              value={sharedValues.skill_requirements}
              onChange={(event) => updateSharedValue('skill_requirements', event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Selection Process
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Written Test</p>
                <p className="text-sm text-muted-foreground">Show whether the process includes a written round.</p>
              </div>
              <Switch
                checked={sharedValues.has_written_test}
                onCheckedChange={(checked) => updateSharedValue('has_written_test', checked)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Group Discussion</p>
                <p className="text-sm text-muted-foreground">Show whether the process includes a GD round.</p>
              </div>
              <Switch checked={sharedValues.has_gd} onCheckedChange={(checked) => updateSharedValue('has_gd', checked)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="technical-rounds">Technical Rounds</Label>
              <Input
                id="technical-rounds"
                type="number"
                min="0"
                value={sharedValues.technical_rounds}
                onChange={(event) => updateSharedValue('technical_rounds', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hr-rounds">HR Rounds</Label>
              <Input
                id="hr-rounds"
                type="number"
                min="0"
                value={sharedValues.hr_rounds}
                onChange={(event) => updateSharedValue('hr_rounds', event.target.value)}
              />
            </div>
          </div>

          {sharedValues.has_written_test && (
            <div className="space-y-2">
              <Label htmlFor="written-test-details">Written Test Details</Label>
              <Textarea
                id="written-test-details"
                rows={3}
                className={errors.written_test_details ? 'border-destructive' : undefined}
                value={sharedValues.written_test_details}
                onChange={(event) => updateSharedValue('written_test_details', event.target.value)}
              />
              {errors.written_test_details && (
                <p className="text-sm text-destructive">{errors.written_test_details}</p>
              )}
            </div>
          )}

          {sharedValues.has_gd && (
            <div className="space-y-2">
              <Label htmlFor="gd-details">Group Discussion Details</Label>
              <Textarea
                id="gd-details"
                rows={3}
                className={errors.gd_details ? 'border-destructive' : undefined}
                value={sharedValues.gd_details}
                onChange={(event) => updateSharedValue('gd_details', event.target.value)}
              />
              {errors.gd_details && <p className="text-sm text-destructive">{errors.gd_details}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="additional-info">Additional Information</Label>
            <Textarea
              id="additional-info"
              rows={4}
              value={sharedValues.additional_info}
              onChange={(event) => updateSharedValue('additional_info', event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Application Timeline
          </CardTitle>
          <CardDescription>
            Leaving these dates blank still allows publishing, but the student UI will treat the posting as always open while published.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="application-start-date">Application Start Date</Label>
            <Input
              id="application-start-date"
              type="date"
              value={sharedValues.application_start_date}
              onChange={(event) => updateSharedValue('application_start_date', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="application-end-date">Application End Date</Label>
            <Input
              id="application-end-date"
              type="date"
              className={errors.application_end_date ? 'border-destructive' : undefined}
              value={sharedValues.application_end_date}
              onChange={(event) => updateSharedValue('application_end_date', event.target.value)}
            />
            {errors.application_end_date && (
              <p className="text-sm text-destructive">{errors.application_end_date}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Roles to Publish
            </span>
            <Button variant="outline" type="button" onClick={addRoleRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </CardTitle>
          <CardDescription>
            Every role below creates a separate posting for students. New roles duplicate the previous role row so you can reuse similar details quickly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {roleRows.map((role, index) => (
            /* HITS 20260502 Dynamic key bug - old dynamic key caused focus loss on every keystroke */
            /* <div key={`${index}-${role.role_name}-${role.location}-${role.type}`} className="rounded-xl border border-border bg-muted/20 p-4"> */
            <div key={index} className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{formatRowLabel(index)}</p>
                  <p className="text-xs text-muted-foreground">This row becomes its own posting.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setRoleRows((current) => [...current, cloneRoleDraft(current[index])])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={roleRows.length <= 1}
                    onClick={() => removeRoleRow(index)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`role-name-${index}`}>Role Name</Label>
                  <Input
                    id={`role-name-${index}`}
                    value={role.role_name}
                    onChange={(event) => updateRoleValue(index, 'role_name', event.target.value)}
                    className={errors[`role-${index}.role_name`] ? 'border-destructive' : undefined}
                    placeholder="e.g. Associate Consultant"
                  />
                  {errors[`role-${index}.role_name`] && <p className="text-sm text-destructive">{errors[`role-${index}.role_name`]}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Posting Type</Label>
                  <Select
                    value={role.posting_type_master_id || '__unset'}
                    onValueChange={(value) => updateRoleValue(index, 'posting_type_master_id', value === '__unset' ? '' : value)}
                  >
                    <SelectTrigger className={errors[`role-${index}.posting_type_master_id`] ? 'border-destructive' : undefined}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unset">Select type</SelectItem>
                      {postingTypeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors[`role-${index}.posting_type_master_id`] && <p className="text-sm text-destructive">{errors[`role-${index}.posting_type_master_id`]}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`role-location-${index}`}>Locations</Label>
                  <LocationChipsInput
                    id={`role-location-${index}`}
                    values={role.locations}
                    error={Boolean(errors[`role-${index}.location`])}
                    onChange={(next) => updateRoleValue(index, 'locations', next)}
                  />
                  {errors[`role-${index}.location`] && <p className="text-sm text-destructive">{errors[`role-${index}.location`]}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Work Mode</Label>
                  <Select
                    value={role.work_mode || '__unset'}
                    onValueChange={(value) => updateRoleValue(index, 'work_mode', value === '__unset' ? '' : value as PostingFormValues['work_mode'])}
                  >
                    <SelectTrigger className={errors[`role-${index}.work_mode`] ? 'border-destructive' : undefined}>
                      <SelectValue placeholder="Select work mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unset">Select work mode</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors[`role-${index}.work_mode`] && <p className="text-sm text-destructive">{errors[`role-${index}.work_mode`]}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Package Range (per year)</Label>
                  <Input
                    value={role.ctc}
                    onChange={(event) => updateRoleValue(index, 'ctc', event.target.value)}
                    placeholder="e.g. 3 - 6 LPA"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stipend Range (per month)</Label>
                  <Input
                    value={role.stipend}
                    onChange={(event) => updateRoleValue(index, 'stipend', event.target.value)}
                    placeholder="e.g. 20,000 - 30,000 / month"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`duration-${index}`}>Duration</Label>
                  <div className="grid grid-cols-[1fr_140px] gap-2">
                    <Input
                      id={`duration-${index}`}
                      type="number"
                      min="0"
                      step="1"
                      value={role.duration_value}
                      onChange={(event) => updateRoleValue(index, 'duration_value', event.target.value)}
                    />
                    <Select
                      value={role.duration_unit}
                      onValueChange={(value) => updateRoleValue(index, 'duration_unit', value as PostingFormValues['duration_unit'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`role-description-${index}`}>Role Description</Label>
                  <Textarea
                    id={`role-description-${index}`}
                    rows={4}
                    value={role.role_description}
                    onChange={(event) => updateRoleValue(index, 'role_description', event.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          {errors.roles && <p className="text-sm text-destructive">{errors.roles}</p>}
          <p className="text-sm text-muted-foreground">
            Tip: fill the first role carefully, then use <span className="font-medium">Copy</span> or <span className="font-medium">Add Role</span> to duplicate the shared setup for more roles.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
