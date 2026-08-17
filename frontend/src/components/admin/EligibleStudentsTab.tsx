import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useClientSort } from '@/hooks/use-client-sort';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Download, 
  Users, 
  Filter,
  CheckCircle,
  GraduationCap,
  Mail,
  Phone
} from "lucide-react";
import { type JobPosting, branches } from '@/services/postingService';
import { formatCGPA } from '@/lib/formatters';

// Mock eligible students data for admin view
interface EligibleStudent {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  mobile: string;
  branch: string;
  batch: string;
  cgpa: number;
  backlogs: number;
  skills: string[];
  matchPercentage: number;
  profileCompletion: number;
  hasResume: boolean;
}

const mockEligibleStudents: EligibleStudent[] = [
  {
    id: 'STU001',
    name: 'Rahul Sharma',
    rollNumber: '21BCE1234',
    email: 'rahul.sharma@university.edu',
    mobile: '+91 98765 43210',
    branch: 'Computer Science',
    batch: '2025',
    cgpa: 8.65,
    backlogs: 0,
    skills: ['React', 'Node.js', 'Python', 'AWS'],
    matchPercentage: 92,
    profileCompletion: 85,
    hasResume: true,
  },
  {
    id: 'STU002',
    name: 'Priya Patel',
    rollNumber: '21BCE1345',
    email: 'priya.patel@university.edu',
    mobile: '+91 98765 43211',
    branch: 'Computer Science',
    batch: '2025',
    cgpa: 9.12,
    backlogs: 0,
    skills: ['Java', 'Spring Boot', 'MySQL', 'Docker'],
    matchPercentage: 88,
    profileCompletion: 92,
    hasResume: true,
  },
  {
    id: 'STU003',
    name: 'Amit Kumar',
    rollNumber: '21BIT2234',
    email: 'amit.kumar@university.edu',
    mobile: '+91 98765 43212',
    branch: 'Information Technology',
    batch: '2025',
    cgpa: 7.85,
    backlogs: 0,
    skills: ['JavaScript', 'React', 'MongoDB'],
    matchPercentage: 75,
    profileCompletion: 78,
    hasResume: true,
  },
  {
    id: 'STU004',
    name: 'Sneha Reddy',
    rollNumber: '21BCE1456',
    email: 'sneha.reddy@university.edu',
    mobile: '+91 98765 43213',
    branch: 'Computer Science',
    batch: '2025',
    cgpa: 8.34,
    backlogs: 0,
    skills: ['Python', 'Machine Learning', 'TensorFlow'],
    matchPercentage: 82,
    profileCompletion: 88,
    hasResume: true,
  },
  {
    id: 'STU005',
    name: 'Karthik S',
    rollNumber: '21BEC3345',
    email: 'karthik.s@university.edu',
    mobile: '+91 98765 43214',
    branch: 'Electronics',
    batch: '2025',
    cgpa: 7.92,
    backlogs: 0,
    skills: ['C++', 'Embedded Systems', 'VLSI'],
    matchPercentage: 65,
    profileCompletion: 72,
    hasResume: false,
  },
];

interface EligibleStudentsTabProps {
  posting: JobPosting;
}

export function EligibleStudentsTab({ posting }: EligibleStudentsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [cgpaFilter, setCgpaFilter] = useState<string>('all');

  // Filter students based on posting eligibility
  const eligibleStudents = useMemo(() => {
    return mockEligibleStudents.filter(student => {
      // Check branch eligibility
      const branchMatch = posting.eligibility.branches.some(b => 
        student.branch.toLowerCase().includes(b.toLowerCase().split(' ')[0]) ||
        b.toLowerCase().includes(student.branch.toLowerCase().split(' ')[0])
      );
      
      // Check batch eligibility
      const batchMatch = posting.eligibility.batches.includes(student.batch);
      
      // Check CGPA
      const cgpaMatch = student.cgpa >= posting.eligibility.minCgpa;
      
      // Check backlogs
      const backlogMatch = student.backlogs <= posting.eligibility.maxBacklogs;

      return branchMatch && batchMatch && cgpaMatch && backlogMatch;
    });
  }, [posting]);

  // Apply additional filters
  const filteredStudents = useMemo(() => {
    return eligibleStudents.filter(student => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !student.name.toLowerCase().includes(search) &&
          !student.rollNumber.toLowerCase().includes(search) &&
          !student.email.toLowerCase().includes(search)
        ) {
          return false;
        }
      }

      // Branch filter
      if (branchFilter !== 'all' && !student.branch.includes(branchFilter)) {
        return false;
      }

      // CGPA filter
      if (cgpaFilter !== 'all') {
        const cgpa = parseFloat(cgpaFilter);
        if (student.cgpa < cgpa) {
          return false;
        }
      }

      return true;
    });
  }, [eligibleStudents, searchTerm, branchFilter, cgpaFilter]);

  const { sorted: sortedStudents, sort_by, sort_order, onSort } = useClientSort(filteredStudents, {
    student: (s) => s.name,
    branch: (s) => s.branch,
    cgpa: (s) => s.cgpa,
    match: (s) => s.matchPercentage,
    profile: (s) => s.profileCompletion,
  });

  const handleExport = () => {
    // In real implementation, this would export to CSV/Excel
    console.log('Exporting students:', filteredStudents);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{eligibleStudents.length}</p>
                <p className="text-xs text-muted-foreground">Eligible Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {eligibleStudents.filter(s => s.profileCompletion >= 80).length}
                </p>
                <p className="text-xs text-muted-foreground">Profile Complete (&gt;80%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">
                  {(eligibleStudents.reduce((sum, s) => sum + s.cgpa, 0) / eligibleStudents.length || 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Avg CGPA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Filter className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{filteredStudents.length}</p>
                <p className="text-xs text-muted-foreground">After Filters</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Students</CardTitle>
          <CardDescription>
            Narrow down the eligible student pool for this opportunity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll number, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {posting.eligibility.branches.map(branch => (
                  <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cgpaFilter} onValueChange={setCgpaFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Min CGPA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any CGPA</SelectItem>
                <SelectItem value="9">≥ 9.0</SelectItem>
                <SelectItem value="8.5">≥ 8.5</SelectItem>
                <SelectItem value="8">≥ 8.0</SelectItem>
                <SelectItem value="7.5">≥ 7.5</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label="Student" columnKey="student" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Branch" columnKey="branch" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="CGPA" columnKey="cgpa" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Match %" columnKey="match" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Profile" columnKey="profile" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <TableHead>Skills</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No students match the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.rollNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.branch}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={student.cgpa >= 8 ? 'text-green-600 font-medium' : ''}>
                          {formatCGPA(student.cgpa)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={student.matchPercentage} 
                            className="w-16 h-2"
                          />
                          <span className="text-sm">{student.matchPercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={student.profileCompletion} 
                            className="w-16 h-2"
                          />
                          <span className="text-sm">{student.profileCompletion}%</span>
                          {student.hasResume && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {student.skills.slice(0, 3).map(skill => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {student.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{student.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={`mailto:${student.email}`}>
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={`tel:${student.mobile}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
