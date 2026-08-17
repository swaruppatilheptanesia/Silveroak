import { Building2, Calendar, Clock, FileText, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEventDetail, useMyEventDetail } from '@/hooks/use-event-api';
import { EVENT_STATUS_CONFIG } from '@/lib/eventModule';
import { attendanceStatusLabels, getEventTypeLabel } from '@/types/event';

interface EventDetailDialogProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * `'admin'` hits the matrix-gated `/events/:id` endpoint (TPO/faculty/recruiter).
   * `'my'` hits `/events/my/:id` which is student-scoped and skips the matrix.
   */
  mode?: 'admin' | 'my';
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function EventDetailDialog({ eventId, open, onOpenChange, mode = 'admin' }: EventDetailDialogProps) {
  const adminDetailQuery = useEventDetail(mode === 'admin' && open && eventId ? eventId : '');
  const myDetailQuery = useMyEventDetail(mode === 'my' && open && eventId ? eventId : '');
  const detailQuery = mode === 'my' ? myDetailQuery : adminDetailQuery;

  const event = detailQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !h-[90vh] !max-w-4xl !flex-col !overflow-hidden !p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Event Detail</DialogTitle>
          <DialogDescription>
            Review the live event schedule, panels, and assigned students.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-6">
          {!eventId ? (
            <div className="py-8 text-sm text-muted-foreground">Select an event to view its detail.</div>
          ) : detailQuery.isLoading ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-6 w-48 bg-muted" />
              <Skeleton className="h-24 w-full bg-muted" />
              <Skeleton className="h-40 w-full bg-muted" />
            </div>
          ) : detailQuery.error || !event ? (
            <div className="py-8 text-sm text-destructive">
              {getErrorMessage(detailQuery.error, 'Unable to load the event detail.')}
            </div>
          ) : (
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{getEventTypeLabel(event.type)}</Badge>
                  <Badge variant="outline" className={EVENT_STATUS_CONFIG[event.status].color}>
                    {EVENT_STATUS_CONFIG[event.status].label}
                  </Badge>
                </div>
                <h2 className="text-xl font-semibold text-foreground">{event.title}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {event.company.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(event.date), 'dd MMM yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {event.start_time} - {event.end_time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {event.venue}
                  </span>
                </div>
              </div>

              {(() => {
                const roles = event.postings?.length
                  ? event.postings
                  : event.posting
                    ? [event.posting]
                    : [];
                if (roles.length === 0) return null;
                return (
                  <div className="rounded-lg border border-border p-4">
                    <h3 className="text-sm font-medium text-foreground">Linked Roles</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <Badge key={role.id} variant="secondary">
                          {role.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Reporting Time</p>
                  <p className="mt-1 font-medium text-foreground">{event.reporting_time || '—'}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Dress Code</p>
                  <p className="mt-1 font-medium text-foreground">{event.dress_code || '—'}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileText className="h-4 w-4" />
                  Instructions
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {event.instructions || 'No instructions were provided for this event.'}
                </p>
              </div>

              {(event.documents_required.length > 0 || event.faculty_coordinators.length > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border p-4">
                    <h3 className="text-sm font-medium text-foreground">Documents Required</h3>
                    {event.documents_required.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">No documents specified.</p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {event.documents_required.map((document) => (
                          <Badge key={document} variant="secondary">
                            {document}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <h3 className="text-sm font-medium text-foreground">Faculty Coordinators</h3>
                    {event.faculty_coordinators.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">No faculty coordinators listed.</p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {event.faculty_coordinators.map((faculty) => (
                          <Badge key={faculty} variant="outline">
                            {faculty}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Panels</h3>
                  <Badge variant="secondary">{event.panels.length}</Badge>
                </div>
                {event.panels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No panels have been created for this event yet.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {event.panels.map((panel) => (
                      <div key={panel.id} className="rounded-lg border border-border p-4">
                        <p className="font-medium text-foreground">{panel.panel_name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {panel.room}
                          {panel.start_time && panel.end_time ? ` • ${panel.start_time} - ${panel.end_time}` : ''}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {panel.recruiters.length === 0 ? (
                            <Badge variant="secondary">No recruiters listed</Badge>
                          ) : (
                            panel.recruiters.map((recruiter) => (
                              <Badge key={recruiter} variant="outline">
                                {recruiter}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Users className="h-4 w-4" />
                    Assigned Students
                  </h3>
                  <Badge variant="secondary">{event.assigned_students.length}</Badge>
                </div>
                {event.assigned_students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students are assigned to this event yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Enrollment</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Panel / Slot</TableHead>
                          <TableHead>Attendance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {event.assigned_students.map((assignment) => {
                          const panel = assignment.panel_id
                            ? event.panels.find((item) => item.id === assignment.panel_id)
                            : null;

                          return (
                            <TableRow key={assignment.id}>
                              <TableCell className="font-medium text-foreground">
                                {assignment.student.full_name}
                              </TableCell>
                              <TableCell>{assignment.student.enrollment_number}</TableCell>
                              <TableCell>{assignment.student.department}</TableCell>
                              <TableCell>
                                {panel?.panel_name || 'Unassigned'}
                                {assignment.slot_time ? ` • ${assignment.slot_time}` : ''}
                              </TableCell>
                              <TableCell>
                                {assignment.attendance ? (
                                  <Badge variant="outline">
                                    {attendanceStatusLabels[assignment.attendance as keyof typeof attendanceStatusLabels]}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Not marked</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
