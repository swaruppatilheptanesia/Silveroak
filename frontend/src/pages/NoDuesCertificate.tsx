import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { focusFirstFormError } from '@/lib/formErrors';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { RequiredLabel } from '@/components/shared/RequiredLabel';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateNoDuesRequest,
  useMyNoDuesEligibility,
  useMyNoDuesRequests,
  useResubmitNoDuesRequest,
  useUploadNoDuesProof,
} from '@/hooks/use-no-dues-api';
import { useStudentProfile } from '@/hooks/use-student-api';
import {
  canCreateNoDuesRequest,
  getNoDuesErrorMessage,
  getNoDuesStatusClassName,
  getNoDuesStatusVariant,
  getNoDuesSummary,
  normalizeNoDuesRequest,
} from '@/lib/noDuesModule';
import { COUNTRIES, isAbroadCountry } from '@/lib/countries';
import { formatCGPA, formatDate, formatDateTime, formatLPA } from '@/lib/formatters';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import type { CreateNoDuesInput, NoDuesExitReason, NoDuesRequest } from '@/types/noDues';
import { EXIT_REASON_LABELS, NDC_STATUS_LABELS } from '@/types/noDues';

// Generated "SOU Passing Year" options: next year down through ~14 years back.
const CURRENT_YEAR = new Date().getFullYear();
const PASSING_YEARS: string[] = Array.from({ length: 15 }, (_, i) => String(CURRENT_YEAR + 1 - i));

const requiredString = (label: string, max = 300) =>
  z.string().trim().min(1, `${label} is required`).max(max);

const declarationField = z.literal(true, {
  errorMap: () => ({ message: 'You must accept the declaration' }),
});

const noDuesSchema = z
  .discriminatedUnion('exit_reason', [
    z.object({
      exit_reason: z.literal('employment'),
      sou_passing_year: requiredString('SOU passing year', 20),
      company_name: requiredString('Company name', 300),
      designation: requiredString('Designation', 200),
      company_sector: requiredString('Company sector', 200),
      package_lpa: z.coerce.number().min(0, 'Package must be positive'),
      company_address: requiredString('Company address', 2000),
      joining_date: z.string().min(1, 'Joining date is required'),
      declaration_accepted: declarationField,
    }),
    z.object({
      exit_reason: z.literal('family_business'),
      sou_passing_year: requiredString('SOU passing year', 20),
      business_name: requiredString('Business / company name', 300),
      business_nature: requiredString('Business / company sector', 200),
      business_address: requiredString('Business / company address', 2000),
      declaration_accepted: declarationField,
    }),
    z.object({
      exit_reason: z.literal('planning_studies'),
      sou_passing_year: requiredString('SOU passing year', 20),
      country: requiredString('Country', 100),
      program_name: requiredString('Intended course', 200),
      institution_name: requiredString('Preferred university', 300),
      language_test: z.string().trim().max(200).optional().or(z.literal('')),
      declaration_accepted: declarationField,
    }),
    z.object({
      exit_reason: z.literal('higher_studies'),
      sou_passing_year: requiredString('SOU passing year', 20),
      country: requiredString('Country', 100),
      program_name: requiredString('Course / program', 200),
      institution_name: requiredString('University name', 300),
      university_address: requiredString('University address', 2000),
      declaration_accepted: declarationField,
    }),
    z.object({
      exit_reason: z.literal('competitive_exam'),
      sou_passing_year: requiredString('SOU passing year', 20),
      examination_name: requiredString('Examination name', 300),
      additional_details: z.string().trim().max(2000).optional().or(z.literal('')),
      declaration_accepted: declarationField,
    }),
  ])
  // Language Test is mandatory for Planning-for-Further-Studies when the country is abroad.
  .superRefine((data, ctx) => {
    if (
      data.exit_reason === 'planning_studies' &&
      isAbroadCountry(data.country) &&
      !data.language_test?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['language_test'],
        message: 'Language test is required for studies abroad.',
      });
    }
  });

type NoDuesFormValues = z.infer<typeof noDuesSchema>;

function getExitReasonIcon(reason: NoDuesExitReason) {
  if (reason === 'employment') return <Briefcase className="h-4 w-4" />;
  if (reason === 'family_business') return <Building2 className="h-4 w-4" />;
  return <BookOpen className="h-4 w-4" />;
}

const PROOF_LABELS: Record<NoDuesExitReason, string> = {
  employment: 'Offer / Job Proof Attachment',
  family_business: 'Business Proof Attachment',
  planning_studies: 'Admission / Planning Proof Attachment',
  higher_studies: 'Admission / Offer Proof Attachment',
  competitive_exam: 'Proof Attachment',
};

function getProofHelperText(reason: NoDuesExitReason, country?: string): string {
  switch (reason) {
    case 'employment':
      return 'Upload any one of the following: Offer Letter, Appointment Letter, or Joining Letter.';
    case 'family_business':
      return 'Upload any one of the following: GST Certificate, MSME Certificate, Shop Act Certificate, Business Visiting Card, or any other valid business proof.';
    case 'competitive_exam':
      return 'Upload any one of the following: Official Examination Application Form, Coaching Fee Receipt, or Exam Hall Ticket.';
    case 'planning_studies':
      if (!country) return 'Select a country to see the accepted documents.';
      return isAbroadCountry(country)
        ? 'Upload any one of the following: IELTS/TOEFL/Duolingo Scorecard, Medium of Instruction (MOI) Certificate, Letter of Recommendation (LOR), GRE/GMAT Scorecard, or International University Application Dashboard Screenshot.'
        : 'Upload any one of the following: Entrance Exam Registration (CAT/GATE/NEET, etc.), Coaching Centre Fee Receipt, or Entrance Exam Hall Ticket.';
    case 'higher_studies':
      if (!country) return 'Select a country to see the accepted documents.';
      return isAbroadCountry(country)
        ? 'Upload any one of the following: Confirmed International Admission Letter, CAS Letter (UK), Form I-20 (USA), or Confirmed Student Visa Copy.'
        : 'Upload any one of the following: Official College Admission Letter, Institutional Term Fee Receipt, or Final Enrollment Confirmation.';
    default:
      return 'Upload a supporting document in PDF format.';
  }
}

function buildCreateRequestPayload(data: NoDuesFormValues): CreateNoDuesInput {
  const base: CreateNoDuesInput = {
    exit_reason: data.exit_reason,
    declaration_accepted: true,
    sou_passing_year: data.sou_passing_year,
    company_name: null,
    designation: null,
    company_sector: null,
    package_lpa: null,
    company_address: null,
    joining_date: null,
    business_name: null,
    business_nature: null,
    business_address: null,
    institution_name: null,
    program_name: null,
    country: null,
    language_test: null,
    university_address: null,
    examination_name: null,
    additional_details: null,
  };

  if (data.exit_reason === 'employment') {
    return {
      ...base,
      company_name: data.company_name,
      designation: data.designation,
      company_sector: data.company_sector,
      package_lpa: data.package_lpa,
      company_address: data.company_address,
      joining_date: data.joining_date,
    };
  }

  if (data.exit_reason === 'family_business') {
    return {
      ...base,
      business_name: data.business_name,
      business_nature: data.business_nature,
      business_address: data.business_address,
    };
  }

  if (data.exit_reason === 'planning_studies') {
    return {
      ...base,
      country: data.country,
      program_name: data.program_name,
      institution_name: data.institution_name,
      language_test: data.language_test || null,
    };
  }

  if (data.exit_reason === 'higher_studies') {
    return {
      ...base,
      country: data.country,
      program_name: data.program_name,
      institution_name: data.institution_name,
      university_address: data.university_address,
    };
  }

  // competitive_exam
  return {
    ...base,
    examination_name: data.examination_name,
    additional_details: data.additional_details || null,
  };
}

function getDefaultNoDuesFormValues(passingYear = '') {
  return {
    exit_reason: 'employment',
    sou_passing_year: passingYear,
    declaration_accepted: false as never,
  };
}

function buildFormValuesFromRequest(request: NoDuesRequest): NoDuesFormValues {
  const sou_passing_year = request.sou_passing_year ?? '';

  if (request.exit_reason === 'employment') {
    return {
      exit_reason: 'employment',
      sou_passing_year,
      company_name: request.company_name ?? '',
      designation: request.designation ?? '',
      company_sector: request.company_sector ?? '',
      package_lpa: request.package_lpa ?? 0,
      company_address: request.company_address ?? '',
      joining_date: request.joining_date ? request.joining_date.slice(0, 10) : '',
      declaration_accepted: true,
    };
  }

  if (request.exit_reason === 'family_business') {
    return {
      exit_reason: 'family_business',
      sou_passing_year,
      business_name: request.business_name ?? '',
      business_nature: request.business_nature ?? '',
      business_address: request.business_address ?? '',
      declaration_accepted: true,
    };
  }

  if (request.exit_reason === 'planning_studies') {
    return {
      exit_reason: 'planning_studies',
      sou_passing_year,
      country: request.country ?? '',
      program_name: request.program_name ?? '',
      institution_name: request.institution_name ?? '',
      language_test: request.language_test ?? '',
      declaration_accepted: true,
    };
  }

  if (request.exit_reason === 'competitive_exam') {
    return {
      exit_reason: 'competitive_exam',
      sou_passing_year,
      examination_name: request.examination_name ?? '',
      additional_details: request.additional_details ?? '',
      declaration_accepted: true,
    };
  }

  return {
    exit_reason: 'higher_studies',
    sou_passing_year,
    country: request.country ?? '',
    program_name: request.program_name ?? '',
    institution_name: request.institution_name ?? '',
    university_address: request.university_address ?? '',
    declaration_accepted: true,
  };
}

function RequestCard({
  request,
  studentName,
  onResubmit,
}: {
  request: NoDuesRequest;
  studentName: string;
  onResubmit: (request: NoDuesRequest) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{studentName || request.student_name || 'Student record'}</p>
              <Badge
                variant={getNoDuesStatusVariant(request.status)}
                className={getNoDuesStatusClassName(request.status)}
              >
                {NDC_STATUS_LABELS[request.status]}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getExitReasonIcon(request.exit_reason)}
              <span>{EXIT_REASON_LABELS[request.exit_reason]}</span>
              <span>•</span>
              <span>{getNoDuesSummary(request)}</span>
            </div>

            <p className="text-sm text-muted-foreground">
              Submitted {formatDateTime(request.created_at)}
            </p>

            {request.ndc_number ? (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                NDC Number: {request.ndc_number}
              </p>
            ) : null}

            {request.proof_url ? (
              <a
                href={resolveBackendAssetUrl(request.proof_url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                View attached proof
              </a>
            ) : null}

            {request.admin_remarks ? (
              <div className="rounded-md border border-orange-500/20 bg-orange-500/5 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-orange-700 dark:text-orange-300">
                  TPO Remarks
                </p>
                <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                  {request.admin_remarks}
                </p>
              </div>
            ) : null}

            <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
              {request.exit_reason === 'employment' && request.package_lpa != null ? (
                <p>Package: {formatLPA(request.package_lpa)}</p>
              ) : null}
              {request.exit_reason === 'employment' && request.joining_date ? (
                <p>Joining: {formatDate(request.joining_date)}</p>
              ) : null}
              {(request.exit_reason === 'higher_studies' || request.exit_reason === 'planning_studies') &&
              request.country ? (
                <p>Country: {request.country}</p>
              ) : null}
              {request.reviewed_at ? (
                <p>Reviewed: {formatDateTime(request.reviewed_at)}</p>
              ) : null}
              {request.issued_at ? (
                <p>Issued: {formatDateTime(request.issued_at)}</p>
              ) : null}
            </div>
          </div>

          {request.certificate_url ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(resolveBackendAssetUrl(request.certificate_url || ''), '_blank', 'noopener,noreferrer');
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download NDC
            </Button>
          ) : request.status === 'returned' ? (
            <Button variant="outline" size="sm" onClick={() => onResubmit(request)}>
              <FileText className="mr-2 h-4 w-4" />
              Modify and Resubmit
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function NoDuesCertificate() {
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<NoDuesRequest | null>(null);
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);

  const profileQuery = useStudentProfile();
  const myRequestsQuery = useMyNoDuesRequests();
  const eligibilityQuery = useMyNoDuesEligibility();
  const createRequest = useCreateNoDuesRequest();
  const resubmitRequest = useResubmitNoDuesRequest();
  const uploadProof = useUploadNoDuesProof();

  const form = useForm<NoDuesFormValues>({
    resolver: zodResolver(noDuesSchema),
    defaultValues: getDefaultNoDuesFormValues() as NoDuesFormValues,
  });

  const watched = form.watch();
  const exitReason = watched.exit_reason;
  const selectedCountry = (watched as { country?: string }).country;

  const requests = useMemo(
    () => (myRequestsQuery.data ?? []).map(normalizeNoDuesRequest),
    [myRequestsQuery.data]
  );

  const noDuesEnabled = eligibilityQuery.data?.enabled ?? false;
  const canCreateRequest = noDuesEnabled && canCreateNoDuesRequest(requests);
  const hasIssuedRequest = requests.some((request) => request.status === 'issued');
  const hasReturnedRequest = requests.some((request) => request.status === 'returned');
  const isSubmitting = createRequest.isPending || resubmitRequest.isPending || uploadProof.isPending;
  const existingProofUrl = editingRequest?.proof_url ?? null;
  const proofAttachmentLabel = PROOF_LABELS[exitReason];
  const proofHelperText = getProofHelperText(exitReason, selectedCountry);

  if (profileQuery.isLoading || myRequestsQuery.isLoading || eligibilityQuery.isLoading) {
    return (
      <DashboardLayout
        title="No Dues Certificate"
        subtitle="Request your No Dues Certificate for final placement clearance"
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (profileQuery.error || myRequestsQuery.error || eligibilityQuery.error || !profileQuery.data) {
    return (
      <DashboardLayout
        title="No Dues Certificate"
        subtitle="Request your No Dues Certificate for final placement clearance"
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load the no-dues module</AlertTitle>
          <AlertDescription>
            {getNoDuesErrorMessage(profileQuery.error || myRequestsQuery.error || eligibilityQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const student = profileQuery.data.student;
  const academic = profileQuery.data.academic;
  const defaultPassingYear = student.batch && PASSING_YEARS.includes(student.batch) ? student.batch : '';

  async function handleSubmit(data: NoDuesFormValues) {
    try {
      let proofUrl = existingProofUrl;

      if (selectedProofFile) {
        const uploadedProof = await uploadProof.mutateAsync(selectedProofFile);
        proofUrl = uploadedProof.proof_url;
      }

      if (!proofUrl) {
        toast.error('Upload a proof attachment before submitting the request.');
        return;
      }

      const payload = {
        ...buildCreateRequestPayload(data),
        proof_url: proofUrl,
      };

      if (editingRequest) {
        await resubmitRequest.mutateAsync({ id: editingRequest.id, data: payload });
        toast.success('No Dues request resubmitted successfully.');
      } else {
        await createRequest.mutateAsync(payload);
        toast.success('No Dues request submitted successfully.');
      }
      form.reset(getDefaultNoDuesFormValues(defaultPassingYear) as NoDuesFormValues);
      setEditingRequest(null);
      setSelectedProofFile(null);
      setShowForm(false);
    } catch (error) {
      toast.error(getNoDuesErrorMessage(error, 'Unable to submit your request right now.'));
    }
  }

  function openCreateForm() {
    setEditingRequest(null);
    setSelectedProofFile(null);
    form.reset(getDefaultNoDuesFormValues(defaultPassingYear) as NoDuesFormValues);
    setShowForm(true);
  }

  function openResubmitForm(request: NoDuesRequest) {
    setEditingRequest(request);
    setSelectedProofFile(null);
    form.reset(buildFormValuesFromRequest(request));
    setShowForm(true);
  }

  function closeForm() {
    setEditingRequest(null);
    setSelectedProofFile(null);
    form.reset(getDefaultNoDuesFormValues(defaultPassingYear) as NoDuesFormValues);
    setShowForm(false);
  }

  if (!showForm) {
    return (
      <DashboardLayout
        title="No Dues Certificate"
        subtitle="Request your No Dues Certificate for final placement clearance"
      >
        <div className="space-y-6">
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    Submit your No Dues request after your final exit path is confirmed. The TPO team reviews your
                    case, may return it for clarification, and issues the final NDC once approved.
                  </p>
                  {!canCreateRequest ? (
                    <p className="font-medium">
                      {!noDuesEnabled
                        ? 'No Dues is not enabled for your enrollment number yet. Please contact the TPO team.'
                        : hasIssuedRequest
                        ? 'You already have an issued NDC, so a new request is currently blocked.'
                        : hasReturnedRequest
                          ? 'Your request was returned. Please modify and resubmit the returned request instead of creating a new one.'
                        : 'An active request is already in progress, so a new request is blocked until it is resolved.'}
                    </p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={openCreateForm} disabled={!canCreateRequest}>
              <FileText className="mr-2 h-4 w-4" />
              {canCreateRequest ? 'Request No Dues Certificate' : noDuesEnabled ? 'Request In Progress' : 'Not Enabled'}
            </Button>
          </div>

          {requests.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={FileText}
                  title="No no-dues requests yet"
                  description="Once you submit a request, its review status and NDC number will appear here."
                  compact
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} studentName={student.full_name} onResubmit={openResubmitForm} />
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Request No Dues Certificate"
      subtitle={editingRequest ? 'Modify the returned request and resubmit it for review' : 'Complete the form below to submit your live no-dues request'}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" onClick={closeForm}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Requests
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Student Information</CardTitle>
            </div>
            <CardDescription>
              These details come from your live student profile. Contact the TPO if anything looks incorrect.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">Name:</span> <span className="ml-1 font-medium">{student.full_name}</span></div>
              <div><span className="text-muted-foreground">Roll No:</span> <span className="ml-1 font-medium">{student.roll_number ?? student.enrollment_number}</span></div>
              <div><span className="text-muted-foreground">Course:</span> <span className="ml-1 font-medium">{student.course ?? 'Not updated'}</span></div>
              <div><span className="text-muted-foreground">Department:</span> <span className="ml-1 font-medium">{student.department}</span></div>
              <div><span className="text-muted-foreground">Batch:</span> <span className="ml-1 font-medium">{student.batch}</span></div>
              <div><span className="text-muted-foreground">CGPA:</span> <span className="ml-1 font-medium">{academic?.cgpa != null ? formatCGPA(academic.cgpa) : 'Not updated'}</span></div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => void handleSubmit(values), focusFirstFormError)} className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Current Status</CardTitle>
                </div>
                <CardDescription>Select the exit path for which you need your NDC.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="exit_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Exit Reason</RequiredLabel>
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select exit reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(EXIT_REASON_LABELS) as NoDuesExitReason[]).map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {EXIT_REASON_LABELS[reason]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {exitReason === 'employment' && 'Employment Details'}
                  {exitReason === 'family_business' && 'Business Details'}
                  {exitReason === 'higher_studies' && 'Admission Details'}
                  {exitReason === 'planning_studies' && 'Further Studies Details'}
                  {exitReason === 'competitive_exam' && 'Competitive Exam Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* SOU Passing Year — common to every exit reason. */}
                <FormField
                  control={form.control}
                  name="sou_passing_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>SOU Passing Year</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                          options={PASSING_YEARS.map((year) => ({ value: year, label: year }))}
                          placeholder="Select passing year"
                          searchPlaceholder="Search year..."
                          emptyMessage="No years found."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {exitReason === 'employment' ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="company_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <RequiredLabel>Company Name</RequiredLabel>
                            </FormLabel>
                            <FormControl><Input placeholder="e.g. TCS Digital" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="designation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <RequiredLabel>Designation</RequiredLabel>
                            </FormLabel>
                            <FormControl><Input placeholder="e.g. Systems Engineer" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="company_sector"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <RequiredLabel>Company Sector</RequiredLabel>
                            </FormLabel>
                            <FormControl><Input placeholder="e.g. IT Services" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="package_lpa"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <RequiredLabel>Package (CTC)</RequiredLabel>
                            </FormLabel>
                            <FormControl><Input type="number" step="0.1" placeholder="e.g. 7.5 (LPA)" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="company_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <RequiredLabel>Company Address</RequiredLabel>
                          </FormLabel>
                          <FormControl><Textarea rows={2} placeholder="Full address of the company" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="joining_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <RequiredLabel>Joining Date</RequiredLabel>
                          </FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}

                {exitReason === 'family_business' ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="business_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <RequiredLabel>Business / Company Name</RequiredLabel>
                            </FormLabel>
                            <FormControl><Input placeholder="e.g. Sharma Enterprises" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="business_nature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <RequiredLabel>Business / Company Sector</RequiredLabel>
                            </FormLabel>
                            <FormControl><Input placeholder="e.g. Manufacturing" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="business_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <RequiredLabel>Business / Company Address</RequiredLabel>
                          </FormLabel>
                          <FormControl><Textarea rows={3} placeholder="Full address of the business" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}

                {exitReason === 'planning_studies' ? (
                  <>
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <RequiredLabel>Country</RequiredLabel>
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value ?? ''}
                              onValueChange={field.onChange}
                              options={COUNTRIES.map((country) => ({ value: country, label: country }))}
                              placeholder="Select country"
                              searchPlaceholder="Search country..."
                              emptyMessage="No countries found."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="program_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <RequiredLabel>Intended Course</RequiredLabel>
                            </FormLabel>
                            <FormControl><Input placeholder="e.g. MS in Computer Science" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="institution_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <RequiredLabel>Preferred University</RequiredLabel>
                            </FormLabel>
                            <FormControl><Input placeholder="e.g. Stanford University" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="language_test"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {isAbroadCountry(selectedCountry) ? (
                              <RequiredLabel>Language Test</RequiredLabel>
                            ) : (
                              <span>Language Test <span className="text-xs text-muted-foreground">(optional for India)</span></span>
                            )}
                          </FormLabel>
                          <FormControl><Input placeholder="e.g. IELTS 7.5 / TOEFL 105" {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}

                {exitReason === 'higher_studies' ? (
                  <>
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <RequiredLabel>Country</RequiredLabel>
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value ?? ''}
                              onValueChange={field.onChange}
                              options={COUNTRIES.map((country) => ({ value: country, label: country }))}
                              placeholder="Select country"
                              searchPlaceholder="Search country..."
                              emptyMessage="No countries found."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="program_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <RequiredLabel>Course / Program</RequiredLabel>
                            </FormLabel>
                            <FormControl><Input placeholder="e.g. MS in Computer Science" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="institution_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <RequiredLabel>University Name</RequiredLabel>
                            </FormLabel>
                            <FormControl><Input placeholder="e.g. Stanford University" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="university_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <RequiredLabel>University Address</RequiredLabel>
                          </FormLabel>
                          <FormControl><Textarea rows={2} placeholder="Full address of the university" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}

                {exitReason === 'competitive_exam' ? (
                  <>
                    <FormField
                      control={form.control}
                      name="examination_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <RequiredLabel>Examination Name</RequiredLabel>
                          </FormLabel>
                          <FormControl><Input placeholder="e.g. UPSC CSE / GATE / CAT" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="additional_details"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Details <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                          <FormControl><Textarea rows={3} placeholder="Any additional context about your preparation" {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}

                <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
                  <div className="space-y-1">
                    <Label htmlFor="proof_attachment">
                      <RequiredLabel>{proofAttachmentLabel}</RequiredLabel>
                    </Label>
                    <p className="text-sm text-muted-foreground">{proofHelperText}</p>
                    <p className="text-xs text-muted-foreground">PDF files only.</p>
                  </div>
                  <Input
                    id="proof_attachment"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) => setSelectedProofFile(event.target.files?.[0] ?? null)}
                  />
                  {selectedProofFile ? (
                    <p className="text-xs text-muted-foreground">
                      Ready to upload: {selectedProofFile.name}
                    </p>
                  ) : null}
                  {existingProofUrl ? (
                    <Button type="button" variant="ghost" asChild className="w-fit px-0">
                      <a href={resolveBackendAssetUrl(existingProofUrl)} target="_blank" rel="noreferrer">
                        <FileText className="mr-2 h-4 w-4" />
                        View current proof
                      </a>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="declaration_accepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm">
                          <RequiredLabel>
                            I confirm that the information submitted in this request is true and correct. I understand
                            that inaccurate information may lead to return, rejection, or cancellation of the NDC.
                          </RequiredLabel>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {editingRequest ? 'Resubmit Request' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
