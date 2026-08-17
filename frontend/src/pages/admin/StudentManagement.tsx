import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  UserCheck, 
  Clock, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Lock,
  FileCheck
} from 'lucide-react';
import { mockAllStudents } from '@/services/studentService';
import { departments } from '@/services/studentService';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isProfileIncomplete, calculateEligibility, MIN_PROFILE_COMPLETION } from '@/lib/validations';
import { formatCGPA } from '@/lib/formatters';

const ITEMS_PER_PAGE = 5;

const statusConfig = {
  verified: { icon: UserCheck, label: 'Verified', variant: 'default' as const, color: 'text-green-600 bg-green-500/10 border-green-500/20' },
  pending: { icon: Clock, label: 'Pending', variant: 'outline' as const, color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' },
  rejected: { icon: XCircle, label: 'Rejected', variant: 'destructive' as const, color: 'text-red-600 bg-red-500/10 border-red-500/20' },
};

export default function StudentManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cgpaFilter, setCgpaFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<typeof mockAllStudents[0] | null>(null);

  const filteredStudents = useMemo(() => {
    return mockAllStudents.filter((student) => {
      const matchesSearch = 
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDepartment = departmentFilter === 'all' || student.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || student.verificationStatus === statusFilter;
      
      let matchesCgpa = true;
      if (cgpaFilter === '9+') matchesCgpa = student.academicProfile.cgpa >= 9;
      else if (cgpaFilter === '8-9') matchesCgpa = student.academicProfile.cgpa >= 8 && student.academicProfile.cgpa < 9;
      else if (cgpaFilter === '7-8') matchesCgpa = student.academicProfile.cgpa >= 7 && student.academicProfile.cgpa < 8;
      else if (cgpaFilter === '<7') matchesCgpa = student.academicProfile.cgpa < 7;

      return matchesSearch && matchesDepartment && matchesStatus && matchesCgpa;
    });
  }, [searchQuery, departmentFilter, statusFilter, cgpaFilter]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExport = () => {
    // In real implementation, this would generate a CSV
    const csvContent = filteredStudents.map(s => 
      `${s.full_name},${s.roll_number},${s.email},${s.department},${formatCGPA(s.academicProfile.cgpa, '')},${s.verificationStatus}`
    ).join('\n');
    
    const blob = new Blob([`Name,Roll Number,Email,Department,CGPA,Status\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_export.csv';
    a.click();
  };

  return (
    <DashboardLayout 
      title="Student Management" 
      subtitle="View and manage all registered students"
    >
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll number, or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cgpaFilter} onValueChange={(v) => { setCgpaFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[130px]">
                <SelectValue placeholder="CGPA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All CGPA</SelectItem>
                <SelectItem value="9+">9.0+</SelectItem>
                <SelectItem value="8-9">8.0 - 9.0</SelectItem>
                <SelectItem value="7-8">7.0 - 8.0</SelectItem>
                <SelectItem value="<7">Below 7.0</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {paginatedStudents.length} of {filteredStudents.length} students
        </p>
      </div>

      {/* Student Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.map((student) => {
                const status = statusConfig[student.verificationStatus];
                const StatusIcon = status.icon;
                const profileIncomplete = isProfileIncomplete(student.profile_completion_percentage);
                const eligibility = calculateEligibility(student.academicProfile);
                
                return (
                  <TableRow key={student.student_id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground">{student.roll_number}</p>
                        </div>
                        {/* Profile Incomplete Flag */}
                        {profileIncomplete && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Profile incomplete ({student.profile_completion_percentage}%)</p>
                              <p className="text-xs text-muted-foreground">{MIN_PROFILE_COMPLETION}% required</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{student.department}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{formatCGPA(student.academicProfile.cgpa)}</span>
                        {/* Auto-calculated eligibility indicator */}
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge 
                              variant={eligibility.status === 'eligible' ? 'default' : eligibility.status === 'conditional' ? 'secondary' : 'destructive'}
                              className="text-[10px] px-1 py-0"
                            >
                              {eligibility.status === 'eligible' ? 'E' : eligibility.status === 'conditional' ? 'C' : 'NE'}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">Eligibility: {eligibility.status.replace('_', ' ')}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Auto-calculated (cannot override)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={student.profile_completion_percentage} 
                          className={`h-2 w-16 ${profileIncomplete ? '[&>div]:bg-yellow-500' : ''}`} 
                        />
                        <span className={`text-sm ${profileIncomplete ? 'text-yellow-600 dark:text-yellow-400 font-medium' : 'text-muted-foreground'}`}>
                          {student.profile_completion_percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        {/* Policy Status */}
                        {!student.policy_accepted && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-red-600 bg-red-500/10 border-red-500/20 px-1">
                                <FileCheck className="h-3 w-3" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Policy not accepted</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>View complete student profile information</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              {/* Validation Flags */}
              <div className="flex flex-wrap gap-2">
                {isProfileIncomplete(selectedStudent.profile_completion_percentage) && (
                  <Badge variant="outline" className="text-yellow-600 bg-yellow-500/10 border-yellow-500/20 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Incomplete Profile ({selectedStudent.profile_completion_percentage}%)
                  </Badge>
                )}
                {!selectedStudent.policy_accepted && (
                  <Badge variant="destructive" className="gap-1">
                    <FileCheck className="h-3 w-3" />
                    Policy Not Accepted
                  </Badge>
                )}
                {(() => {
                  const elig = calculateEligibility(selectedStudent.academicProfile);
                  return (
                    <Badge 
                      variant={elig.status === 'eligible' ? 'default' : elig.status === 'conditional' ? 'secondary' : 'destructive'}
                      className="gap-1"
                    >
                      <Lock className="h-3 w-3" />
                      {elig.status === 'eligible' ? 'Eligible' : elig.status === 'conditional' ? 'Conditional' : 'Not Eligible'}
                      <span className="text-xs opacity-70">(auto)</span>
                    </Badge>
                  );
                })()}
              </div>

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
                <h4 className="font-medium mb-3">Academic Profile</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">CGPA</p>
                    <p className="font-medium text-lg">{formatCGPA(selectedStudent.academicProfile.cgpa)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">10th %</p>
                    <p className="font-medium">{selectedStudent.academicProfile.tenth_percentage}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">12th %</p>
                    <p className="font-medium">{selectedStudent.academicProfile.twelfth_percentage}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Backlogs</p>
                    <p className="font-medium">{selectedStudent.academicProfile.backlog_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Policy Accepted</p>
                    <p className={`font-medium ${selectedStudent.policy_accepted ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedStudent.policy_accepted ? 'Yes' : 'No (Required)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profile Completion</p>
                    <p className={`font-medium ${isProfileIncomplete(selectedStudent.profile_completion_percentage) ? 'text-yellow-600' : 'text-green-600'}`}>
                      {selectedStudent.profile_completion_percentage}%
                      {isProfileIncomplete(selectedStudent.profile_completion_percentage) && ` (${MIN_PROFILE_COMPLETION}% required)`}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Eligibility Breakdown - Read Only */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-medium">Eligibility Status</h4>
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Auto-calculated
                  </Badge>
                </div>
                {(() => {
                  const elig = calculateEligibility(selectedStudent.academicProfile);
                  return (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className={`p-2 rounded border ${elig.cgpaCheck.passed ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'}`}>
                        <p className="text-muted-foreground">CGPA Check</p>
                        <p className={`font-medium ${elig.cgpaCheck.passed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {formatCGPA(elig.cgpaCheck.value)} / {elig.cgpaCheck.required} min
                        </p>
                      </div>
                      <div className={`p-2 rounded border ${elig.backlogCheck.passed ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'}`}>
                        <p className="text-muted-foreground">Backlog Check</p>
                        <p className={`font-medium ${elig.backlogCheck.passed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {elig.backlogCheck.value} / {elig.backlogCheck.maxAllowed} max
                        </p>
                      </div>
                      <div className={`p-2 rounded border ${elig.percentageCheck.passed ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'}`}>
                        <p className="text-muted-foreground">% Check</p>
                        <p className={`font-medium ${elig.percentageCheck.passed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          10th: {elig.percentageCheck.tenthValue}%
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
