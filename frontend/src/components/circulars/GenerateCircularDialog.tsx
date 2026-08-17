import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGenerateCircular } from '@/hooks/use-circular-api';
import { useEvents, useEventDetail } from '@/hooks/use-event-api';
import { usePostingDetail, usePostings } from '@/hooks/use-posting-api';
import {
  formatCircularFieldValue,
  getCircularErrorMessage,
  getCircularTypeLabel,
} from '@/lib/circularModule';
import { getEventTypeLabel, type ApiEventDetail } from '@/types/event';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import type { ApiPostingDetail } from '@/types/posting';
import type { ApiCircularTemplateType } from '@/types/circular';

interface GenerateCircularDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CircularSourceType = 'posting' | 'event';

interface SourceFieldOption {
  id: string;
  label: string;
  description?: string;
  value: unknown;
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function toInputValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return value == null ? '' : String(value);
}

function buildSelectionRounds(posting: ApiPostingDetail) {
  const rounds: string[] = [];

  if (posting.has_written_test) {
    rounds.push(posting.written_test_details?.trim() || 'Written Test');
  }

  if (posting.has_gd) {
    rounds.push(posting.gd_details?.trim() || 'Group Discussion');
  }

  if (posting.technical_rounds > 0) {
    rounds.push(`${posting.technical_rounds} Technical Round${posting.technical_rounds > 1 ? 's' : ''}`);
  }

  if (posting.hr_rounds > 0) {
    rounds.push(`${posting.hr_rounds} HR Round${posting.hr_rounds > 1 ? 's' : ''}`);
  }

  if (posting.additional_info?.trim()) {
    rounds.push(posting.additional_info.trim());
  }

  return rounds.join('\n');
}

function buildPostingSourceFieldOptions(posting: ApiPostingDetail | undefined): SourceFieldOption[] {
  if (!posting) return [];

  const location = posting.work_mode && posting.work_mode !== 'onsite'
    ? `${posting.location} (${formatPostingTypeLabel(posting.work_mode)})`
    : posting.location;
  const instructions = [posting.skill_requirements, posting.additional_info]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join('\n\n');

  return [
    { id: 'company_name', label: 'Company Name', value: posting.company.name },
    { id: 'role_name', label: 'Role Name', value: posting.role_name || posting.title },
    { id: 'job_description', label: 'Role Description', value: posting.role_description ?? '' },
    { id: 'location', label: 'Location / Work Mode', value: location },
    { id: 'eligible_branches', label: 'Eligible Branches', value: posting.eligible_branches, description: 'Fetched from posting eligibility' },
    { id: 'batch_year', label: 'Eligible Batches', value: posting.eligible_batches },
    { id: 'min_cgpa', label: 'Minimum CGPA', value: posting.min_cgpa > 0 ? String(posting.min_cgpa) : '' },
    { id: 'max_backlogs', label: 'Maximum Backlogs', value: String(posting.max_backlogs) },
    { id: 'ctc', label: 'CTC / Package', value: posting.ctc ?? '' },
    { id: 'stipend', label: 'Stipend', value: posting.stipend ?? '' },
    { id: 'duration', label: 'Duration', value: posting.duration ?? '' },
    { id: 'bond_details', label: 'Bond / Service Agreement', value: posting.bond_details ?? '' },
    { id: 'selection_rounds', label: 'Selection Process', value: buildSelectionRounds(posting) },
    { id: 'last_date', label: 'Last Date to Apply', value: posting.application_end_date ?? '' },
    { id: 'instructions', label: 'Instructions / Skills', value: instructions },
  ].filter((option) => hasValue(option.value));
}

function buildEventInstructions(event: ApiEventDetail) {
  const sections = [
    event.instructions?.trim() || '',
    event.documents_required.length > 0 ? `Documents Required: ${event.documents_required.join(', ')}` : '',
    event.dress_code?.trim() ? `Dress Code: ${event.dress_code.trim()}` : '',
    event.reporting_time?.trim() ? `Reporting Time: ${event.reporting_time.trim()}` : '',
  ].filter(Boolean);

  return sections.join('\n\n');
}

function buildEventSourceFieldOptions(event: ApiEventDetail | undefined): SourceFieldOption[] {
  if (!event) return [];

  return [
    { id: 'company_name', label: 'Company Name', value: event.company.name },
    { id: 'role_name', label: 'Role / Drive Name', value: event.posting?.title || event.title },
    { id: 'event_title', label: 'Event Title', value: event.title },
    { id: 'event_type', label: 'Event Type', value: getEventTypeLabel(event.type) },
    { id: 'drive_date', label: 'Drive Date', value: event.date },
    { id: 'drive_time', label: 'Time / Reporting Time', value: event.reporting_time || `${event.start_time} - ${event.end_time}` },
    { id: 'venue', label: 'Venue', value: event.venue },
    { id: 'documents_required', label: 'Documents Required', value: event.documents_required },
    { id: 'dress_code', label: 'Dress Code', value: event.dress_code ?? '' },
    { id: 'instructions', label: 'Instructions', value: buildEventInstructions(event) },
  ].filter((option) => hasValue(option.value));
}

function getDefaultCircularTitle(sourceType: CircularSourceType, posting: ApiPostingDetail | undefined, event: ApiEventDetail | undefined) {
  if (sourceType === 'posting' && posting) {
    return posting.title.trim();
  }

  if (sourceType === 'event' && event) {
    return event.title.trim();
  }

  return '';
}

function getPreferredCircularType(
  sourceType: CircularSourceType,
  posting: ApiPostingDetail | undefined,
  event: ApiEventDetail | undefined,
): ApiCircularTemplateType {
  if (sourceType === 'posting') {
    return posting?.type === 'job' ? 'placement' : 'internship';
  }

  if (event?.posting?.type === 'internship' || event?.posting?.type === 'stipend_internship' || event?.type === 'internship_drive') {
    return 'internship';
  }

  if (event?.type === 'workshop') {
    return 'general';
  }

  return 'campus_drive';
}

export default function GenerateCircularDialog({
  open,
  onOpenChange,
}: GenerateCircularDialogProps) {
  const postingsQuery = usePostings({
    limit: 100,
    status: 'published',
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const eventsQuery = useEvents({
    page: 1,
    limit: 100,
    status: 'published',
    sort_by: 'date',
    sort_order: 'desc',
  });
  const generateCircular = useGenerateCircular();

  const [circularTitle, setCircularTitle] = useState('');
  const [sourceType, setSourceType] = useState<CircularSourceType>('posting');
  const [selectedPostingId, setSelectedPostingId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedSourceFieldIds, setSelectedSourceFieldIds] = useState<string[]>([]);
  const [circularNote, setCircularNote] = useState('');
  const postings = postingsQuery.data?.data ?? [];
  const events = eventsQuery.data?.data ?? [];

  const selectedSourceId = sourceType === 'posting' ? selectedPostingId : selectedEventId;
  const postingDetailQuery = usePostingDetail(sourceType === 'posting' ? selectedPostingId : '');
  const eventDetailQuery = useEventDetail(sourceType === 'event' ? selectedEventId : '');
  const selectedPosting = sourceType === 'posting' ? postingDetailQuery.data : undefined;
  const selectedEvent = sourceType === 'event' ? eventDetailQuery.data : undefined;
  const selectedSourceLoading = sourceType === 'posting' ? postingDetailQuery.isLoading : eventDetailQuery.isLoading;
  const selectedSourceError = sourceType === 'posting' ? postingDetailQuery.error : eventDetailQuery.error;
  const selectedSourceLabel = sourceType === 'posting'
    ? (selectedPosting ? `${selectedPosting.title} - ${selectedPosting.company.name}` : '')
    : (selectedEvent ? `${selectedEvent.title} - ${selectedEvent.company.name}` : '');

  const sourceOptions = useMemo(() => {
    if (sourceType === 'posting') {
      return postings.map((posting) => ({
        value: posting.id,
        label: posting.title,
        description: posting.company.name,
        keywords: [posting.company.name, posting.role_name, posting.type],
      }));
    }

    return events.map((event) => ({
      value: event.id,
      label: event.title,
      description: `${event.company.name} • ${event.date}`,
      keywords: [event.company.name, event.venue, event.type, event.posting?.title ?? ''],
    }));
  }, [events, postings, sourceType]);

  const sourceFieldOptions = useMemo(
    () => (sourceType === 'posting' ? buildPostingSourceFieldOptions(selectedPosting) : buildEventSourceFieldOptions(selectedEvent)),
    [selectedEvent, selectedPosting, sourceType],
  );

  const circularType = getPreferredCircularType(sourceType, selectedPosting, selectedEvent);

  const effectiveFieldValues = useMemo(
    () => Object.fromEntries(
      sourceFieldOptions
        .filter((option) => selectedSourceFieldIds.includes(option.id))
        .map((option) => [option.id, option.value]),
    ),
    [selectedSourceFieldIds, sourceFieldOptions],
  );

  useEffect(() => {
    if (!open) {
      setCircularTitle('');
      setSourceType('posting');
      setSelectedPostingId('');
      setSelectedEventId('');
      setSelectedSourceFieldIds([]);
      setCircularNote('');
    }
  }, [open]);

  useEffect(() => {
    if (!selectedSourceId || sourceFieldOptions.length === 0) {
      setSelectedSourceFieldIds([]);
      return;
    }

    setSelectedSourceFieldIds(sourceFieldOptions.map((option) => option.id));
  }, [selectedSourceId, sourceFieldOptions]);

  useEffect(() => {
    if (circularTitle.trim()) return;

    const nextTitle = getDefaultCircularTitle(sourceType, selectedPosting, selectedEvent);
    if (nextTitle) {
      setCircularTitle(nextTitle);
    }
  }, [circularTitle, selectedEvent, selectedPosting, sourceType]);

  function handleClose() {
    onOpenChange(false);
  }

  async function handleGenerate() {
    if (!circularTitle.trim()) {
      toast.error('Circular title is required.');
      return;
    }

    if (!selectedSourceId) {
      toast.error(sourceType === 'posting' ? 'Select a job posting first.' : 'Select an event or drive first.');
      return;
    }

    const companyId = sourceType === 'posting' ? selectedPosting?.company.id : selectedEvent?.company.id;
    const companyName = sourceType === 'posting' ? selectedPosting?.company.name : selectedEvent?.company.name;
    const roleName = sourceType === 'posting'
      ? (selectedPosting?.role_name || selectedPosting?.title || '')
      : (selectedEvent?.posting?.title || selectedEvent?.title || '');

    if (!companyId || !companyName || !roleName) {
      toast.error('Unable to resolve circular source details. Please reselect the source and try again.');
      return;
    }

    try {
      await generateCircular.mutateAsync({
        company_id: companyId,
        company_name: companyName,
        role_name: roleName.trim(),
        type: circularType,
        field_values: {
          ...effectiveFieldValues,
          company_name: effectiveFieldValues.company_name ?? companyName,
          role_name: effectiveFieldValues.role_name ?? roleName.trim(),
          circular_title: circularTitle.trim(),
          circular_note: circularNote.trim(),
          circular_source_type: sourceType,
          circular_source_label: selectedSourceLabel,
          circular_source_id: selectedSourceId,
        },
      });

      toast.success('Circular generated successfully.');
      handleClose();
    } catch (error) {
      toast.error(getCircularErrorMessage(error, 'Unable to generate the circular.'));
    }
  }

  const previewValues = Object.fromEntries(
    Object.entries(effectiveFieldValues)
      .filter(([, value]) => hasValue(value))
      .map(([key, value]) => [key, formatCircularFieldValue(value)]),
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate Circular</DialogTitle>
          <DialogDescription>
            Create a circular from a job posting or an event, choose the source details to include, and add a note if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Circular Title</Label>
            <Input
              value={circularTitle}
              onChange={(event) => setCircularTitle(event.target.value)}
              placeholder="e.g. Campus Placement Drive Circular"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select
                value={sourceType}
                onValueChange={(value) => {
                  setSourceType(value as CircularSourceType);
                  setSelectedPostingId('');
                  setSelectedEventId('');
                  setSelectedSourceFieldIds([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="posting">Job Posting</SelectItem>
                  <SelectItem value="event">Events & Drives</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{sourceType === 'posting' ? 'Job Posting' : 'Event & Drive'}</Label>
            <SearchableSelect
              options={sourceOptions}
              value={selectedSourceId}
              onValueChange={(value) => {
                if (sourceType === 'posting') {
                  setSelectedPostingId(value);
                } else {
                  setSelectedEventId(value);
                }
              }}
              placeholder={sourceType === 'posting' ? 'Select a job posting' : 'Select an event or drive'}
              searchPlaceholder={sourceType === 'posting' ? 'Search postings...' : 'Search events...'}
              emptyMessage={sourceType === 'posting' ? 'No published postings found.' : 'No published events found.'}
              loadingMessage={sourceType === 'posting' ? 'Loading postings...' : 'Loading events...'}
              isLoading={sourceType === 'posting' ? postingsQuery.isLoading : eventsQuery.isLoading}
              clearable
            />
          </div>

          {selectedSourceId ? (
            <div className="space-y-2">
              <Label>Select Source Details to Show in Circular</Label>
              {selectedSourceLoading ? (
                <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading selected source details...
                </div>
              ) : selectedSourceError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  Unable to load the selected source details right now.
                </div>
              ) : sourceFieldOptions.length === 0 ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  No source details were found for this selection.
                </div>
              ) : (
                <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2">
                  {sourceFieldOptions.map((option) => (
                    <label key={option.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
                      <Checkbox
                        checked={selectedSourceFieldIds.includes(option.id)}
                        onCheckedChange={(checked) => {
                          setSelectedSourceFieldIds((current) => checked
                            ? Array.from(new Set([...current, option.id]))
                            : current.filter((entry) => entry !== option.id));
                        }}
                      />
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{option.label}</p>
                        <p className="line-clamp-3 text-xs text-muted-foreground">
                          {formatCircularFieldValue(option.value) || '—'}
                        </p>
                        {option.description ? (
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        ) : null}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Note Below Circular</Label>
            <Textarea
              rows={3}
              value={circularNote}
              onChange={(event) => setCircularNote(event.target.value)}
              placeholder="Add any note or instruction to display below the circular..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectedSourceLabel ? (
                <Badge variant="outline">{selectedSourceLabel}</Badge>
              ) : null}
              <Badge variant="outline">{getCircularTypeLabel(circularType)}</Badge>
            </div>

            <Separator />

            <Label>Live Preview Values</Label>
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="space-y-1 pb-3">
                <p className="text-sm">
                  <span className="text-muted-foreground">Circular Title:</span>{' '}
                  <span className="text-foreground">{circularTitle.trim() || '—'}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Source:</span>{' '}
                  <span className="text-foreground">{selectedSourceLabel || '—'}</span>
                </p>
                {circularNote.trim() ? (
                  <p className="whitespace-pre-wrap text-sm">
                    <span className="text-muted-foreground">Note:</span>{' '}
                    <span className="text-foreground">{circularNote.trim()}</span>
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(previewValues).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="text-muted-foreground">{key}:</span>{' '}
                    <span className="whitespace-pre-wrap text-foreground">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleGenerate()} disabled={generateCircular.isPending}>
            {generateCircular.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate Circular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
