import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  UserCheck,
  XCircle,
  Clock,
  Eye,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatCGPA, formatDate } from '@/lib/formatters';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import {
  useAdminStudents,
  useBulkVerifyAdminStudents,
  useVerifyAdminStudent,
} from '@/hooks/use-admin-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { useMasterValues } from '@/hooks/use-master-api';
import type { ApiAdminStudent } from '@/types/admin';

function getStudentPostingTypes(student: ApiAdminStudent): string[] {
  return Array.from(
    new Set(student.applications.map((application) => application.posting.type).filter(Boolean)),
  );
}

// Verification-stage students normally haven't applied yet, so derive the posting types
// from their registered interests (each already carries a human label). Fall back to
// application-derived types for the rare already-applied / re-verification case.
function getStudentPostingTypeChips(student: ApiAdminStudent): { key: string; label: string }[] {
  const interests = student.interests ?? [];
  if (interests.length > 0) {
    const seen = new Set<string>();
    const chips: { key: string; label: string }[] = [];
    for (const interest of interests) {
      const label = interest.label || formatPostingTypeLabel(interest.interest_type);
      if (seen.has(label)) continue;
      seen.add(label);
      chips.push({ key: interest.interest_type, label });
    }
    return chips;
  }
  return getStudentPostingTypes(student).map((type) => ({ key: type, label: formatPostingTypeLabel(type) }));
}

export default function VerificationTab() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<ApiAdminStudent | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');

  const {
    options: postingTypeOptions,
    isLoading: postingTypesLoading,
    isEmpty: postingTypesEmpty,
  } = usePostingTypeOptions();
  const academicYearOptions = useMasterValues('academic_year').data ?? [];

  const pendingParams = useMemo(() => ({
    verification_status: statusFilter,
    search: searchQuery || undefined,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    academic_year: academicYearFilter === 'all' ? undefined : academicYearFilter,
    page: 1,
    limit: 100,
    sort_by: 'updated_at' as const,
    sort_order: 'desc' as const,
  }), [statusFilter, searchQuery, postingTypeFilter, academicYearFilter]);

  // Actions available depend on the status of the list being viewed.
  const canVerifyList = statusFilter !== 'verified'; // pending + rejected can be (re)verified
  const canRejectList = statusFilter !== 'rejected';  // pending + verified can be rejected

  const pendingStudentsQuery = useAdminStudents(pendingParams);
  const pendingCountQuery = useAdminStudents({ verification_status: 'pending', page: 1, limit: 1 });
  const verifiedCountQuery = useAdminStudents({ verification_status: 'verified', page: 1, limit: 1 });
  const rejectedCountQuery = useAdminStudents({ verification_status: 'rejected', page: 1, limit: 1 });
  const verifyStudentMutation = useVerifyAdminStudent();
  const bulkVerifyMutation = useBulkVerifyAdminStudents();

  const pendingStudents = pendingStudentsQuery.data?.data ?? [];
  const pendingCount = pendingCountQuery.data?.pagination.total ?? 0;
  const verifiedCount = verifiedCountQuery.data?.pagination.total ?? 0;
  const rejectedCount = rejectedCountQuery.data?.pagination.total ?? 0;

  const visibleIds = pendingStudents.map((student) => student.student_id);
  const selectedVisibleIds = visibleIds.filter((id) => selectedIds.has(id));
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;

  const toggleSelected = (studentId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((current) => {
      if (visibleIds.every((id) => current.has(id))) {
        const next = new Set(current);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...current, ...visibleIds]);
    });
  };

  const handleVerifySelected = async () => {
    if (selectedVisibleIds.length === 0) {
      return;
    }

    try {
      const result = await bulkVerifyMutation.mutateAsync({ student_ids: selectedVisibleIds });
      setSelectedIds(new Set());
      toast({
        title: 'Verification Complete',
        description: result.message,
      });
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Unable to verify the selected students right now.',
        variant: 'destructive',
      });
    }
  };

  const handleVerify = async (studentId: string) => {
    try {
      await verifyStudentMutation.mutateAsync({
        studentId,
        data: { status: 'verified' },
      });
      setSelectedStudent(null);
      toast({
        title: 'Student Verified',
        description: 'Student profile has been verified successfully.',
      });
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Unable to verify the student right now.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedStudent || !rejectReason.trim()) {
      return;
    }

    try {
      await verifyStudentMutation.mutateAsync({
        studentId: selectedStudent.student_id,
        data: { status: 'rejected', remarks: rejectReason.trim() },
      });
      setSelectedStudent(null);
      setShowRejectDialog(false);
      setRejectReason('');
      toast({
        title: 'Student Rejected',
        description: 'Student has been notified about the rejection.',
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Rejection Failed',
        description: error instanceof Error ? error.message : 'Unable to reject the student right now.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkVerify = async () => {
    const pendingIds = pendingStudents.map((student) => student.student_id);
    if (pendingIds.length === 0) {
      return;
    }

    try {
      const result = await bulkVerifyMutation.mutateAsync({ student_ids: pendingIds });
      setSelectedIds(new Set());
      toast({
        title: 'Bulk Verification Complete',
        description: result.message,
      });
    } catch (error) {
      toast({
        title: 'Bulk Verification Failed',
        description: error instanceof Error ? error.message : 'Unable to verify these students right now.',
        variant: 'destructive',
      });
    }
  };

  const cardClass = (value: 'pending' | 'verified' | 'rejected') =>
    `cursor-pointer transition-all hover:shadow-md ${statusFilter === value ? 'ring-2 ring-primary' : ''}`;

  const statusLabel = statusFilter === 'pending' ? 'Pending' : statusFilter === 'verified' ? 'Verified' : 'Rejected';

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Card
          role="button"
          onClick={() => setStatusFilter('pending')}
          className={cardClass('pending')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card
          role="button"
          onClick={() => setStatusFilter('verified')}
          className={cardClass('verified')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{verifiedCount}</p>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card
          role="button"
          onClick={() => setStatusFilter('rejected')}
          className={cardClass('rejected')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rejectedCount}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={postingTypeFilter}
              onValueChange={setPostingTypeFilter}
              disabled={postingTypesLoading}
            >
              <SelectTrigger className="w-full md:w-52">
                <SelectValue placeholder="Posting Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posting Types</SelectItem>
                {postingTypesEmpty ? (
                  <SelectItem value="__empty__" disabled>
                    No posting types defined
                  </SelectItem>
                ) : (
                  postingTypeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Academic Years</SelectItem>
                {academicYearOptions.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canVerifyList && selectedVisibleIds.length > 0 && (
              <Button onClick={handleVerifySelected} disabled={bulkVerifyMutation.isPending}>
                <UserCheck className="mr-2 h-4 w-4" />
                Verify Selected ({selectedVisibleIds.length})
              </Button>
            )}
            {canVerifyList && pendingStudents.length > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkVerify}
                disabled={bulkVerifyMutation.isPending}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify All ({pendingStudents.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{statusLabel} Students</CardTitle>
          <CardDescription>
            {statusFilter === 'pending'
              ? 'Review student profiles before approving'
              : statusFilter === 'verified'
                ? 'Verified students — you can change a status if required'
                : 'Rejected students — re-verify if their profile is now valid'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingStudentsQuery.isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading students...</div>
          ) : pendingStudents.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
              <h3 className="mb-2 text-lg font-medium">Nothing here</h3>
              <p className="text-muted-foreground">No {statusFilter} students at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {canVerifyList && (
                <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAllVisible}
                    aria-label="Select all visible students"
                  />
                  Select all ({pendingStudents.length})
                </label>
              )}
              {pendingStudents.map((student) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/30"
                >
                  {canVerifyList && (
                    <Checkbox
                      checked={selectedIds.has(student.student_id)}
                      onCheckedChange={() => toggleSelected(student.student_id)}
                      aria-label={`Select ${student.full_name}`}
                    />
                  )}
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h4 className="font-medium">{student.full_name}</h4>
                      <Badge variant="outline">{student.roll_number}</Badge>
                      {student.profile_completion_percentage < 70 && (
                        <Badge variant="outline" className="border-yellow-500/20 bg-yellow-500/10 text-yellow-600">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Incomplete Profile
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{student.department}</span>
                      <span>•</span>
                      <span>CGPA: {formatCGPA(student.academicProfile.cgpa)}</span>
                      <span>•</span>
                      <span>10th: {student.academicProfile.tenth_percentage || 0}%</span>
                      <span>•</span>
                      <span>12th: {student.academicProfile.twelfth_percentage || 0}%</span>
                      <span>•</span>
                      <span>Backlogs: {student.academicProfile.backlog_count}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Posting types:</span>
                      {getStudentPostingTypeChips(student).length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        getStudentPostingTypeChips(student).map((chip) => (
                          <Badge key={chip.key} variant="secondary">{chip.label}</Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedStudent(student)}>
                      <Eye className="mr-1 h-4 w-4" /> Review
                    </Button>
                    {canVerifyList && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleVerify(student.student_id)}
                        disabled={verifyStudentMutation.isPending}
                      >
                        <UserCheck className="mr-1 h-4 w-4" /> Verify
                      </Button>
                    )}
                    {canRejectList && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowRejectDialog(true);
                        }}
                        disabled={verifyStudentMutation.isPending}
                      >
                        <XCircle className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedStudent) && !showRejectDialog} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Student Profile</DialogTitle>
            <DialogDescription>Verify all details before approving</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedStudent.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Roll Number</p>
                  <p className="font-medium">{selectedStudent.roll_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedStudent.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                  <p className="font-medium">{selectedStudent.mobile || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedStudent.department}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Batch</p>
                  <p className="font-medium">{selectedStudent.batch_year}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="mb-3 font-medium">Academic Details</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-bold">{formatCGPA(selectedStudent.academicProfile.cgpa)}</p>
                    <p className="text-xs text-muted-foreground">CGPA</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-bold">{selectedStudent.academicProfile.tenth_percentage || 0}%</p>
                    <p className="text-xs text-muted-foreground">10th</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-bold">{selectedStudent.academicProfile.twelfth_percentage || 0}%</p>
                    <p className="text-xs text-muted-foreground">12th</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-bold">{selectedStudent.academicProfile.backlog_count}</p>
                    <p className="text-xs text-muted-foreground">Backlogs</p>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="mb-3 font-medium">Posting Types / Interests</h4>
                {(selectedStudent.interests ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <div className="space-y-2">
                    {(selectedStudent.interests ?? []).map((interest) => (
                      <div
                        key={interest.interest_type}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <Badge variant="secondary">
                          {interest.label || formatPostingTypeLabel(interest.interest_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Registered {formatDate(interest.registered_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedStudent(null)}>
              Cancel
            </Button>
            {selectedStudent?.verificationStatus !== 'rejected' && (
              <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                Reject
              </Button>
            )}
            {selectedStudent?.verificationStatus !== 'verified' && (
              <Button
                onClick={() => selectedStudent && handleVerify(selectedStudent.student_id)}
                disabled={verifyStudentMutation.isPending}
              >
                <UserCheck className="mr-2 h-4 w-4" /> Verify Student
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showRejectDialog}
        onOpenChange={(open) => {
          setShowRejectDialog(open);
          if (!open) {
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Student</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. The student will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter reason for rejection..."
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || verifyStudentMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
