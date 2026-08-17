import { useEffect, useMemo, useRef, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import {
  AlertCircle,
  Building2,
  CalendarRange,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { RequiredLabel } from '@/components/shared/RequiredLabel';
import { useMyOffers } from '@/hooks/use-offer-api';
import {
  useCreateNoc,
  useMyNocs,
  useNocFieldSuggestions,
  useUploadNocOfferLetter,
  useUploadNocSupportingDocument,
} from '@/hooks/use-noc-api';
import { useMasterValues } from '@/hooks/use-master-api';
import { useStudentInterests, useStudentProfile } from '@/hooks/use-student-api';
import {
  getNocProgramLabel,
  isValidGst,
  isValidIndianMobile,
  isValidIndianPincode,
  isValidPan,
  normalizeIndianMobile,
} from '@/lib/nocModule';
import { INDIAN_STATES } from '@/lib/indianStates';
import { getCitiesForState } from '@/lib/indianCities';
import { NocApiError } from '@/services/nocService';
import {
  COMPANY_REFERENCE_LABELS,
  NOC_TYPE_LABELS,
  PLACEMENT_SOURCE_LABELS,
  type NOCProgram,
  type NOCType,
  type PlacementSource,
} from '@/types/noc';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';

interface NOCRequestWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormState {
  noc_type: NOCType;
  internship_type: 'internship' | 'placement' | '';
  program: NOCProgram | '';
  placement_source: PlacementSource;
  drive_id: string;
  selected_offer_id: string;
  company_name: string;
  company_address: string;
  company_city: string;
  company_state: string;
  company_pincode: string;
  company_pan: string;
  company_gst: string;
  contact_person_name: string;
  contact_person_designation: string;
  contact_person_phone: string;
  contact_person_email: string;
  reference_by: string;
  reference_details: string;
  role_title: string;
  technology_domain: string;
  job_description: string;
  stipend_amount: string;
  start_date: string;
  end_date: string;
  offer_letter_url: string;
  declaration: boolean;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const NOC_STEP_FIELDS: Record<number, (keyof FormState)[]> = {
  1: ['placement_source', 'program'],
  2: [
    'drive_id',
    'company_name',
    'company_address',
    'company_city',
    'company_state',
    'company_pincode',
    'company_pan',
    'company_gst',
    'contact_person_name',
    'contact_person_designation',
    'contact_person_phone',
    'contact_person_email',
    'reference_by',
    'reference_details',
  ],
  3: [
    'role_title',
    'technology_domain',
    'job_description',
    'stipend_amount',
    'start_date',
    'internship_type',
    'offer_letter_url',
  ],
  4: ['declaration'],
};

const OTHER_OPTION_VALUE = '__other__';

const STEPS = [
  { id: 1, title: 'Placement & Program', description: 'Choose how you were placed and the program.' },
  { id: 2, title: 'Company Details', description: 'Capture the company and offer details.' },
  { id: 3, title: 'Role Details', description: 'Add the role, dates, and optional documents.' },
  { id: 4, title: 'Review', description: 'Confirm the live request before submission.' },
];

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function createInitialState(): FormState {
  return {
    noc_type: 'internship',
    internship_type: '',
    program: '',
    placement_source: 'self_sourced',
    drive_id: '',
    selected_offer_id: '',
    company_name: '',
    company_address: '',
    company_city: '',
    company_state: '',
    company_pincode: '',
    company_pan: '',
    company_gst: '',
    contact_person_name: '',
    contact_person_designation: '',
    contact_person_phone: '',
    contact_person_email: '',
    reference_by: 'self',
    reference_details: '',
    role_title: '',
    technology_domain: '',
    job_description: '',
    stipend_amount: '',
    start_date: '',
    end_date: '',
    offer_letter_url: '',
    declaration: false,
  };
}

function getDurationWeeks(startDate: string, endDate: string) {
  if (!startDate || !endDate) return null;

  const dayCount = differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1;
  if (dayCount <= 0) return null;
  return Math.max(1, Math.ceil(dayCount / 7));
}

function hasValidEmailFormat(email: string) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeMasterValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function validateNocForm(
  form: FormState,
  nocTypeValues: string[],
  postingTypeValues: string[],
  issuedPostingTypes: Set<string>,
  hasSelectedOfferLetter: boolean,
): FormErrors {
  const errors: FormErrors = {};

  if (!form.program.trim()) {
    errors.program = 'Posting type is required.';
  } else if (postingTypeValues.length > 0 && !postingTypeValues.includes(form.program)) {
    errors.program = 'Please choose a valid posting type from masters.';
  } else if (issuedPostingTypes.has(normalizeMasterValue(form.program))) {
    errors.program = 'An NOC has already been issued for this posting type.';
  }

  if (!form.placement_source) {
    errors.placement_source = 'Placement source is required.';
  }

  if (form.placement_source === 'university_drive' && !form.selected_offer_id.trim()) {
    errors.drive_id = 'Please select a released offer.';
  }

  if (!form.company_name.trim()) {
    errors.company_name = 'Company name is required.';
  } else if (form.company_name.trim().length > 300) {
    errors.company_name = 'Company name must be 300 characters or fewer.';
  }

  if (form.company_address.trim().length > 2000) {
    errors.company_address = 'Company address must be 2000 characters or fewer.';
  }

  if (form.company_city.trim().length > 100) {
    errors.company_city = 'City must be 100 characters or fewer.';
  }

  if (form.company_state.trim().length > 100) {
    errors.company_state = 'State must be 100 characters or fewer.';
  }

  if (form.company_pincode.trim() && !isValidIndianPincode(form.company_pincode)) {
    errors.company_pincode = 'Enter a valid 6-digit pincode.';
  }

  if (form.company_pan.trim() && !isValidPan(form.company_pan)) {
    errors.company_pan = 'Enter a valid 10-character PAN (e.g. ABCDE1234F).';
  }

  if (form.company_gst.trim() && !isValidGst(form.company_gst)) {
    errors.company_gst = 'Enter a valid 15-character GSTIN.';
  }

  if (form.placement_source === 'self_sourced' && !form.contact_person_name.trim()) {
    errors.contact_person_name = 'Contact person name is required.';
  } else if (form.contact_person_name.trim().length > 200) {
    errors.contact_person_name = 'Contact person name must be 200 characters or fewer.';
  }

  if (form.contact_person_designation.trim().length > 100) {
    errors.contact_person_designation = 'Designation must be 100 characters or fewer.';
  }

  if (form.contact_person_phone.trim() && !isValidIndianMobile(form.contact_person_phone)) {
    errors.contact_person_phone = 'Enter a valid 10-digit mobile number.';
  }

  if (form.placement_source === 'self_sourced' && !form.contact_person_email.trim()) {
    errors.contact_person_email = 'Contact person email is required.';
  } else if (form.contact_person_email.trim() && !hasValidEmailFormat(form.contact_person_email.trim())) {
    errors.contact_person_email = 'Enter a valid email address.';
  } else if (form.contact_person_email.trim().length > 255) {
    errors.contact_person_email = 'Email must be 255 characters or fewer.';
  }

  if (form.reference_by.trim().length > 50) {
    errors.reference_by = 'Reference source must be 50 characters or fewer.';
  }

  if (form.reference_details.trim().length > 2000) {
    errors.reference_details = 'Reference details must be 2000 characters or fewer.';
  }

  if (!form.role_title.trim()) {
    errors.role_title = 'Role title is required.';
  } else if (form.role_title.trim().length > 200) {
    errors.role_title = 'Role title must be 200 characters or fewer.';
  }

  if (form.technology_domain.trim().length > 200) {
    errors.technology_domain = 'Technology / domain must be 200 characters or fewer.';
  }

  if (form.job_description.trim().length > 5000) {
    errors.job_description = 'Job description must be 5000 characters or fewer.';
  }

  if (form.stipend_amount.trim()) {
    const stipendValue = Number(form.stipend_amount);
    if (!Number.isFinite(stipendValue) || stipendValue < 0) {
      errors.stipend_amount = 'Enter a valid stipend amount.';
    }
  }

  if (!form.start_date) {
    errors.start_date = 'Start date is required.';
  }

  if (!form.internship_type) {
    errors.internship_type = 'Please select an internship type.';
  }

  if (form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)) {
    errors.end_date = 'End date must be on or after the start date.';
  }

  if (!form.offer_letter_url.trim() && !hasSelectedOfferLetter) {
    errors.offer_letter_url = 'Offer letter is required.';
  } else if (form.offer_letter_url.trim().length > 2000) {
    errors.offer_letter_url = 'Offer letter reference is too long.';
  }

  if (!form.declaration) {
    errors.declaration = 'Please confirm the declaration.';
  }

  return errors;
}

function mapValidationDetailsToErrors(
  details: Array<{ field: string; message: string; code?: string }>,
): FormErrors {
  const errors: FormErrors = {};

  for (const detail of details) {
    if (Object.prototype.hasOwnProperty.call(createInitialState(), detail.field)) {
      errors[detail.field as keyof FormState] = detail.message;
    }
  }

  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  // data-field-error marks this as a scroll/focus anchor for the first-error navigation.
  return <p data-field-error className="text-sm text-destructive">{message}</p>;
}

export function NOCRequestWizard({ isOpen, onClose, onSuccess }: NOCRequestWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormState>(createInitialState());
  const [selectedOfferLetter, setSelectedOfferLetter] = useState<File | null>(null);
  const [selectedSupportingDocument, setSelectedSupportingDocument] = useState<File | null>(null);
  const [companyNameOther, setCompanyNameOther] = useState(false);
  const [stateOther, setStateOther] = useState(false);
  const [cityOther, setCityOther] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const offerLetterInputRef = useRef<HTMLInputElement | null>(null);
  const supportingDocumentInputRef = useRef<HTMLInputElement | null>(null);
  const stepContentRef = useRef<HTMLDivElement | null>(null);
  const createNoc = useCreateNoc();
  const uploadOfferLetter = useUploadNocOfferLetter();
  const uploadSupportingDocument = useUploadNocSupportingDocument();
  const fieldSuggestionsQuery = useNocFieldSuggestions(isOpen);
  const myNocsQuery = useMyNocs();
  const studentProfileQuery = useStudentProfile();
  const nocTypeValuesQuery = useMasterValues('noc_type');
  // Posting types SCOPED to this student (server applies matchesStudentTargetingForMaster). Untargeted
  // types match everyone, so this is the "eligible / enrolled" half of the Self-Sourced program list.
  const eligiblePostingTypesQuery = useMasterValues('posting_type');
  // all_targets=true → the full active catalogue. Used ONLY to validate the student's interest values
  // (interest rows contain legacy strings that are no longer posting types) — never to populate the list.
  const allPostingTypesQuery = useMasterValues('posting_type', true, true);
  const studentInterestsQuery = useStudentInterests();
  const myOffersQuery = useMyOffers();

  // The student's OWN released offers (useMyOffers is scoped to this student). "Released" = an offer TPO
  // created/extended; show released-but-not-rejected (pending acceptance + accepted), never a rejected one.
  const releasedOffers = useMemo(() => {
    return (myOffersQuery.data ?? []).filter(
      (offer) => offer.status === 'pending_student_action' || offer.status === 'accepted'
    );
  }, [myOffersQuery.data]);

  const selectedOffer = useMemo(() => {
    return releasedOffers.find((offer) => offer.id === form.selected_offer_id) ?? null;
  }, [releasedOffers, form.selected_offer_id]);

  const issuedPostingTypes = useMemo(() => {
    const values = myNocsQuery.data ?? [];
    return new Set(
      values
        .filter((noc) => noc.status === 'issued')
        .map((noc) => normalizeMasterValue(noc.program))
    );
  }, [myNocsQuery.data]);

  const nocTypeOptions = useMemo(() => {
    const liveValues = nocTypeValuesQuery.data ?? [];
    const fallbackValues = Object.keys(NOC_TYPE_LABELS);
    const values = liveValues.length > 0 ? liveValues : fallbackValues;

    return values.map((value) => ({
      value,
      label: NOC_TYPE_LABELS[value as NOCType] ?? value,
      keywords: [value],
    }));
  }, [nocTypeValuesQuery.data]);

  // Posting types the student was PLACED in via an offer (drives the University-Drive program list).
  const offerPostingTypeValues = useMemo(() => {
    return releasedOffers
      .map((offer) => offer.posting?.type?.trim() ?? '')
      .filter((value): value is string => Boolean(value));
  }, [releasedOffers]);

  // Posting types the student registered interest in ("Show Interest"), intersected with the ACTIVE
  // master catalogue: interest_type stores a free value, and legacy rows hold strings that are no
  // longer posting types (job, summer_internship, …). Offering those would fail the wizard's own
  // "valid posting type from masters" check at submit. The master's spelling wins so the submitted
  // value is canonical.
  const interestPostingTypeValues = useMemo(() => {
    const activeByNormalized = new Map(
      (allPostingTypesQuery.data ?? []).map((value) => [normalizeMasterValue(value), value]),
    );

    return (studentInterestsQuery.data ?? [])
      .map((interest) => activeByNormalized.get(normalizeMasterValue(interest.interest_type ?? '')))
      .filter((value): value is string => Boolean(value));
  }, [allPostingTypesQuery.data, studentInterestsQuery.data]);

  // Program list is per placement source: University Drive → only offer (placed) types;
  // Self-Sourced → posting types the student is ELIGIBLE for (targeting) OR registered interest in.
  const activePostingTypeValues = useMemo(() => {
    if (form.placement_source === 'university_drive') {
      return offerPostingTypeValues;
    }

    const seen = new Set<string>();
    return [...(eligiblePostingTypesQuery.data ?? []), ...interestPostingTypeValues].filter((value) => {
      const normalized = normalizeMasterValue(value ?? '');
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }, [
    eligiblePostingTypesQuery.data,
    form.placement_source,
    interestPostingTypeValues,
    offerPostingTypeValues,
  ]);

  const postingTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    return activePostingTypeValues
      .map((value) => value?.trim() ?? '')
      .filter((value) => {
        if (!value || seen.has(value)) return false;
        seen.add(value);
        return true;
      })
      .map((value) => {
        const normalizedValue = normalizeMasterValue(value);
        const isIssued = issuedPostingTypes.has(normalizedValue);

        return {
          value,
          label: isIssued ? `${getNocProgramLabel(value)} (Issued)` : getNocProgramLabel(value),
          keywords: isIssued ? [value, 'issued'] : [value],
          disabled: isIssued,
        };
      });
  }, [issuedPostingTypes, activePostingTypeValues]);

  const postingTypeLoading =
    form.placement_source !== 'university_drive'
    && ((eligiblePostingTypesQuery.isLoading && !eligiblePostingTypesQuery.data)
      || (allPostingTypesQuery.isLoading && !allPostingTypesQuery.data)
      || (studentInterestsQuery.isLoading && !studentInterestsQuery.data));

  // Self-Sourced with nothing available: the student must register interest first. `program` is
  // already required, so the wizard blocks on its own — this only explains why the list is empty.
  const noPostingTypesAvailable =
    form.placement_source !== 'university_drive'
    && !postingTypeLoading
    && postingTypeOptions.length === 0;

  const companySuggestions = fieldSuggestionsQuery.data?.companies ?? [];
  const citySuggestions = fieldSuggestionsQuery.data?.cities ?? [];
  const designationSuggestions = fieldSuggestionsQuery.data?.designations ?? [];

  const companyOptions = useMemo(
    () =>
      companySuggestions.map((company) => ({
        value: company.name,
        label: company.name,
        keywords: [company.name],
      })),
    [companySuggestions],
  );

  // Pinned to the top of the company search and always visible (even while typing) so a student can
  // always add a company that isn't in the suggestions list.
  const companyPinnedOptions = useMemo(
    () => [
      {
        value: OTHER_OPTION_VALUE,
        label: 'Other – Enter New Company',
        keywords: ['other', 'new', 'add', 'company'],
      },
    ],
    [],
  );

  const stateOptions = useMemo(() => {
    const options = INDIAN_STATES.map((state) => ({ value: state, label: state, keywords: [state] }));
    options.push({ value: OTHER_OPTION_VALUE, label: 'Other', keywords: ['other'] });
    return options;
  }, []);

  // Cities for the selected state (empty when no/unmapped/"Other" state). The current
  // company_city is merged in so an already-captured value stays selectable on edit.
  const cityOptions = useMemo(() => {
    const cities = getCitiesForState(form.company_state);
    const list = form.company_city && !cities.includes(form.company_city)
      ? [form.company_city, ...cities]
      : cities;
    return list.map((city) => ({ value: city, label: city, keywords: [city] }));
  }, [form.company_state, form.company_city]);

  // "Other – enter city" stays visible even while searching, so a student can always add
  // a city that isn't in the curated list.
  const cityPinnedOptions = useMemo(
    () => [
      {
        value: OTHER_OPTION_VALUE,
        label: 'Other – Enter New City',
        keywords: ['other', 'new', 'add', 'city'],
      },
    ],
    [],
  );

  // City becomes a state-scoped dropdown only when the chosen state has mapped cities and
  // is not the free-typed "Other" state; otherwise it falls back to free text.
  const useCityDropdown = !stateOther && getCitiesForState(form.company_state).length > 0;

  const durationWeeks = useMemo(() => {
    return getDurationWeeks(form.start_date, form.end_date);
  }, [form.end_date, form.start_date]);

  const validationErrors = useMemo(
    () => validateNocForm(
      form,
      nocTypeOptions.map((option) => option.value),
      postingTypeOptions.map((option) => option.value),
      issuedPostingTypes,
      Boolean(selectedOfferLetter),
    ),
    [form, issuedPostingTypes, nocTypeOptions, postingTypeOptions, selectedOfferLetter],
  );

  function getVisibleError(field: keyof FormState) {
    return touchedFields[field] || submitAttempted ? validationErrors[field] : undefined;
  }

  function markFieldsTouched(fields: (keyof FormState)[]) {
    setTouchedFields((current) => {
      const next = { ...current };
      for (const field of fields) {
        next[field] = true;
      }
      return next;
    });
  }

  function hasStepError(step: number) {
    return NOC_STEP_FIELDS[step].some((field) => Boolean(validationErrors[field]));
  }

  function getStepForField(field: keyof FormState) {
    const entry = Object.entries(NOC_STEP_FIELDS).find(([, fields]) => fields.includes(field));
    return entry ? Number(entry[0]) : 4;
  }

  // After navigating to the step that holds the first error, scroll it into view and focus its input.
  // Runs on a timeout so the newly-rendered step's DOM (and its FieldError anchors) exists first.
  function focusFirstStepError() {
    window.setTimeout(() => {
      const container = stepContentRef.current;
      const errorEl = container?.querySelector<HTMLElement>('[data-field-error]');
      if (!errorEl) return;
      const group = errorEl.parentElement;
      const focusable = group?.querySelector<HTMLElement>(
        'input, textarea, [role="combobox"], button[role="combobox"]',
      );
      (focusable ?? errorEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
      focusable?.focus?.({ preventScroll: true });
    }, 60);
  }

  function resetForm() {
    setCurrentStep(1);
    setForm(createInitialState());
    setSelectedOfferLetter(null);
    setSelectedSupportingDocument(null);
    setCompanyNameOther(false);
    setStateOther(false);
    setCityOther(false);
    setTouchedFields({});
    setSubmitAttempted(false);
    if (offerLetterInputRef.current) {
      offerLetterInputRef.current.value = '';
    }
    if (supportingDocumentInputRef.current) {
      supportingDocumentInputRef.current.value = '';
    }
  }

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
    setForm((current) => ({ ...current, [field]: value }));
  }

  // The "Released Offers by TPO" dropdown lists the student's own released offers. Option values are
  // prefixed (`offer:`) to match the value binding. Picking an offer prefills company/role (and program
  // when valid) — all editable afterwards.
  function handlePlacementSelectionChange(value: string) {
    setTouchedFields((current) => ({ ...current, drive_id: true }));

    const offerId = value.startsWith('offer:') ? value.slice('offer:'.length) : value;
    const offer = releasedOffers.find((item) => item.id === offerId) ?? null;
    setForm((current) => {
      const next: FormState = { ...current, selected_offer_id: offerId, drive_id: '' };
      if (offer) {
        next.company_name = offer.company.name;
        next.role_title = offer.role;
        const offerProgram = offer.posting?.type ?? '';
        if (
          offerProgram &&
          postingTypeOptions.some((option) => option.value === offerProgram) &&
          !issuedPostingTypes.has(normalizeMasterValue(offerProgram))
        ) {
          next.program = offerProgram;
        }
      }
      return next;
    });
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      resetForm();
      onClose();
    }
  }

  function canProceed(step: number) {
    return !hasStepError(step);
  }

  async function handleSubmit() {
    setSubmitAttempted(true);

    const firstInvalidField = (Object.keys(validationErrors) as (keyof FormState)[])[0];
    if (firstInvalidField) {
      const targetStep = getStepForField(firstInvalidField);
      markFieldsTouched(NOC_STEP_FIELDS[targetStep]);
      setCurrentStep(targetStep);
      focusFirstStepError();
      toast.error('Please fix the highlighted fields before submitting.');
      return;
    }

    try {
      let offerLetterUrl = form.offer_letter_url;
      if (selectedOfferLetter) {
        const uploadedDocument = await uploadOfferLetter.mutateAsync(selectedOfferLetter);
        offerLetterUrl = uploadedDocument.offer_letter_url;
      }

      let supportingDocumentUrl: string | null = null;
      let supportingDocumentName: string | null = null;
      if (selectedSupportingDocument) {
        const uploadedSupporting = await uploadSupportingDocument.mutateAsync(selectedSupportingDocument);
        supportingDocumentUrl = uploadedSupporting.supporting_document_url;
        supportingDocumentName = uploadedSupporting.supporting_document_name;
      }

      await createNoc.mutateAsync({
        noc_type: form.noc_type,
        internship_type: form.internship_type || null,
        program: form.program as NOCProgram,
        placement_source: form.placement_source,
        drive_id: form.placement_source === 'university_drive' ? form.drive_id || null : null,
        company_name: form.company_name.trim(),
        company_address: form.company_address.trim() || null,
        company_city: form.company_city.trim() || null,
        company_state: form.company_state.trim() || null,
        company_pincode: form.company_pincode.trim() || null,
        company_pan: form.company_pan.trim() ? form.company_pan.trim().toUpperCase() : null,
        company_gst: form.company_gst.trim() ? form.company_gst.trim().toUpperCase() : null,
        supporting_document_url: supportingDocumentUrl,
        supporting_document_name: supportingDocumentName,
        contact_person_name: form.contact_person_name.trim() || null,
        contact_person_designation: form.contact_person_designation.trim() || null,
        // Store the bare 10 digits however it was typed ("+91 98765-43210" → "9876543210"), so the
        // certificate and the auto-created recruiter carry a clean number.
        contact_person_phone: normalizeIndianMobile(form.contact_person_phone) || null,
        contact_person_email: form.contact_person_email.trim() || null,
        reference_by:
          form.placement_source === 'self_sourced' ? form.reference_by.trim() || null : null,
        reference_details:
          form.placement_source === 'self_sourced' ? form.reference_details.trim() || null : null,
        role_title: form.role_title.trim(),
        technology_domain: form.technology_domain.trim() || null,
        job_description: form.job_description.trim() || null,
        stipend_amount: form.stipend_amount ? Number(form.stipend_amount) : null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        duration_weeks: durationWeeks,
        offer_letter_url: offerLetterUrl,
      });

      toast.success('NOC request submitted successfully.');
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      if (error instanceof NocApiError && error.details.length > 0) {
        const backendErrors = mapValidationDetailsToErrors(error.details);
        setTouchedFields((current) => {
          const next = { ...current };
          for (const field of Object.keys(backendErrors) as (keyof FormState)[]) {
            next[field] = true;
          }
          return next;
        });

        const backendFirstField = (Object.keys(backendErrors) as (keyof FormState)[])[0];
        if (backendFirstField) {
          setCurrentStep(getStepForField(backendFirstField));
          focusFirstStepError();
        }

        toast.error('Please fix the highlighted fields before submitting.');
        return;
      }

      toast.error(formatApiErrorMessage(error, 'Unable to submit the NOC request.'));
    }
  }

  const studentProfile = studentProfileQuery.data;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Request No Objection Certificate</DialogTitle>
          <DialogDescription>
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].description}
          </DialogDescription>

          <div className="mt-4 flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    currentStep === step.id
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > step.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={[
                      'mx-2 h-0.5 w-10',
                      currentStep > step.id ? 'bg-emerald-500' : 'bg-muted',
                    ].join(' ')}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div ref={stepContentRef} className="min-h-0 flex-1 overflow-y-auto px-6">
          {currentStep === 1 && (
            <div className="space-y-6 py-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  <RequiredLabel>Placement Source</RequiredLabel>
                </Label>
                <RadioGroup
                  value={form.placement_source}
                  onValueChange={(value) => {
                    const nextValue = value as PlacementSource;
                    setForm((current) => ({
                      ...current,
                      placement_source: nextValue,
                      // Program options change with the source; clear so the user re-picks a valid one.
                      program: '',
                      drive_id: '',
                      selected_offer_id: '',
                      company_name: '',
                      company_address: '',
                      company_city: '',
                      company_state: '',
                      company_pincode: '',
                      contact_person_name: '',
                      contact_person_designation: '',
                      contact_person_phone: '',
                      contact_person_email: '',
                      reference_by: 'self',
                      reference_details: '',
                    }));
                    // Company block is cleared above; reset the dependent "Other" free-text modes.
                    setCompanyNameOther(false);
                    setStateOther(false);
                    setCityOther(false);
                  }}
                >
                  {Object.entries(PLACEMENT_SOURCE_LABELS).map(([value, label]) => (
                    <div key={value} className="flex items-center gap-3 rounded-lg border p-3">
                      <RadioGroupItem value={value} id={`placement-source-${value}`} />
                      <Label htmlFor={`placement-source-${value}`} className="cursor-pointer flex-1">
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <FieldError message={getVisibleError('placement_source')} />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">
                  <RequiredLabel>Program / Category</RequiredLabel>
                </Label>
                <SearchableSelect
                  options={postingTypeOptions}
                  value={form.program}
                  onValueChange={(value) => updateField('program', value as NOCProgram)}
                  placeholder="Select posting type"
                  searchPlaceholder="Search posting type..."
                  emptyMessage={
                    form.placement_source === 'university_drive'
                      ? 'No released offers found — use Self-Sourced instead.'
                      : 'No posting type available for you — register interest from your Dashboard first.'
                  }
                  loadingMessage="Loading posting types..."
                  isLoading={postingTypeLoading}
                  disabled={postingTypeLoading}
                  buttonClassName={getVisibleError('program') ? 'border-destructive' : undefined}
                  contentClassName="w-[min(34rem,calc(100vw-2rem))]"
                />
                {noPostingTypesAvailable ? (
                  <p className="text-sm text-muted-foreground">
                    No posting type is available for you yet. Register interest in a posting type from
                    your Dashboard, then come back to raise the NOC.
                  </p>
                ) : null}
                <FieldError message={getVisibleError('program')} />
              </div>

              <Card className="bg-muted/40">
                <CardContent className="p-4">
                  <p className="mb-2 text-sm font-medium">Student Details</p>
                  {studentProfileQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading your profile...
                    </div>
                  ) : studentProfile ? (
                    <div className="grid gap-2 text-sm md:grid-cols-2">
                      <p><span className="text-muted-foreground">Name:</span> {studentProfile.student.full_name}</p>
                      <p><span className="text-muted-foreground">Enrollment:</span> {studentProfile.student.enrollment_number}</p>
                      <p><span className="text-muted-foreground">Department:</span> {studentProfile.student.department}</p>
                      <p><span className="text-muted-foreground">Semester:</span> {studentProfile.academic?.semester ?? '—'}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Your live profile could not be loaded yet. You can still continue if required.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 py-6">
              {form.placement_source === 'university_drive' ? (
                <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label>
                    <RequiredLabel>Released Offers by TPO</RequiredLabel>
                  </Label>
                  <Select
                    value={form.selected_offer_id ? `offer:${form.selected_offer_id}` : ''}
                    onValueChange={handlePlacementSelectionChange}
                  >
                    <SelectTrigger className={getVisibleError('drive_id') ? 'border-destructive' : undefined}>
                      <SelectValue placeholder="Select a released offer" />
                    </SelectTrigger>
                    <SelectContent>
                      {releasedOffers.map((offer) => (
                        <SelectItem key={offer.id} value={`offer:${offer.id}`}>
                          {offer.company.name} · {offer.role} ({offer.posting.title})
                        </SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                    <FieldError message={getVisibleError('drive_id')} />
                  </div>

                  {myOffersQuery.isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading your released offers...
                    </div>
                  )}

                  {!myOffersQuery.isLoading && releasedOffers.length === 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      <p>No released offers are available for you yet. Use `Self-Sourced / Off-Campus` if this request is not tied to a released offer.</p>
                    </div>
                  )}

                  {selectedOffer && (
                    <>
                      <Card className="bg-muted/40">
                        <CardContent className="space-y-1 p-4 text-sm">
                          <p className="font-medium text-foreground">{selectedOffer.company.name}</p>
                          <p className="text-muted-foreground">
                            {selectedOffer.role} · {selectedOffer.posting.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pre-filled from this offer — company name is editable below; role is editable on the next step.
                          </p>
                        </CardContent>
                      </Card>

                      <div className="space-y-2">
                        <Label>
                          <RequiredLabel>Company Name</RequiredLabel>
                        </Label>
                        <Input
                          value={form.company_name}
                          onChange={(event) => updateField('company_name', event.target.value)}
                          className={getVisibleError('company_name') ? 'border-destructive' : undefined}
                          placeholder="Company name"
                        />
                        <FieldError message={getVisibleError('company_name')} />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="space-y-2">
                    <Label>
                      <RequiredLabel>Company Name</RequiredLabel>
                    </Label>
                    <SearchableSelect
                      options={companyOptions}
                      pinnedOptions={companyPinnedOptions}
                      value={companyNameOther ? OTHER_OPTION_VALUE : form.company_name}
                      onValueChange={(value) => {
                        if (value === OTHER_OPTION_VALUE) {
                          setCompanyNameOther(true);
                          updateField('company_name', '');
                        } else {
                          setCompanyNameOther(false);
                          updateField('company_name', value);
                        }
                      }}
                      placeholder="Select an existing company or choose Other"
                      searchPlaceholder="Search companies..."
                      emptyMessage="No companies found."
                      isLoading={fieldSuggestionsQuery.isLoading}
                      buttonClassName={getVisibleError('company_name') ? 'border-destructive' : undefined}
                      contentClassName="w-[min(34rem,calc(100vw-2rem))]"
                    />
                    {(companyNameOther || companySuggestions.length === 0) && (
                      <Input
                        value={form.company_name}
                        onChange={(event) => {
                          setCompanyNameOther(true);
                          updateField('company_name', event.target.value);
                        }}
                        placeholder="Enter new company name"
                        className={getVisibleError('company_name') ? 'border-destructive' : undefined}
                      />
                    )}
                    <FieldError message={getVisibleError('company_name')} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Company Address</Label>
                      <Input
                        value={form.company_address}
                        onChange={(event) => updateField('company_address', event.target.value)}
                        placeholder="Address line"
                        className={getVisibleError('company_address') ? 'border-destructive' : undefined}
                      />
                      <FieldError message={getVisibleError('company_address')} />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      {useCityDropdown ? (
                        <>
                          <SearchableSelect
                            options={cityOptions}
                            pinnedOptions={cityPinnedOptions}
                            value={cityOther ? OTHER_OPTION_VALUE : form.company_city}
                            onValueChange={(value) => {
                              if (value === OTHER_OPTION_VALUE) {
                                setCityOther(true);
                                updateField('company_city', '');
                              } else {
                                setCityOther(false);
                                updateField('company_city', value);
                              }
                            }}
                            placeholder="Select city"
                            searchPlaceholder="Search cities..."
                            emptyMessage="No cities found."
                            buttonClassName={getVisibleError('company_city') ? 'border-destructive' : undefined}
                            contentClassName="w-[min(34rem,calc(100vw-2rem))]"
                          />
                          {cityOther && (
                            <Input
                              list="noc-city-suggestions"
                              value={form.company_city}
                              onChange={(event) => updateField('company_city', event.target.value)}
                              placeholder="Enter city"
                              className={getVisibleError('company_city') ? 'border-destructive' : undefined}
                            />
                          )}
                        </>
                      ) : (
                        <Input
                          list="noc-city-suggestions"
                          value={form.company_city}
                          onChange={(event) => updateField('company_city', event.target.value)}
                          placeholder={form.company_state ? 'City' : 'Select a state first'}
                          className={getVisibleError('company_city') ? 'border-destructive' : undefined}
                        />
                      )}
                      <datalist id="noc-city-suggestions">
                        {citySuggestions.map((city) => (
                          <option key={city} value={city} />
                        ))}
                      </datalist>
                      <FieldError message={getVisibleError('company_city')} />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <SearchableSelect
                        options={stateOptions}
                        value={stateOther ? OTHER_OPTION_VALUE : form.company_state}
                        onValueChange={(value) => {
                          // Changing the state invalidates the current city — clear it so a stale
                          // city from a previous state can't persist, and reset the city "Other" mode.
                          setCityOther(false);
                          updateField('company_city', '');
                          if (value === OTHER_OPTION_VALUE) {
                            setStateOther(true);
                            updateField('company_state', '');
                          } else {
                            setStateOther(false);
                            updateField('company_state', value);
                          }
                        }}
                        placeholder="Select state"
                        searchPlaceholder="Search states..."
                        emptyMessage="No states found."
                        buttonClassName={getVisibleError('company_state') ? 'border-destructive' : undefined}
                        contentClassName="w-[min(34rem,calc(100vw-2rem))]"
                      />
                      {stateOther && (
                        <Input
                          value={form.company_state}
                          onChange={(event) => updateField('company_state', event.target.value)}
                          placeholder="Enter state"
                          className={getVisibleError('company_state') ? 'border-destructive' : undefined}
                        />
                      )}
                      <FieldError message={getVisibleError('company_state')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pincode</Label>
                      <Input
                        value={form.company_pincode}
                        onChange={(event) => updateField('company_pincode', event.target.value)}
                        placeholder="6-digit pincode"
                        inputMode="numeric"
                        maxLength={6}
                        className={getVisibleError('company_pincode') ? 'border-destructive' : undefined}
                      />
                      <FieldError message={getVisibleError('company_pincode')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Company PAN</Label>
                      <Input
                        value={form.company_pan}
                        onChange={(event) => updateField('company_pan', event.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className={getVisibleError('company_pan') ? 'border-destructive' : undefined}
                      />
                      <FieldError message={getVisibleError('company_pan')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Company GST</Label>
                      <Input
                        value={form.company_gst}
                        onChange={(event) => updateField('company_gst', event.target.value.toUpperCase())}
                        placeholder="22ABCDE1234F1Z5"
                        maxLength={15}
                        className={getVisibleError('company_gst') ? 'border-destructive' : undefined}
                      />
                      <FieldError message={getVisibleError('company_gst')} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label><RequiredLabel>Contact Person Name</RequiredLabel></Label>
                      <Input
                        value={form.contact_person_name}
                        onChange={(event) => updateField('contact_person_name', event.target.value)}
                        placeholder="HR / reporting contact"
                        className={getVisibleError('contact_person_name') ? 'border-destructive' : undefined}
                      />
                      <FieldError message={getVisibleError('contact_person_name')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Designation</Label>
                      <Input
                        list="noc-designation-suggestions"
                        value={form.contact_person_designation}
                        onChange={(event) => updateField('contact_person_designation', event.target.value)}
                        placeholder="Designation"
                        className={getVisibleError('contact_person_designation') ? 'border-destructive' : undefined}
                      />
                      <datalist id="noc-designation-suggestions">
                        {designationSuggestions.map((designation) => (
                          <option key={designation} value={designation} />
                        ))}
                      </datalist>
                      <FieldError message={getVisibleError('contact_person_designation')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={form.contact_person_phone}
                        onChange={(event) => updateField('contact_person_phone', event.target.value)}
                        placeholder="10-digit mobile number"
                        inputMode="tel"
                        className={getVisibleError('contact_person_phone') ? 'border-destructive' : undefined}
                      />
                      <FieldError message={getVisibleError('contact_person_phone')} />
                    </div>
                    <div className="space-y-2">
                      <Label><RequiredLabel>Email</RequiredLabel></Label>
                      <Input
                        type="email"
                        value={form.contact_person_email}
                        onChange={(event) => updateField('contact_person_email', event.target.value)}
                        placeholder="name@company.com"
                        className={getVisibleError('contact_person_email') ? 'border-destructive' : undefined}
                      />
                      <FieldError message={getVisibleError('contact_person_email')} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Reference Source</Label>
                    <Select value={form.reference_by} onValueChange={(value) => updateField('reference_by', value)}>
                      <SelectTrigger className={getVisibleError('reference_by') ? 'border-destructive' : undefined}>
                        <SelectValue placeholder="Select reference source" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(COMPANY_REFERENCE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={getVisibleError('reference_by')} />
                  </div>

                  <div className="space-y-2">
                    <Label>Reference Details</Label>
                    <Textarea
                      rows={3}
                      value={form.reference_details}
                      onChange={(event) => updateField('reference_details', event.target.value)}
                      placeholder="Optional context about how this opportunity was sourced"
                      className={getVisibleError('reference_details') ? 'border-destructive' : undefined}
                    />
                    <FieldError message={getVisibleError('reference_details')} />
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label>
                  <RequiredLabel>Role / Position Title</RequiredLabel>
                </Label>
                <Input
                  value={form.role_title}
                  onChange={(event) => updateField('role_title', event.target.value)}
                  placeholder="Software Development Intern"
                  className={getVisibleError('role_title') ? 'border-destructive' : undefined}
                />
                <FieldError message={getVisibleError('role_title')} />
              </div>

              <div className="space-y-2">
                <Label>Technology / Domain</Label>
                <Input
                  value={form.technology_domain}
                  onChange={(event) => updateField('technology_domain', event.target.value)}
                  placeholder="Cloud, Web Development, Data Science..."
                  className={getVisibleError('technology_domain') ? 'border-destructive' : undefined}
                />
                <FieldError message={getVisibleError('technology_domain')} />
              </div>

              <div className="space-y-2">
                <Label>Job Description</Label>
                <Textarea
                  rows={4}
                  value={form.job_description}
                  onChange={(event) => updateField('job_description', event.target.value)}
                  placeholder="Optional role summary"
                  className={getVisibleError('job_description') ? 'border-destructive' : undefined}
                />
                <FieldError message={getVisibleError('job_description')} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    <RequiredLabel>Start Date</RequiredLabel>
                  </Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(event) => updateField('start_date', event.target.value)}
                    className={getVisibleError('start_date') ? 'border-destructive' : undefined}
                  />
                  <FieldError message={getVisibleError('start_date')} />
                </div>
                <div className="space-y-2">
                  <Label>
                    End Date <span className="text-xs text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    min={form.start_date || undefined}
                    onChange={(event) => updateField('end_date', event.target.value)}
                    className={getVisibleError('end_date') ? 'border-destructive' : undefined}
                  />
                  <FieldError message={getVisibleError('end_date')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  <RequiredLabel>Internship Type</RequiredLabel>
                </Label>
                <RadioGroup
                  value={form.internship_type}
                  onValueChange={(value) => updateField('internship_type', value as FormState['internship_type'])}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {([
                    { value: 'internship', label: 'Internship' },
                    { value: 'placement', label: 'Placement' },
                  ] as const).map((option) => (
                    <div key={option.value} className="flex items-center gap-3 rounded-lg border p-3">
                      <RadioGroupItem value={option.value} id={`internship-type-${option.value}`} />
                      <Label htmlFor={`internship-type-${option.value}`} className="cursor-pointer flex-1">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <FieldError message={getVisibleError('internship_type')} />
              </div>

              {durationWeeks && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                  <p className="font-medium text-foreground">Estimated Duration</p>
                  <p className="mt-1 text-muted-foreground">{durationWeeks} week(s)</p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Stipend Amount (INR / month)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.stipend_amount}
                    onChange={(event) => updateField('stipend_amount', event.target.value)}
                    placeholder="15000"
                    className={getVisibleError('stipend_amount') ? 'border-destructive' : undefined}
                  />
                  <FieldError message={getVisibleError('stipend_amount')} />
                </div>
                <div className="space-y-2">
                  <Label>
                    <RequiredLabel>Offer Letter Upload</RequiredLabel>
                  </Label>
                  <Input
                    ref={offerLetterInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedOfferLetter(file);
                      updateField('offer_letter_url', file ? file.name : '');
                    }}
                    className={getVisibleError('offer_letter_url') ? 'border-destructive' : undefined}
                  />
                  <p className="text-xs text-muted-foreground">PDF files only.</p>
                  <FieldError message={getVisibleError('offer_letter_url')} />
                  {selectedOfferLetter ? (
                    <p className="text-xs text-muted-foreground">Ready to upload: {selectedOfferLetter.name}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Supporting Document <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  ref={supportingDocumentInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(event) => setSelectedSupportingDocument(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional company document (e.g. PAN card, GST certificate, registration proof). PDF files only.
                </p>
                {selectedSupportingDocument ? (
                  <p className="text-xs text-muted-foreground">Ready to upload: {selectedSupportingDocument.name}</p>
                ) : null}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 py-6">
              <Card>
                <CardContent className="space-y-3 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Program</span>
                    <span className="font-medium">
                      {form.program ? getNocProgramLabel(form.program) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Source</span>
                    <span className="font-medium">{PLACEMENT_SOURCE_LABELS[form.placement_source]}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{form.company_name || '—'}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {[form.company_city, form.company_state].filter(Boolean).join(', ') || 'Location not provided'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Role:</span> {form.role_title || '—'}
                  </p>
                  {(form.company_pan || form.company_gst) && (
                    <p>
                      <span className="text-muted-foreground">PAN / GST:</span>{' '}
                      {[form.company_pan, form.company_gst].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {selectedSupportingDocument && (
                    <p className="break-all">
                      <span className="text-muted-foreground">Supporting Document:</span> {selectedSupportingDocument.name}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {form.start_date || '—'} to {form.end_date || '—'}
                    </span>
                  </div>
                  <p>
                    <span className="text-muted-foreground">Technology:</span> {form.technology_domain || '—'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Stipend:</span>{' '}
                    {form.stipend_amount ? `₹${Number(form.stipend_amount).toLocaleString('en-IN')}/month` : 'Not provided'}
                  </p>
                  {form.offer_letter_url && (
                    <p className="break-all">
                      <span className="text-muted-foreground">Offer Letter:</span> {selectedOfferLetter?.name || form.offer_letter_url}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-primary/40">
                <CardContent className="p-4">
                  <Label className="mb-3 block text-base font-medium">
                    <RequiredLabel>Declaration</RequiredLabel>
                  </Label>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="noc-declaration"
                      checked={form.declaration}
                      onCheckedChange={(checked) => updateField('declaration', Boolean(checked))}
                    />
                    <Label htmlFor="noc-declaration" className="cursor-pointer text-sm leading-relaxed">
                      I confirm that the information above is accurate and I understand this request will enter the live faculty and TPO approval workflow.
                    </Label>
                  </div>
                  <FieldError message={getVisibleError('declaration')} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex w-full items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentStep((step) => Math.max(1, step - 1))} disabled={currentStep === 1 || createNoc.isPending || uploadOfferLetter.isPending || uploadSupportingDocument.isPending}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={() => {
                  if (canProceed(currentStep)) {
                    setCurrentStep((step) => Math.min(4, step + 1));
                    return;
                  }

                  setSubmitAttempted(true);
                  markFieldsTouched(NOC_STEP_FIELDS[currentStep]);
                  const firstInvalidField = NOC_STEP_FIELDS[currentStep].find((field) => validationErrors[field]);
                  if (firstInvalidField) {
                    setCurrentStep(getStepForField(firstInvalidField));
                  }
                  focusFirstStepError();
                }}
                disabled={createNoc.isPending || uploadOfferLetter.isPending || uploadSupportingDocument.isPending}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={createNoc.isPending || uploadOfferLetter.isPending || uploadSupportingDocument.isPending}>
                {(createNoc.isPending || uploadOfferLetter.isPending || uploadSupportingDocument.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!createNoc.isPending && !uploadOfferLetter.isPending && !uploadSupportingDocument.isPending && <FileText className="mr-2 h-4 w-4" />}
                Submit Request
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
