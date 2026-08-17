import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Loader2, Search, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { applicationKeys } from '@/hooks/use-application-api';
import { applicationService } from '@/services/applicationService';
import { useAdminStudents } from '@/hooks/use-admin-api';
import { useAssignStudents, useEventDetail } from '@/hooks/use-event-api';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';

interface EventAssignmentDialogProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function EventAssignmentDialog({
  eventId,
  open,
  onOpenChange,
}: EventAssignmentDialogProps) {
  const detailQuery = useEventDetail(open && eventId ? eventId : '');
  const assignStudents = useAssignStudents();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [panelId, setPanelId] = useState<string>('none');
  const deferredSearch = useDeferredValue(searchTerm);

  const event = detailQuery.data;

  // An event links MULTIPLE roles (posting_ids); posting_id is only the legacy mirror of the first.
  // Query every linked role so applicants to the other roles aren't invisible. Reuses the existing
  // applicationKeys cache, and getAllApplications already stitches every page together.
  const linkedPostingIds = useMemo(() => {
    const ids = event?.posting_ids?.length
      ? event.posting_ids
      : [event?.posting_id].filter((id): id is string => Boolean(id));
    return Array.from(new Set(ids));
  }, [event?.posting_id, event?.posting_ids]);

  const applicationQueries = useQueries({
    queries: linkedPostingIds.map((postingId) => {
      const params = { posting_id: postingId, sort_by: 'applied_at' as const, sort_order: 'desc' as const };
      return {
        queryKey: applicationKeys.listAll(params),
        queryFn: () => applicationService.getAllApplications(params),
        staleTime: 60 * 1000,
      };
    }),
  });

  const applicantsLoading = applicationQueries.some((query) => query.isLoading);
  const applicationsError = applicationQueries.find((query) => query.error)?.error ?? null;

  const applicants = useMemo(
    () => applicationQueries.flatMap((query) => query.data ?? []),
    [applicationQueries],
  );

  // Fall back to the full student directory when the drive has no linked role, or nobody applied —
  // otherwise panel assignment is impossible. Search is server-side here (the list is paginated).
  const useStudentFallback = !applicantsLoading && applicants.length === 0;
  const studentsQuery = useAdminStudents(
    { search: deferredSearch.trim() || undefined, limit: 100, sort_by: 'full_name', sort_order: 'asc' },
    open && useStudentFallback,
  );

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearchTerm('');
      setPanelId('none');
      return;
    }

    setSelectedIds(new Set());
    setSearchTerm('');
    setPanelId('none');
  }, [eventId, open]);

  const panelNameById = useMemo(
    () => new Map((event?.panels ?? []).map((panel) => [panel.id, panel.panel_name])),
    [event?.panels],
  );

  /**
   * One list of everyone assignable, deduped by student id. Students already on the event are
   * INCLUDED (they were previously filtered out, which made it impossible to put an existing
   * attendee on a panel) and win over the applicant/directory entry so their panel is shown.
   */
  const candidates = useMemo(() => {
    type Candidate = {
      studentId: string;
      fullName: string;
      enrollmentNumber: string;
      department: string;
      assignedPanelId: string | null;
      isAssigned: boolean;
    };

    const byStudentId = new Map<string, Candidate>();

    for (const assignment of event?.assigned_students ?? []) {
      byStudentId.set(assignment.student_id, {
        studentId: assignment.student_id,
        fullName: assignment.student.full_name,
        enrollmentNumber: assignment.student.enrollment_number,
        department: assignment.student.department,
        assignedPanelId: assignment.panel_id,
        isAssigned: true,
      });
    }

    for (const application of applicants) {
      if (byStudentId.has(application.student.id)) continue;
      byStudentId.set(application.student.id, {
        studentId: application.student.id,
        fullName: application.student.full_name,
        enrollmentNumber: application.student.enrollment_number,
        department: application.student.department,
        assignedPanelId: null,
        isAssigned: false,
      });
    }

    if (useStudentFallback) {
      for (const student of studentsQuery.data?.data ?? []) {
        if (byStudentId.has(student.student_id)) continue;
        byStudentId.set(student.student_id, {
          studentId: student.student_id,
          fullName: student.full_name,
          enrollmentNumber: student.enrollment_number,
          department: student.department,
          assignedPanelId: null,
          isAssigned: false,
        });
      }
    }

    const query = deferredSearch.trim().toLowerCase();
    // The directory rows are already filtered by the server; assigned/applicant rows are not.
    return Array.from(byStudentId.values()).filter((candidate) => {
      if (!query) return true;
      return [candidate.fullName, candidate.enrollmentNumber, candidate.department].some((field) =>
        field?.toLowerCase().includes(query),
      );
    });
  }, [applicants, deferredSearch, event?.assigned_students, studentsQuery.data, useStudentFallback]);

  const candidatesLoading = applicantsLoading || (useStudentFallback && studentsQuery.isLoading);

  function toggleStudent(studentId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  async function handleAssign() {
    if (!eventId || selectedIds.size === 0) return;

    try {
      const result = await assignStudents.mutateAsync({
        eventId,
        data: {
          student_ids: Array.from(selectedIds),
          panel_id: panelId === 'none' ? null : panelId,
        },
      });

      const assigned = result.results.filter((item) => item.status === 'assigned').length;
      const failed = result.results.length - assigned;
      if (assigned > 0) {
        toast.success(`${assigned} student(s) assigned successfully.`);
      }
      if (failed > 0) {
        toast.error(`${failed} student(s) could not be assigned.`);
      }

      setSelectedIds(new Set());
      setSearchTerm('');
      onOpenChange(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to assign students.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !h-[90vh] !max-w-4xl !flex-col !overflow-hidden !p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Assign Students</DialogTitle>
          <DialogDescription>
            Add students to this drive and place them on a panel. Applicants to the linked role(s) are
            listed first; students already on the drive show their current panel and can be moved.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-6">
          {!eventId ? (
            <div className="py-8 text-sm text-muted-foreground">Select an event first.</div>
          ) : detailQuery.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading event detail...
            </div>
          ) : detailQuery.error || !event ? (
            <div className="py-8 text-sm text-destructive">
              {getErrorMessage(detailQuery.error, 'Unable to load the event detail.')}
            </div>
          ) : (
            <div className="space-y-4 py-6">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">{event.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {linkedPostingIds.length > 0
                    ? `${linkedPostingIds.length} linked role(s)`
                    : 'No linked role'}
                  {' • '}
                  {event.assigned_students.length} student(s) already assigned
                  {useStudentFallback ? ' • showing all students (no applicants for this drive)' : ''}
                </p>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by student name, enrollment, or department..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <Select value={panelId} onValueChange={setPanelId}>
                  <SelectTrigger className="w-full lg:w-56">
                    <SelectValue placeholder="Assign to panel" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Explicit wording: for an already-assigned student this CLEARS their panel. */}
                    <SelectItem value="none">No panel (remove from panel)</SelectItem>
                    {event.panels.map((panel) => (
                      <SelectItem key={panel.id} value={panel.id}>
                        {panel.panel_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {candidatesLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading students...
                </div>
              ) : applicationsError ? (
                <div className="py-8 text-sm text-destructive">
                  {getErrorMessage(applicationsError, 'Unable to load linked applicants.')}
                </div>
              ) : candidates.length === 0 ? (
                <div className="py-8 text-sm text-muted-foreground">
                  {deferredSearch.trim()
                    ? `No students match "${deferredSearch.trim()}".`
                    : 'No students found for this drive. Try searching by name or enrollment number.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12" />
                        <TableHead>Student</TableHead>
                        <TableHead>Enrollment</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Panel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map((candidate) => (
                        <TableRow key={candidate.studentId}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(candidate.studentId)}
                              onCheckedChange={() => toggleStudent(candidate.studentId)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            <span className="flex items-center gap-2">
                              {candidate.fullName}
                              {candidate.isAssigned ? (
                                <Badge variant="secondary" className="font-normal">Assigned</Badge>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell>{candidate.enrollmentNumber}</TableCell>
                          <TableCell>{candidate.department}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {candidate.assignedPanelId
                              ? panelNameById.get(candidate.assignedPanelId) ?? 'Unknown panel'
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <div className="flex w-full items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {selectedIds.size} student(s) selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssign} disabled={assignStudents.isPending || selectedIds.size === 0}>
                {assignStudents.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Students
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
