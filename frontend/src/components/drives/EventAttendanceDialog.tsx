import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, Loader2, Search, Users, XCircle } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEventDetail, useMarkAttendance } from '@/hooks/use-event-api';
import { attendanceStatusLabels, type AttendanceStatus } from '@/types/event';
import { toast } from 'sonner';

interface EventAttendanceDialogProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function EventAttendanceDialog({
  eventId,
  open,
  onOpenChange,
}: EventAttendanceDialogProps) {
  const detailQuery = useEventDetail(open && eventId ? eventId : '');
  const markAttendance = useMarkAttendance();
  const [searchTerm, setSearchTerm] = useState('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus | null>>({});

  useEffect(() => {
    if (!detailQuery.data) return;
    const initial: Record<string, AttendanceStatus | null> = {};
    detailQuery.data.assigned_students.forEach((assignment) => {
      initial[assignment.student_id] = assignment.attendance as AttendanceStatus | null;
    });
    setAttendance(initial);
  }, [detailQuery.data]);

  const filteredAssignments = useMemo(() => {
    const assignments = detailQuery.data?.assigned_students ?? [];
    if (!searchTerm) return assignments;

    const query = searchTerm.toLowerCase();
    return assignments.filter((assignment) => {
      const fields = [
        assignment.student.full_name,
        assignment.student.enrollment_number,
        assignment.student.department,
      ];
      return fields.some((field) => field.toLowerCase().includes(query));
    });
  }, [detailQuery.data, searchTerm]);

  const changedAssignments = useMemo(() => {
    const assignments = detailQuery.data?.assigned_students ?? [];
    return assignments.filter((assignment) => {
      return attendance[assignment.student_id] && attendance[assignment.student_id] !== assignment.attendance;
    });
  }, [attendance, detailQuery.data]);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setAttendance((current) => ({ ...current, [studentId]: status }));
  }

  function markVisibleAs(status: AttendanceStatus) {
    setAttendance((current) => {
      const next = { ...current };
      filteredAssignments.forEach((assignment) => {
        next[assignment.student_id] = status;
      });
      return next;
    });
  }

  async function handleSave() {
    if (!eventId || changedAssignments.length === 0) return;

    const results = await Promise.allSettled(
      changedAssignments.map((assignment) =>
        markAttendance.mutateAsync({
          eventId,
          data: {
            student_id: assignment.student_id,
            attendance: attendance[assignment.student_id] as AttendanceStatus,
          },
        })
      )
    );

    const succeeded = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - succeeded;

    if (succeeded > 0) {
      toast.success(`Attendance updated for ${succeeded} student(s).`);
    }
    if (failed > 0) {
      toast.error(`${failed} student(s) could not be updated.`);
    }
    if (failed === 0) {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !h-[90vh] !max-w-4xl !flex-col !overflow-hidden !p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Mark Attendance</DialogTitle>
          <DialogDescription>
            Update attendance for the live event assignments.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-6">
          {!eventId ? (
            <div className="py-8 text-sm text-muted-foreground">Select an event first.</div>
          ) : detailQuery.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading event attendance...
            </div>
          ) : detailQuery.error || !detailQuery.data ? (
            <div className="py-8 text-sm text-destructive">
              {getErrorMessage(detailQuery.error, 'Unable to load event attendance.')}
            </div>
          ) : detailQuery.data.assigned_students.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground">
              No students are assigned to this event yet.
            </div>
          ) : (
            <div className="space-y-4 py-6">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="font-medium text-foreground">{detailQuery.data.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detailQuery.data.assigned_students.length} assigned student(s)
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
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => markVisibleAs('present')}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Visible Present
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => markVisibleAs('absent')}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Mark Visible Absent
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => markVisibleAs('late')}>
                    <Clock className="mr-2 h-4 w-4" />
                    Mark Visible Late
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Enrollment</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead className="text-right">Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium text-foreground">
                          {assignment.student.full_name}
                        </TableCell>
                        <TableCell>{assignment.student.enrollment_number}</TableCell>
                        <TableCell>{assignment.student.department}</TableCell>
                        <TableCell>
                          {attendance[assignment.student_id] ? (
                            attendanceStatusLabels[attendance[assignment.student_id] as AttendanceStatus]
                          ) : (
                            <span className="text-sm text-muted-foreground">Not marked</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setStatus(assignment.student_id, 'present')}>
                              P
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setStatus(assignment.student_id, 'absent')}>
                              A
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setStatus(assignment.student_id, 'late')}>
                              L
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <div className="flex w-full items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {changedAssignments.length} changed student(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={markAttendance.isPending || changedAssignments.length === 0}>
                {markAttendance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Attendance
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
