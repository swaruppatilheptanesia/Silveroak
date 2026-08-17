import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  FileUp,
  GraduationCap,
  Loader2,
  Save,
  Send,
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

interface PostingFormProps {
  title: string;
  subtitle: string;
  companies: ApiCompany[];
  initialValues: PostingFormValues;
  status?: ApiPostingStatus;
  disableCompanySelection?: boolean;
  primaryLabel: string;
  primaryPending?: boolean;
  onPrimaryAction: (values: PostingFormValues) => Promise<void> | void;
  draftLabel?: string;
  draftPending?: boolean;
  onDraftAction?: (values: PostingFormValues) => Promise<void> | void;
  secondaryLabel?: string;
  secondaryPending?: boolean;
  onSecondaryAction?: (values: PostingFormValues) => Promise<void> | void;
}

function getStatusBadge(status?: ApiPostingStatus) {
  if (!status) return null;
  if (status === 'draft') return <Badge variant="warning">Draft</Badge>;
  if (status === 'published') return <Badge variant="success">Published</Badge>;
  return <Badge variant="secondary">Closed</Badge>;
}

export function PostingForm({
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
}: PostingFormProps) {
  const [values, setValues] = useState<PostingFormValues>(initialValues);
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
      .map((year) => ({
        value: year,
        label: year,
      })),
    [academicYearOptionsQuery.data],
  );
  const actionButtonsDisabled = primaryPending || draftPending || secondaryPending || uploadJobDescription.isPending;

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
    if (jobDescriptionInputRef.current) {
      jobDescriptionInputRef.current.value = '';
    }
  }, [initialValues]);

  useEffect(() => {
    if (values.academic_year || academicYearOptions.length === 0) {
      return;
    }

    setValues((current) => (
      current.academic_year || academicYearOptions.length === 0
        ? current
        : { ...current, academic_year: academicYearOptions[0].value }
    ));
  }, [academicYearOptions, values.academic_year]);

  function updateValue<K extends keyof PostingFormValues>(key: K, value: PostingFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleJobDescriptionUpload(file: File | null) {
    if (!file) return;

    try {
      const uploaded = await uploadJobDescription.mutateAsync(file);
      setValues((current) => (
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

  function validate(action: 'draft' | 'primary' | 'secondary') {
    const nextErrors: Record<string, string> = {};

    const safeTrim = (value: string | null | undefined) => (value ?? '').trim();

    if (!values.company_id) nextErrors.company_id = 'Company is required.';
    if (!values.posting_type_master_id) nextErrors.posting_type_master_id = 'Posting type is required.';
    if (!safeTrim(values.title)) nextErrors.title = 'Title is required.';
    if (!safeTrim(values.academic_year)) nextErrors.academic_year = 'Academic year is required.';
    if (!safeTrim(values.role_name)) nextErrors.role_name = 'Role name is required.';
    if (values.locations.length === 0) nextErrors.location = 'Add at least one location.';
    if (!values.work_mode) nextErrors.work_mode = 'Work mode is required.';

    if (values.application_start_date && values.application_end_date) {
      if (new Date(values.application_end_date) < new Date(values.application_start_date)) {
        nextErrors.application_end_date = 'Application end date must be on or after the start date.';
      }
    }

    if (action !== 'draft') {
      if (values.has_written_test && !safeTrim(values.written_test_details)) {
        nextErrors.written_test_details = 'Add written test details or disable the written test flag.';
      }
      if (values.has_gd && !safeTrim(values.gd_details)) {
        nextErrors.gd_details = 'Add group discussion details or disable the GD flag.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function runAction(action: 'draft' | 'primary' | 'secondary') {
    if (!validate(action)) return;

    if (action === 'draft' && onDraftAction) {
      await onDraftAction(values);
      return;
    }
    if (action === 'secondary' && onSecondaryAction) {
      await onSecondaryAction(values);
      return;
    }
    await onPrimaryAction(values);
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
            Basic Information
          </CardTitle>
          <CardDescription>
            Add the core details students need to understand this opportunity.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Posting Type</Label>
            <Select
              value={values.posting_type_master_id || '__unset'}
              onValueChange={(value) => updateValue('posting_type_master_id', value === '__unset' ? '' : value)}
            >
              <SelectTrigger className={errors.posting_type_master_id ? 'border-destructive' : undefined}>
                <SelectValue placeholder="Select posting type" />
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
            {errors.posting_type_master_id && <p className="text-sm text-destructive">{errors.posting_type_master_id}</p>}
          </div>

          <div className="space-y-2">
            <Label>Company</Label>
            <SearchableSelect
              options={companyOptions}
              value={values.company_id}
              onValueChange={(value) => updateValue('company_id', value)}
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
              <p className="text-sm text-muted-foreground">
                Company selection is locked after creation.
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="posting-title">Posting Title</Label>
            <Input
              id="posting-title"
              value={values.title}
              onChange={(event) => updateValue('title', event.target.value)}
              className={errors.title ? 'border-destructive' : undefined}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label>Academic Year</Label>
            <SearchableSelect
              options={academicYearOptions}
              value={values.academic_year}
              onValueChange={(value) => updateValue('academic_year', value)}
              placeholder="Select academic year"
              searchPlaceholder="Search academic year..."
              emptyMessage="No academic years found."
              loadingMessage="Loading academic years..."
              clearable
              contentClassName="w-[min(28rem,calc(100vw-2rem))]"
            />
            {errors.academic_year && <p className="text-sm text-destructive">{errors.academic_year}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-name">Role Name</Label>
            <Input
              id="role-name"
              value={values.role_name}
              onChange={(event) => updateValue('role_name', event.target.value)}
              className={errors.role_name ? 'border-destructive' : undefined}
            />
            {errors.role_name && <p className="text-sm text-destructive">{errors.role_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Locations</Label>
            <LocationChipsInput
              id="location"
              values={values.locations}
              error={Boolean(errors.location)}
              onChange={(next) => updateValue('locations', next)}
            />
            {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
          </div>

          <div className="space-y-2">
            <Label>Work Mode</Label>
            <Select
              value={values.work_mode || '__unset'}
              onValueChange={(value) =>
                updateValue('work_mode', value === '__unset' ? '' : value as PostingFormValues['work_mode'])
              }
            >
              <SelectTrigger className={errors.work_mode ? 'border-destructive' : undefined}>
                <SelectValue placeholder="Select work mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unset">Select work mode</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            {errors.work_mode && <p className="text-sm text-destructive">{errors.work_mode}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Role and Compensation
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ctc">Package Range (per year)</Label>
            <Input
              id="ctc"
              value={values.ctc}
              onChange={(event) => updateValue('ctc', event.target.value)}
              placeholder="e.g. 3 - 6 LPA"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stipend">Stipend Range (per month)</Label>
            <Input
              id="stipend"
              value={values.stipend}
              onChange={(event) => updateValue('stipend', event.target.value)}
              placeholder="e.g. 20,000 - 30,000 / month"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <div className="grid grid-cols-[1fr_140px] gap-2">
              <Input
                id="duration"
                type="number"
                min="0"
                step="1"
                value={values.duration_value}
                onChange={(event) => updateValue('duration_value', event.target.value)}
              />
              <Select
                value={values.duration_unit}
                onValueChange={(value) => updateValue('duration_unit', value as PostingFormValues['duration_unit'])}
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
          <div className="space-y-2">
            <Label htmlFor="bond-duration">Bond Duration</Label>
            <div className="grid grid-cols-[1fr_140px] gap-2">
              <Input
                id="bond-duration"
                type="number"
                min="0"
                step="1"
                value={values.bond_value}
                onChange={(event) => updateValue('bond_value', event.target.value)}
              />
              <Select
                value={values.bond_unit}
                onValueChange={(value) => updateValue('bond_unit', value as PostingFormValues['bond_unit'])}
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
            <p className="text-xs text-muted-foreground">Optional. Use this if the bond is best described as a duration.</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bond-details-text">Bond Details (Optional)</Label>
            <Textarea
              id="bond-details-text"
              rows={3}
              value={values.bond_details}
              onChange={(event) => updateValue('bond_details', event.target.value)}
              placeholder="e.g. 2 years service bond, refundable security deposit, or any other condition"
            />
            <p className="text-xs text-muted-foreground">
              Add any extra bond terms here. Leave it blank if there is no bond requirement.
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="role-description">Role Description</Label>
            <Textarea
              id="role-description"
              rows={5}
              value={values.role_description}
              onChange={(event) => updateValue('role_description', event.target.value)}
            />
          </div>

          <div className="space-y-3 md:col-span-2">
            <div>
              <Label htmlFor="job-description-pdf">Job Description PDFs (Optional)</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload one or more PDFs that students can open directly from the posting.
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
            {values.job_description_pdf_urls.length > 0 ? (
              <ul className="space-y-2">
                {values.job_description_pdf_urls.map((url, urlIndex) => (
                  <li key={url} className="flex items-center justify-between gap-3 rounded-md border border-border p-2">
                    <a
                      href={resolveBackendAssetUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 truncate text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span className="truncate">{values.job_description_pdf_names[urlIndex] || `PDF ${urlIndex + 1}`}</span>
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setValues((current) => ({
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
            Leave all fields empty to make this posting visible to every student. Add one or more filters to restrict who can see it in student login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <UserScopeSelector
            targetInstitutes={values.target_institutes}
            targetCourses={values.target_courses}
            targetBranches={values.target_branches}
            targetSemesters={values.target_semesters}
            onTargetInstitutesChange={(nextValues) => updateValue('target_institutes', nextValues)}
            onTargetCoursesChange={(nextValues) => updateValue('target_courses', nextValues)}
            onTargetBranchesChange={(nextValues) => updateValue('target_branches', nextValues)}
            onTargetSemestersChange={(nextValues) => updateValue('target_semesters', nextValues)}
          />
          <p className="text-xs text-muted-foreground">
            If you do not select any institute, course, branch, or semester, the posting will be visible to all students.
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
                value={values.min_cgpa}
                onChange={(event) => updateValue('min_cgpa', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-backlogs">Maximum Backlogs</Label>
              <Input
                id="max-backlogs"
                type="number"
                min="0"
                value={values.max_backlogs}
                onChange={(event) => updateValue('max_backlogs', event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-requirements">Skill Requirements</Label>
            <Textarea
              id="skill-requirements"
              rows={4}
              value={values.skill_requirements}
              onChange={(event) => updateValue('skill_requirements', event.target.value)}
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
                checked={values.has_written_test}
                onCheckedChange={(checked) => updateValue('has_written_test', checked)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Group Discussion</p>
                <p className="text-sm text-muted-foreground">Show whether the process includes a GD round.</p>
              </div>
              <Switch checked={values.has_gd} onCheckedChange={(checked) => updateValue('has_gd', checked)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="technical-rounds">Technical Rounds</Label>
              <Input
                id="technical-rounds"
                type="number"
                min="0"
                value={values.technical_rounds}
                onChange={(event) => updateValue('technical_rounds', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hr-rounds">HR Rounds</Label>
              <Input
                id="hr-rounds"
                type="number"
                min="0"
                value={values.hr_rounds}
                onChange={(event) => updateValue('hr_rounds', event.target.value)}
              />
            </div>
          </div>

          {values.has_written_test && (
            <div className="space-y-2">
              <Label htmlFor="written-test-details">Written Test Details</Label>
              <Textarea
                id="written-test-details"
                rows={3}
                className={errors.written_test_details ? 'border-destructive' : undefined}
                value={values.written_test_details}
                onChange={(event) => updateValue('written_test_details', event.target.value)}
              />
              {errors.written_test_details && (
                <p className="text-sm text-destructive">{errors.written_test_details}</p>
              )}
            </div>
          )}

          {values.has_gd && (
            <div className="space-y-2">
              <Label htmlFor="gd-details">Group Discussion Details</Label>
              <Textarea
                id="gd-details"
                rows={3}
                className={errors.gd_details ? 'border-destructive' : undefined}
                value={values.gd_details}
                onChange={(event) => updateValue('gd_details', event.target.value)}
              />
              {errors.gd_details && <p className="text-sm text-destructive">{errors.gd_details}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="additional-info">Additional Information</Label>
            <Textarea
              id="additional-info"
              rows={4}
              value={values.additional_info}
              onChange={(event) => updateValue('additional_info', event.target.value)}
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
              value={values.application_start_date}
              onChange={(event) => updateValue('application_start_date', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="application-end-date">Application End Date</Label>
            <Input
              id="application-end-date"
              type="date"
              className={errors.application_end_date ? 'border-destructive' : undefined}
              value={values.application_end_date}
              onChange={(event) => updateValue('application_end_date', event.target.value)}
            />
            {errors.application_end_date && (
              <p className="text-sm text-destructive">{errors.application_end_date}</p>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
