import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { UserPlus, Clock, Trash2, Plus, Search, Filter, Download, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { PlacementEvent, EventPanel, StudentSlot } from '@/types/event';
import { fullStudentPool, getEligibleStudentsForOpportunity } from '@/services/studentService';
import type { StudentPoolEntry } from '@/services/studentService';
import { mockPostings } from '@/services/postingService';
import { departments } from '@/services/studentService';
import { toast } from 'sonner';
import { formatCGPA } from '@/lib/formatters';

const PAGE_SIZE = 25;

interface SlotAllocationDialogProps {
  event: PlacementEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedEvent: PlacementEvent) => void;
}

export function SlotAllocationDialog({ event, open, onOpenChange, onSave }: SlotAllocationDialogProps) {
  const [assignedStudents, setAssignedStudents] = useState<StudentSlot[]>(event.assignedStudents);
  const [panels, setPanels] = useState<EventPanel[]>(event.panels);
  const [activeTab, setActiveTab] = useState('add');

  // Filters for student pool
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [minCgpa, setMinCgpa] = useState('');
  const [maxBacklogs, setMaxBacklogs] = useState('');
  const [readyOnly, setReadyOnly] = useState(true);
  const [page, setPage] = useState(1);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllFiltered, setSelectAllFiltered] = useState(false);

  // New panel form
  const [newPanel, setNewPanel] = useState({ panelName: '', room: '', recruiters: '', startTime: '', endTime: '' });

  // Pending removals (confirmation)
  const [studentPendingRemoval, setStudentPendingRemoval] = useState<{ id: string; name: string } | null>(null);
  const [panelPendingRemoval, setPanelPendingRemoval] = useState<{ id: string; name: string; assignedCount: number } | null>(null);

  const assignedIds = useMemo(() => new Set(assignedStudents.map(s => s.studentId)), [assignedStudents]);

  // Filter student pool
  const filteredPool = useMemo(() => {
    return fullStudentPool.filter(s => {
      if (assignedIds.has(s.studentId)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!s.studentName.toLowerCase().includes(q) && !s.rollNumber.toLowerCase().includes(q)) return false;
      }
      if (branchFilter !== 'all' && s.branch !== branchFilter) return false;
      if (batchFilter !== 'all' && s.batchYear !== batchFilter) return false;
      if (minCgpa && s.cgpa < parseFloat(minCgpa)) return false;
      if (maxBacklogs && s.backlogs > parseInt(maxBacklogs)) return false;
      if (readyOnly && (s.profileCompletion < 80 || !s.policyAccepted || !s.verified)) return false;
      return true;
    });
  }, [searchQuery, branchFilter, batchFilter, minCgpa, maxBacklogs, readyOnly, assignedIds]);

  const totalPages = Math.ceil(filteredPool.length / PAGE_SIZE);
  const pagedStudents = filteredPool.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Linked opportunity
  const linkedPosting = event.opportunityId ? mockPostings.find(p => p.id === event.opportunityId) : null;

  const handleToggleStudent = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
    setSelectAllFiltered(false);
  };

  const handleSelectAllFiltered = (checked: boolean) => {
    setSelectAllFiltered(!!checked);
    if (checked) {
      setSelectedIds(new Set(filteredPool.map(s => s.studentId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectPage = (checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      pagedStudents.forEach(s => {
        if (checked) next.add(s.studentId); else next.delete(s.studentId);
      });
      return next;
    });
  };

  const handleAddSelected = () => {
    const toAdd = fullStudentPool.filter(s => selectedIds.has(s.studentId) && !assignedIds.has(s.studentId));
    const newSlots: StudentSlot[] = toAdd.map(s => ({
      studentId: s.studentId,
      studentName: s.studentName,
      rollNumber: s.rollNumber,
      branch: s.branch,
    }));
    setAssignedStudents(prev => [...prev, ...newSlots]);
    setSelectedIds(new Set());
    setSelectAllFiltered(false);
    toast.success(`${toAdd.length} student(s) added to this drive`);
  };

  const handleAutoImport = () => {
    if (!linkedPosting) return;
    const { eligibility } = linkedPosting;
    const eligible = getEligibleStudentsForOpportunity(
      eligibility.branches,
      eligibility.batches,
      eligibility.minCgpa,
      eligibility.maxBacklogs
    ).filter(s => !assignedIds.has(s.studentId));

    const newSlots: StudentSlot[] = eligible.map(s => ({
      studentId: s.studentId,
      studentName: s.studentName,
      rollNumber: s.rollNumber,
      branch: s.branch,
    }));
    setAssignedStudents(prev => [...prev, ...newSlots]);
    toast.success(`${eligible.length} eligible students imported from "${linkedPosting.title}"`);
  };

  const handleRemoveStudent = (studentId: string) => {
    setAssignedStudents(prev => prev.filter(s => s.studentId !== studentId));
  };

  const performRemoveStudent = (studentId: string) => {
    handleRemoveStudent(studentId);
    setStudentPendingRemoval(null);
  };

  const handleUpdateSlot = (studentId: string, field: 'slotTime' | 'panelId', value: string) => {
    setAssignedStudents(prev => prev.map(s =>
      s.studentId === studentId ? { ...s, [field]: value || undefined } : s
    ));
  };

  const handleAddPanel = () => {
    if (!newPanel.panelName || !newPanel.room) {
      toast.error('Panel name and room are required');
      return;
    }
    const panel: EventPanel = {
      id: `panel-${Date.now()}`,
      panelName: newPanel.panelName,
      room: newPanel.room,
      recruiters: newPanel.recruiters.split(',').map(r => r.trim()).filter(Boolean),
      startTime: newPanel.startTime,
      endTime: newPanel.endTime,
    };
    setPanels(prev => [...prev, panel]);
    setNewPanel({ panelName: '', room: '', recruiters: '', startTime: '', endTime: '' });
    toast.success('Panel added');
  };

  const handleRemovePanel = (panelId: string) => {
    setPanels(prev => prev.filter(p => p.id !== panelId));
    setAssignedStudents(prev => prev.map(s =>
      s.panelId === panelId ? { ...s, panelId: undefined } : s
    ));
  };

  const performRemovePanel = (panelId: string) => {
    handleRemovePanel(panelId);
    setPanelPendingRemoval(null);
  };

  const handleSave = () => {
    const updatedEvent: PlacementEvent = {
      ...event,
      panels,
      assignedStudents,
      updatedAt: new Date().toISOString(),
    };
    onSave(updatedEvent);
    toast.success(`Allocation saved. ${assignedStudents.length} students will be notified and see this event in their Drives section.`);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setBranchFilter('all');
    setBatchFilter('all');
    setMinCgpa('');
    setMaxBacklogs('');
    setReadyOnly(true);
    setPage(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Student Allocation
          </DialogTitle>
          <DialogDescription>
            {event.title} • {event.companyName} • <span className="font-medium text-foreground">{assignedStudents.length} students assigned</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="add">Add Students</TabsTrigger>
                <TabsTrigger value="slots">Slots & Panels ({assignedStudents.length})</TabsTrigger>
                <TabsTrigger value="panels">Manage Panels ({panels.length})</TabsTrigger>
              </TabsList>

            {/* Tab 1: Bulk Add Students */}
            <TabsContent value="add" className="space-y-4">
              {/* Auto-import button */}
              {linkedPosting && (
                <Card className="mb-4 border-primary/30 bg-primary/5 shrink-0">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Quick Import from Linked Opportunity</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Auto-add all eligible students matching "{linkedPosting.title}" criteria
                        (CGPA ≥ {linkedPosting.eligibility.minCgpa}, {linkedPosting.eligibility.branches.join(', ')})
                      </p>
                    </div>
                    <Button size="sm" onClick={handleAutoImport}>
                      <Download className="h-4 w-4 mr-1" /> Import Eligible
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Filter bar */}
              <div className="space-y-3 shrink-0 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or roll number..."
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                      className="pl-9 h-9"
                    />
                  </div>
                  <Select value={branchFilter} onValueChange={v => { setBranchFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Branch" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={batchFilter} onValueChange={v => { setBatchFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Batch" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      {['2021-2025', '2022-2026', '2023-2027', '2024-2028'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Min CGPA</Label>
                    <Input type="number" step="0.1" min="0" max="10" value={minCgpa} onChange={e => { setMinCgpa(e.target.value); setPage(1); }} className="w-[80px] h-8" placeholder="e.g. 7.0" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Max Backlogs</Label>
                    <Input type="number" min="0" value={maxBacklogs} onChange={e => { setMaxBacklogs(e.target.value); setPage(1); }} className="w-[70px] h-8" placeholder="0" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="readyOnly" checked={readyOnly} onCheckedChange={v => { setReadyOnly(!!v); setPage(1); }} />
                    <Label htmlFor="readyOnly" className="text-xs cursor-pointer">Placement-ready only (80%+ profile, policy accepted, verified)</Label>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>Reset Filters</Button>
                </div>
              </div>

              {/* Results header */}
              <div className="flex items-center justify-between shrink-0 mb-2">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{filteredPool.length}</span> students match filters
                  </p>
                  {selectedIds.size > 0 && (
                    <Badge variant="secondary" className="text-xs">{selectedIds.size} selected</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {filteredPool.length > 0 && !selectAllFiltered && selectedIds.size > 0 && selectedIds.size < filteredPool.length && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleSelectAllFiltered(true)}>
                      Select all {filteredPool.length} matching students
                    </Button>
                  )}
                  {selectAllFiltered && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleSelectAllFiltered(false)}>
                      Clear selection
                    </Button>
                  )}
                  <Button size="sm" disabled={selectedIds.size === 0} onClick={handleAddSelected}>
                    <Plus className="h-4 w-4 mr-1" /> Add {selectedIds.size} Student{selectedIds.size !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={pagedStudents.length > 0 && pagedStudents.every(s => selectedIds.has(s.studentId))}
                          onCheckedChange={handleSelectPage}
                        />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>CGPA</TableHead>
                      <TableHead>Backlogs</TableHead>
                      <TableHead>Profile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No students match current filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedStudents.map(s => (
                        <TableRow key={s.studentId} className={selectedIds.has(s.studentId) ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(s.studentId)}
                              onCheckedChange={checked => handleToggleStudent(s.studentId, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{s.studentName}</TableCell>
                          <TableCell className="text-xs">{s.rollNumber}</TableCell>
                          <TableCell className="text-xs">{s.branch}</TableCell>
                          <TableCell className="text-xs">{s.batchYear}</TableCell>
                          <TableCell>{formatCGPA(s.cgpa)}</TableCell>
                          <TableCell>
                            {s.backlogs > 0 ? (
                              <Badge variant="destructive" className="text-xs">{s.backlogs}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-xs">{s.profileCompletion}%</span>
                              {(!s.policyAccepted || !s.verified) && (
                                <AlertCircle className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 shrink-0">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} ({filteredPool.length} students)
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Assign Slots & Panels */}
            <TabsContent value="slots" className="space-y-4">
              <p className="text-sm text-muted-foreground mb-3 shrink-0">Assign time slots and panels to each student.</p>
              {assignedStudents.length === 0 ? (
                <Card className="flex-1"><CardContent className="py-12 text-center text-muted-foreground">No students assigned. Go to "Add Students" tab first.</CardContent></Card>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Time Slot</TableHead>
                        <TableHead>Panel</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedStudents.map(student => (
                        <TableRow key={student.studentId}>
                          <TableCell className="font-medium">{student.studentName}</TableCell>
                          <TableCell className="text-xs">{student.rollNumber}</TableCell>
                          <TableCell className="text-xs">{student.branch}</TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              className="w-[120px] h-8"
                              value={student.slotTime || ''}
                              onChange={e => handleUpdateSlot(student.studentId, 'slotTime', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            {panels.length > 0 ? (
                              <Select
                                value={student.panelId || 'none'}
                                onValueChange={v => handleUpdateSlot(student.studentId, 'panelId', v === 'none' ? '' : v)}
                              >
                                <SelectTrigger className="w-[160px] h-8">
                                  <SelectValue placeholder="Select panel" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No panel</SelectItem>
                                  {panels.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.panelName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">No panels created</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setStudentPendingRemoval({ id: student.studentId, name: student.studentName })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Manage Panels */}
            <TabsContent value="panels" className="space-y-4">
              <p className="text-sm text-muted-foreground mb-3">Create interview panels with room and recruiter details.</p>

              {panels.length > 0 && (
                <div className="space-y-3 mb-4">
                  {panels.map(panel => (
                    <Card key={panel.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{panel.panelName}</p>
                          <p className="text-sm text-muted-foreground">
                            {panel.room} • {panel.startTime} – {panel.endTime}
                            {panel.recruiters.length > 0 && ` • ${panel.recruiters.join(', ')}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {assignedStudents.filter(s => s.panelId === panel.id).length} student(s) assigned
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setPanelPendingRemoval({
                              id: panel.id,
                              name: panel.panelName,
                              assignedCount: assignedStudents.filter(s => s.panelId === panel.id).length,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Separator className="my-4" />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Add New Panel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Panel Name *</Label>
                      <Input value={newPanel.panelName} onChange={e => setNewPanel(p => ({ ...p, panelName: e.target.value }))} placeholder="e.g., Panel A - Technical" className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Room *</Label>
                      <Input value={newPanel.room} onChange={e => setNewPanel(p => ({ ...p, room: e.target.value }))} placeholder="e.g., Room 101, Block A" className="h-8" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Recruiters (comma-separated)</Label>
                      <Input value={newPanel.recruiters} onChange={e => setNewPanel(p => ({ ...p, recruiters: e.target.value }))} placeholder="e.g., Priya, Rahul" className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Start Time</Label>
                      <Input type="time" value={newPanel.startTime} onChange={e => setNewPanel(p => ({ ...p, startTime: e.target.value }))} className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End Time</Label>
                      <Input type="time" value={newPanel.endTime} onChange={e => setNewPanel(p => ({ ...p, endTime: e.target.value }))} className="h-8" />
                    </div>
                  </div>
                  <Button size="sm" onClick={handleAddPanel}>
                    <Plus className="h-4 w-4 mr-1" /> Add Panel
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t shrink-0">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {assignedStudents.length} students will be notified when this event is published
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Allocation</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>

      <ConfirmActionDialog
        open={Boolean(studentPendingRemoval)}
        onOpenChange={(open) => {
          if (!open) setStudentPendingRemoval(null);
        }}
        title={studentPendingRemoval ? `Remove ${studentPendingRemoval.name}?` : 'Remove student?'}
        description="This will unassign the student from this event. They will need to be added back manually."
        confirmLabel="Remove"
        confirmVariant="destructive"
        onConfirm={() => {
          if (studentPendingRemoval) performRemoveStudent(studentPendingRemoval.id);
        }}
      />

      <ConfirmActionDialog
        open={Boolean(panelPendingRemoval)}
        onOpenChange={(open) => {
          if (!open) setPanelPendingRemoval(null);
        }}
        title={panelPendingRemoval ? `Remove panel "${panelPendingRemoval.name}"?` : 'Remove panel?'}
        description={
          panelPendingRemoval && panelPendingRemoval.assignedCount > 0
            ? `${panelPendingRemoval.assignedCount} student${panelPendingRemoval.assignedCount === 1 ? '' : 's'} currently assigned to this panel will be unassigned (they stay on the event, just without a panel).`
            : 'This panel will be removed from the event.'
        }
        confirmLabel="Remove panel"
        confirmVariant="destructive"
        onConfirm={() => {
          if (panelPendingRemoval) performRemovePanel(panelPendingRemoval.id);
        }}
      />
    </Dialog>
  );
}
