import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, Search, Users, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { PlacementEvent, StudentSlot, AttendanceStatus, attendanceStatusLabels } from '@/types/event';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BulkAttendanceDialogProps {
  event: PlacementEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedEvent: PlacementEvent) => void;
  markedBy?: string;
}

type LocalAttendance = Record<string, AttendanceStatus>;

const statusConfig: Record<AttendanceStatus, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
  present: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' },
  absent: { icon: XCircle, color: 'text-destructive', bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' },
  late: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800' },
  excused: { icon: AlertTriangle, color: 'text-muted-foreground', bgColor: 'bg-muted border-border' },
};

export function BulkAttendanceDialog({ event, open, onOpenChange, onSave, markedBy = 'Dr. Priya Mehta' }: BulkAttendanceDialogProps) {
  // Initialize from existing attendance data
  const [attendance, setAttendance] = useState<LocalAttendance>(() => {
    const init: LocalAttendance = {};
    event.assignedStudents.forEach(s => {
      if (s.attendance) init[s.studentId] = s.attendance;
    });
    return init;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [panelFilter, setPanelFilter] = useState('all');
  const [showOnly, setShowOnly] = useState<'all' | AttendanceStatus | 'unmarked'>('all');
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  const branches = useMemo(() => [...new Set(event.assignedStudents.map(s => s.branch))].sort(), [event]);
  const panels = useMemo(() => event.panels.map(p => ({ id: p.id, name: p.panelName })), [event]);

  // Counts
  const counts = useMemo(() => {
    const total = event.assignedStudents.length;
    const present = Object.values(attendance).filter(a => a === 'present').length;
    const absent = Object.values(attendance).filter(a => a === 'absent').length;
    const late = Object.values(attendance).filter(a => a === 'late').length;
    const unmarked = total - Object.keys(attendance).length;
    return { total, present, absent, late, unmarked };
  }, [attendance, event.assignedStudents.length]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return event.assignedStudents.filter(s => {
      const matchesSearch = !searchQuery ||
        s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = branchFilter === 'all' || s.branch === branchFilter;
      const matchesPanel = panelFilter === 'all' || s.panelId === panelFilter;
      const matchesShow = showOnly === 'all' ||
        (showOnly === 'unmarked' ? !attendance[s.studentId] : attendance[s.studentId] === showOnly);
      return matchesSearch && matchesBranch && matchesPanel && matchesShow;
    });
  }, [event.assignedStudents, searchQuery, branchFilter, panelFilter, showOnly, attendance]);

  const markAllPresent = () => {
    const updated: LocalAttendance = { ...attendance };
    event.assignedStudents.forEach(s => {
      updated[s.studentId] = 'present';
    });
    setAttendance(updated);
    toast.success(`All ${event.assignedStudents.length} students marked as Present`);
  };

  const markFilteredAs = (status: AttendanceStatus) => {
    const updated: LocalAttendance = { ...attendance };
    filteredStudents.forEach(s => {
      updated[s.studentId] = status;
    });
    setAttendance(updated);
    toast.success(`${filteredStudents.length} students marked as ${attendanceStatusLabels[status]}`);
  };

  const toggleStudent = (studentId: string) => {
    setAttendance(prev => {
      const current = prev[studentId];
      // Cycle: unmarked → present → absent → late → present
      const next: AttendanceStatus = !current ? 'present' : current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
      return { ...prev, [studentId]: next };
    });
  };

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = () => {
    if (counts.unmarked > 0) {
      setConfirmSaveOpen(true);
      return;
    }

    commitSave();
  };

  const commitSave = () => {
    const now = new Date().toISOString();
    const updatedEvent: PlacementEvent = {
      ...event,
      assignedStudents: event.assignedStudents.map(s => ({
        ...s,
        attendance: attendance[s.studentId] || s.attendance,
        attendanceMarkedAt: attendance[s.studentId] ? now : s.attendanceMarkedAt,
        attendanceMarkedBy: attendance[s.studentId] ? markedBy : s.attendanceMarkedBy,
      })),
      updatedAt: now,
    };
    onSave(updatedEvent);
    toast.success('Attendance saved successfully');
  };

  const hasChanges = useMemo(() => {
    return event.assignedStudents.some(s => {
      const newVal = attendance[s.studentId];
      return newVal && newVal !== s.attendance;
    });
  }, [attendance, event.assignedStudents]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>Mark Attendance</DialogTitle>
          <DialogDescription>{event.title} • {event.companyName}</DialogDescription>
        </DialogHeader>

        {/* Live Counters */}
        <div className="px-6 pt-4 shrink-0">
          <div className="grid grid-cols-5 gap-2">
            <button
              onClick={() => setShowOnly('all')}
              className={cn("flex flex-col items-center p-2 rounded-lg border text-center transition-colors cursor-pointer",
                showOnly === 'all' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50')}
            >
              <Users className="h-4 w-4 mb-1 text-muted-foreground" />
              <span className="text-lg font-bold">{counts.total}</span>
              <span className="text-[10px] text-muted-foreground">Total</span>
            </button>
            <button
              onClick={() => setShowOnly('present')}
              className={cn("flex flex-col items-center p-2 rounded-lg border text-center transition-colors cursor-pointer",
                showOnly === 'present' ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-border hover:bg-muted/50')}
            >
              <UserCheck className="h-4 w-4 mb-1 text-green-600" />
              <span className="text-lg font-bold text-green-600">{counts.present}</span>
              <span className="text-[10px] text-muted-foreground">Present</span>
            </button>
            <button
              onClick={() => setShowOnly('absent')}
              className={cn("flex flex-col items-center p-2 rounded-lg border text-center transition-colors cursor-pointer",
                showOnly === 'absent' ? 'border-destructive bg-red-50 dark:bg-red-950/30' : 'border-border hover:bg-muted/50')}
            >
              <UserX className="h-4 w-4 mb-1 text-destructive" />
              <span className="text-lg font-bold text-destructive">{counts.absent}</span>
              <span className="text-[10px] text-muted-foreground">Absent</span>
            </button>
            <button
              onClick={() => setShowOnly('late')}
              className={cn("flex flex-col items-center p-2 rounded-lg border text-center transition-colors cursor-pointer",
                showOnly === 'late' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30' : 'border-border hover:bg-muted/50')}
            >
              <Clock className="h-4 w-4 mb-1 text-yellow-600" />
              <span className="text-lg font-bold text-yellow-600">{counts.late}</span>
              <span className="text-[10px] text-muted-foreground">Late</span>
            </button>
            <button
              onClick={() => setShowOnly('unmarked')}
              className={cn("flex flex-col items-center p-2 rounded-lg border text-center transition-colors cursor-pointer",
                showOnly === 'unmarked' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50')}
            >
              <AlertTriangle className="h-4 w-4 mb-1 text-muted-foreground" />
              <span className="text-lg font-bold">{counts.unmarked}</span>
              <span className="text-[10px] text-muted-foreground">Pending</span>
            </button>
          </div>

          {/* Bulk Action */}
          <div className="flex items-center gap-2 mt-4">
            <Button onClick={markAllPresent} variant="default" size="sm" className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" /> Mark All Present
            </Button>
            {filteredStudents.length < event.assignedStudents.length && filteredStudents.length > 0 && (
              <Button onClick={() => markFilteredAs('present')} variant="outline" size="sm" className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Mark Filtered ({filteredStudents.length}) Present
              </Button>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search name or roll no..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            {branches.length > 1 && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {panels.length > 0 && (
              <Select value={panelFilter} onValueChange={setPanelFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Panel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Panels</SelectItem>
                  {panels.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator className="mt-4" />
        </div>

        {/* Student List — click to cycle status */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-2 space-y-1">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No students match filters</p>
            ) : (
              filteredStudents.map(student => {
                const status = attendance[student.studentId];
                const config = status ? statusConfig[status] : null;
                const Icon = config?.icon;

                return (
                  <div
                    key={student.studentId}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm select-none",
                      config ? config.bgColor : 'border-border bg-background hover:bg-muted/50'
                    )}
                    onClick={() => toggleStudent(student.studentId)}
                  >
                    {/* Status icon */}
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      config ? config.bgColor : 'bg-muted')}>
                      {Icon ? <Icon className={cn("h-4 w-4", config?.color)} /> :
                        <span className="text-xs text-muted-foreground font-medium">?</span>}
                    </div>

                    {/* Student info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{student.studentName}</span>
                        <span className="text-xs text-muted-foreground">{student.rollNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{student.branch}</span>
                        {student.slotTime && <span>• {student.slotTime}</span>}
                        {student.panelId && (
                          <span>• {event.panels.find(p => p.id === student.panelId)?.panelName}</span>
                        )}
                      </div>
                    </div>

                    {/* Quick status buttons */}
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setStudentStatus(student.studentId, 'present')}
                        className={cn("h-7 w-7 rounded-md flex items-center justify-center text-xs font-medium border transition-colors",
                          status === 'present' ? 'bg-green-600 text-white border-green-600' : 'border-border hover:bg-green-50 dark:hover:bg-green-950/30')}
                        title="Present"
                      >P</button>
                      <button
                        onClick={() => setStudentStatus(student.studentId, 'absent')}
                        className={cn("h-7 w-7 rounded-md flex items-center justify-center text-xs font-medium border transition-colors",
                          status === 'absent' ? 'bg-red-600 text-white border-red-600' : 'border-border hover:bg-red-50 dark:hover:bg-red-950/30')}
                        title="Absent"
                      >A</button>
                      <button
                        onClick={() => setStudentStatus(student.studentId, 'late')}
                        className={cn("h-7 w-7 rounded-md flex items-center justify-center text-xs font-medium border transition-colors",
                          status === 'late' ? 'bg-yellow-600 text-white border-yellow-600' : 'border-border hover:bg-yellow-50 dark:hover:bg-yellow-950/30')}
                        title="Late"
                      >L</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t shrink-0">
          <div className="flex items-center justify-between w-full gap-2">
            <p className="text-xs text-muted-foreground">
              Tap a row to cycle status • Use P/A/L buttons for direct set
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!hasChanges && counts.unmarked === event.assignedStudents.length}>
                Save Attendance
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>

      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title="Save attendance with unmarked students?"
        description={`${counts.unmarked} student(s) are still unmarked. Save anyway?`}
        confirmLabel="Save Anyway"
        confirmVariant="destructive"
        onConfirm={() => {
          setConfirmSaveOpen(false);
          commitSave();
        }}
      />
    </Dialog>
  );
}
