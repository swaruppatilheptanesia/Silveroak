import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useCreateEvent, useEventDetail, useUpdateEvent } from '@/hooks/use-event-api';
import { usePostings } from '@/hooks/use-posting-api';
import { useUsers } from '@/hooks/use-admin-api';
import {
  buildCreateEventPayload,
  createEmptyEventFormValues,
  eventDetailToFormValues,
  getDefaultReportingTime,
  type EventFormValues,
} from '@/lib/eventModule';
import { useEventTypeOptions } from '@/hooks/use-event-type-options';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { APPLICATION_STAGE_CONFIG, PIPELINE_STAGES } from '@/types/application';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';

// "All" + every pipeline stage (PIPELINE_STAGES excludes 'rejected', so append it explicitly).
const APPLICATION_STAGE_OPTIONS: { value: EventFormValues['application_stage']; label: string }[] = [
  { value: 'all', label: 'All' },
  ...PIPELINE_STAGES.map((stage) => ({ value: stage, label: APPLICATION_STAGE_CONFIG[stage].label })),
  { value: 'rejected', label: APPLICATION_STAGE_CONFIG.rejected.label },
];

interface EventEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string | null;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function EventEditorDialog({ open, onOpenChange, eventId }: EventEditorDialogProps) {
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const detailQuery = useEventDetail(open && eventId ? eventId : '');
  const isEditing = Boolean(eventId);
  const [formValues, setFormValues] = useState<EventFormValues>(createEmptyEventFormValues());
  const { options: eventTypeOptions, isLoading: eventTypesLoading } = useEventTypeOptions(open);
  const { options: postingTypeOptions, isLoading: postingTypesLoading } = usePostingTypeOptions(open);

  // Faculty coordinator picker — real faculty user accounts (id → name). The stored ids drive faculty
  // event visibility (backend scopes by user.id); names are kept for display/export.
  const facultyUsersQuery = useUsers(
    open
      ? { role: 'faculty_coordinator', is_active: 'true', page: 1, limit: 200, sort_by: 'name', sort_order: 'asc' }
      : { limit: 1 },
  );
  const facultyUsers = facultyUsersQuery.data?.data ?? [];
  const facultyOptions = useMemo(
    () => facultyUsers.map((user) => ({ value: user.id, label: user.name })),
    [facultyUsers],
  );

  // All postings of the selected posting type — drives BOTH the Company dropdown (distinct
  // companies) and the Linked Posting dropdown (filtered by the chosen company).
  const postingsQuery = usePostings({
    page: 1,
    limit: 100,
    posting_type_master_id: formValues.posting_type_master_id || undefined,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const typePostings = useMemo(
    () => (formValues.posting_type_master_id ? postingsQuery.data?.data ?? [] : []),
    [postingsQuery.data, formValues.posting_type_master_id],
  );

  const companyOptions = useMemo(() => {
    const seen = new Map<string, { value: string; label: string; description?: string }>();
    for (const posting of typePostings) {
      const company = posting.company;
      if (company && !seen.has(company.id)) {
        seen.set(company.id, {
          value: company.id,
          label: company.name,
          description: company.industry ?? undefined,
        });
      }
    }
    return Array.from(seen.values());
  }, [typePostings]);

  const availablePostings = useMemo(
    () => typePostings.filter((posting) => posting.company?.id === formValues.company_id),
    [typePostings, formValues.company_id],
  );

  useEffect(() => {
    if (!open) return;

    if (isEditing) {
      if (detailQuery.data) {
        // Best-effort: resolve the posting type from the first linked posting's type value.
        const linkedType = detailQuery.data.postings?.[0]?.type ?? detailQuery.data.posting?.type;
        const matchedTypeId = linkedType
          ? postingTypeOptions.find(
              (option) => option.value.trim().toLowerCase() === linkedType.trim().toLowerCase(),
            )?.id ?? ''
          : '';
        setFormValues(eventDetailToFormValues(detailQuery.data, matchedTypeId));
      }
      return;
    }

    setFormValues(createEmptyEventFormValues());
  }, [detailQuery.data, isEditing, open, postingTypeOptions]);

  function handlePostingTypeChange(value: string) {
    // The audience is derived on the backend from who applied to the selected company/role(s)
    // (Application table), NOT the posting-type's institute/course/branch scope — so clear target_*.
    setFormValues((current) => ({
      ...current,
      posting_type_master_id: value,
      company_id: '',
      posting_ids: [],
      target_institutes: [],
      target_courses: [],
      target_branches: [],
    }));
  }

  function updateField<K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) {
    setFormValues((current) => ({ ...current, [field]: value }));
  }

  function handleStartTimeChange(value: string) {
    setFormValues((current) => {
      const previousDefaultReportingTime = getDefaultReportingTime(current.start_time);
      const shouldSyncReportingTime = !isEditing
        && (!current.reporting_time || current.reporting_time === previousDefaultReportingTime);

      return {
        ...current,
        start_time: value,
        reporting_time: shouldSyncReportingTime ? getDefaultReportingTime(value) : current.reporting_time,
      };
    });
  }

  async function handleSubmit() {
    try {
      // Resolve display names for the selected coordinator ids (kept parallel for display/export).
      const coordinatorNames = formValues.faculty_coordinator_ids
        .map((id) => facultyUsers.find((user) => user.id === id)?.name)
        .filter((name): name is string => Boolean(name));
      const payload = buildCreateEventPayload(formValues, coordinatorNames);
      if (isEditing && eventId) {
        await updateEvent.mutateAsync({ eventId, data: payload });
        toast.success('Event updated successfully.');
      } else {
        await createEvent.mutateAsync(payload);
        toast.success('Event created as draft.');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to save the event.'));
    }
  }

  const isSaving = createEvent.isPending || updateEvent.isPending;
  const isLoading = isEditing && detailQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !h-[90vh] !max-w-3xl !flex-col !overflow-hidden !p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{isEditing ? 'Edit Event' : 'Create Event'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the live event schedule and instructions.'
              : 'Schedule a new campus drive, assessment, or workshop.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-6">
          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading event detail...
            </div>
          ) : detailQuery.error ? (
            <div className="py-8 text-sm text-destructive">
              {getErrorMessage(detailQuery.error, 'Unable to load the event detail.')}
            </div>
          ) : (
            <div className="space-y-4 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Event Type *</Label>
                  <SearchableSelect
                    value={formValues.type}
                    onValueChange={(value) => updateField('type', value as EventFormValues['type'])}
                    options={eventTypeOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    placeholder={eventTypesLoading ? 'Loading event types…' : 'Select event type'}
                    searchPlaceholder="Search event type..."
                    emptyMessage="No event types found."
                    isLoading={eventTypesLoading}
                    loadingMessage="Loading event types..."
                    disabled={eventTypesLoading || eventTypeOptions.length === 0}
                  />
                  {!eventTypesLoading && eventTypeOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No event types configured. Add them under Master Data → Event Types.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Posting Type *</Label>
                  <SearchableSelect
                    value={formValues.posting_type_master_id}
                    onValueChange={handlePostingTypeChange}
                    options={postingTypeOptions.map((option) => ({
                      value: option.id,
                      label: option.label,
                    }))}
                    placeholder={postingTypesLoading ? 'Loading posting types…' : 'Select posting type'}
                    searchPlaceholder="Search posting type..."
                    emptyMessage="No posting types found."
                    isLoading={postingTypesLoading}
                    loadingMessage="Loading posting types..."
                    disabled={postingTypesLoading || postingTypeOptions.length === 0}
                  />
                  {!postingTypesLoading && postingTypeOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No posting types configured. Add them under Master Data → Posting Types.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <SearchableSelect
                    value={formValues.company_id}
                    onValueChange={(value) => {
                      updateField('company_id', value);
                      updateField('posting_ids', []);
                    }}
                    options={companyOptions}
                    placeholder={formValues.posting_type_master_id ? 'Select company' : 'Select a posting type first'}
                    searchPlaceholder="Search company..."
                    emptyMessage={
                      postingsQuery.isLoading
                        ? 'Loading companies...'
                        : 'No companies have a posting of this type.'
                    }
                    isLoading={postingsQuery.isLoading}
                    loadingMessage="Loading companies..."
                    disabled={!formValues.posting_type_master_id || postingsQuery.isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Linked Postings (roles)</Label>
                  <SearchableMultiSelect
                    values={formValues.posting_ids}
                    onChange={(values) => updateField('posting_ids', values)}
                    options={availablePostings.map((posting) => ({
                      value: posting.id,
                      label: posting.title,
                    }))}
                    placeholder={formValues.company_id ? 'Select posting(s) — optional' : 'Select a company first'}
                    searchPlaceholder="Search postings..."
                    emptyMessage="No postings for this company and type."
                    disabled={!formValues.company_id}
                  />
                  <p className="text-xs text-muted-foreground">
                    Link one or more roles of this company to the event.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Application Pipeline Stage</Label>
                <SearchableSelect
                  value={formValues.application_stage}
                  onValueChange={(value) =>
                    updateField('application_stage', value as EventFormValues['application_stage'])
                  }
                  options={APPLICATION_STAGE_OPTIONS}
                  placeholder="Select a stage"
                  searchPlaceholder="Search stage..."
                  emptyMessage="No stages found."
                />
                <p className="text-xs text-muted-foreground">
                  Only students at this stage on the linked posting(s) are added to the event's
                  attendance list. "All" includes every applicant.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Event Title *</Label>
                <Input
                  value={formValues.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="TechCorp Campus Drive 2026"
                />
              </div>

              <div className="space-y-2 rounded-md border bg-muted/30 p-4">
                <Label className="text-sm font-medium">Target audience (based on applications)</Label>
                {(() => {
                  if (!formValues.posting_type_master_id) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        Select a Posting Type, then a Company, to set the audience.
                      </p>
                    );
                  }

                  const companyName =
                    companyOptions.find((option) => option.value === formValues.company_id)?.label ?? '';

                  if (!formValues.company_id) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        The audience is the students who applied to the selected company's role(s). Choose a
                        Company to continue.
                      </p>
                    );
                  }

                  const selectedRoleTitles = availablePostings
                    .filter((posting) => formValues.posting_ids.includes(posting.id))
                    .map((posting) => posting.title);

                  return (
                    <div className="space-y-1.5">
                      {selectedRoleTitles.length > 0 ? (
                        <p className="text-sm text-foreground">
                          Students who applied to the selected role(s) at{' '}
                          <span className="font-medium">{companyName}</span>:{' '}
                          <span className="text-muted-foreground">{selectedRoleTitles.join(', ')}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-foreground">
                          Students who applied to any role at{' '}
                          <span className="font-medium">{companyName}</span>. Select specific role(s) above to
                          narrow the audience.
                        </p>
                      )}
                      <p className="pt-1 text-xs text-muted-foreground">
                        Applicants are auto-assigned when you save (add-only). You can adjust the list later via
                        manual assignment.
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formValues.date}
                    onChange={(event) => updateField('date', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={formValues.start_time}
                    onChange={(event) => handleStartTimeChange(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={formValues.end_time}
                    onChange={(event) => updateField('end_time', event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Venue *</Label>
                  <Input
                    value={formValues.venue}
                    onChange={(event) => updateField('venue', event.target.value)}
                    placeholder="Auditorium Hall A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reporting Time</Label>
                  <Input
                    value={formValues.reporting_time}
                    onChange={(event) => updateField('reporting_time', event.target.value)}
                    placeholder="08:30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dress Code</Label>
                <Input
                  value={formValues.dress_code}
                  onChange={(event) => updateField('dress_code', event.target.value)}
                  placeholder="Formal"
                />
              </div>

              <div className="space-y-2">
                <Label>Instructions</Label>
                <Textarea
                  rows={4}
                  value={formValues.instructions}
                  onChange={(event) => updateField('instructions', event.target.value)}
                  placeholder="Bring your resume and college ID..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Documents Required</Label>
                  <Input
                    value={formValues.documents_required}
                    onChange={(event) => updateField('documents_required', event.target.value)}
                    placeholder="Resume, ID Card, Marksheet"
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated values.</p>
                </div>

                <div className="space-y-2">
                  <Label>Faculty Coordinators</Label>
                  <SearchableMultiSelect
                    options={facultyOptions}
                    values={formValues.faculty_coordinator_ids}
                    onChange={(values) => updateField('faculty_coordinator_ids', values)}
                    placeholder="Select faculty coordinators"
                    isLoading={facultyUsersQuery.isLoading}
                    loadingMessage="Loading faculty..."
                    emptyMessage="No faculty coordinators found."
                  />
                  <p className="text-xs text-muted-foreground">
                    Assigned faculty see this event under their Department Events.
                  </p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSaving
              || isLoading
              || !formValues.posting_type_master_id
              || !formValues.company_id
              || !formValues.title
              || !formValues.venue
            }
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
