import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
  AlertTriangle
} from 'lucide-react';
import { mockAllStudents } from '@/services/studentService';
import { useToast } from '@/hooks/use-toast';
import { formatCGPA } from '@/lib/formatters';

type VerificationStatus = 'pending' | 'verified' | 'rejected';

export default function StudentVerification() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState(mockAllStudents);
  const [selectedStudent, setSelectedStudent] = useState<typeof mockAllStudents[0] | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const pendingStudents = students.filter(s => 
    s.verificationStatus === 'pending' &&
    (s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleVerify = (studentId: string) => {
    setStudents(prev => prev.map(s => 
      s.student_id === studentId ? { ...s, verificationStatus: 'verified' as VerificationStatus } : s
    ));
    setSelectedStudent(null);
    toast({
      title: "Student Verified",
      description: "Student profile has been verified successfully.",
    });
  };

  const handleReject = () => {
    if (!selectedStudent || !rejectReason.trim()) return;
    
    setStudents(prev => prev.map(s => 
      s.student_id === selectedStudent.student_id ? { ...s, verificationStatus: 'rejected' as VerificationStatus } : s
    ));
    setSelectedStudent(null);
    setShowRejectDialog(false);
    setRejectReason('');
    toast({
      title: "Student Rejected",
      description: "Student has been notified about the rejection.",
      variant: "destructive",
    });
  };

  const handleBulkVerify = () => {
    const pendingIds = pendingStudents.map(s => s.student_id);
    setStudents(prev => prev.map(s => 
      pendingIds.includes(s.student_id) ? { ...s, verificationStatus: 'verified' as VerificationStatus } : s
    ));
    toast({
      title: "Bulk Verification Complete",
      description: `${pendingIds.length} students have been verified.`,
    });
  };

  return (
    <DashboardLayout 
      title="Student Verification" 
      subtitle="Review and verify student registrations"
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{students.filter(s => s.verificationStatus === 'pending').length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{students.filter(s => s.verificationStatus === 'verified').length}</p>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{students.filter(s => s.verificationStatus === 'rejected').length}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pending students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {pendingStudents.length > 0 && (
              <Button onClick={handleBulkVerify}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify All ({pendingStudents.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Verifications</CardTitle>
          <CardDescription>Review student profiles before approving</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingStudents.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">No pending verifications at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingStudents.map((student) => (
                <div 
                  key={student.student_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{student.full_name}</h4>
                      <Badge variant="outline">{student.roll_number}</Badge>
                      {student.profile_completion_percentage < 70 && (
                        <Badge variant="outline" className="text-yellow-600 bg-yellow-500/10 border-yellow-500/20">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Incomplete Profile
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{student.department}</span>
                      <span>•</span>
                      <span>CGPA: {formatCGPA(student.academicProfile.cgpa)}</span>
                      <span>•</span>
                      <span>10th: {student.academicProfile.tenth_percentage}%</span>
                      <span>•</span>
                      <span>12th: {student.academicProfile.twelfth_percentage}%</span>
                      <span>•</span>
                      <span>Backlogs: {student.academicProfile.backlog_count}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <Eye className="h-4 w-4 mr-1" /> Review
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleVerify(student.student_id)}
                    >
                      <UserCheck className="h-4 w-4 mr-1" /> Verify
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowRejectDialog(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedStudent && !showRejectDialog} onOpenChange={() => setSelectedStudent(null)}>
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
                  <p className="font-medium">{selectedStudent.mobile}</p>
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
                <h4 className="font-medium mb-3">Academic Details</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold">{formatCGPA(selectedStudent.academicProfile.cgpa)}</p>
                    <p className="text-xs text-muted-foreground">CGPA</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold">{selectedStudent.academicProfile.tenth_percentage}%</p>
                    <p className="text-xs text-muted-foreground">10th</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold">{selectedStudent.academicProfile.twelfth_percentage}%</p>
                    <p className="text-xs text-muted-foreground">12th</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold">{selectedStudent.academicProfile.backlog_count}</p>
                    <p className="text-xs text-muted-foreground">Backlogs</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedStudent(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => setShowRejectDialog(true)}
            >
              Reject
            </Button>
            <Button onClick={() => selectedStudent && handleVerify(selectedStudent.student_id)}>
              <UserCheck className="h-4 w-4 mr-2" /> Verify Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
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
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectReason('');
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
