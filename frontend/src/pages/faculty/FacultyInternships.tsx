import { useDeferredValue, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  GraduationCap,
  IndianRupee,
  Loader2,
  Search,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InternshipDetailSheet } from '@/components/internships/InternshipDetailSheet';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useServerSort } from '@/hooks/use-server-sort';
import { useAuth } from '@/contexts/AuthContext';
import { useInternships } from '@/hooks/use-internship-api';
import {
  getInternshipDaysRemaining,
  getInternshipDepartment,
  getInternshipEnrollmentNumber,
  getInternshipStudentName,
} from '@/lib/internshipModule';
import { INTERNSHIP_STATUS_CONFIG, INTERNSHIP_TYPE_CONFIG, type InternshipStatus } from '@/types/internship';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export default function FacultyInternships() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InternshipStatus>('all');
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'student' | 'company' | 'status' | 'start_date'
  >('start_date', 'desc', () => setPage(1));
  const [detailInternshipId, setDetailInternshipId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchTerm);

  const internshipsQuery = useInternships({
    page,
    limit: 20,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: deferredSearch || undefined,
    sort_by,
    sort_order,
  });
  const totalQuery = useInternships({ page: 1, limit: 1 });
  const ongoingQuery = useInternships({ page: 1, limit: 1, status: 'ongoing' });
  const completedQuery = useInternships({ page: 1, limit: 1, status: 'completed' });
  const stipendQuery = useInternships({ page: 1, limit: 1, is_receiving_stipend: true });

  const internships = internshipsQuery.data?.data ?? [];

  return (
    <DashboardLayout
      title="Internship Records"
      subtitle={`${user?.department || 'Faculty scope'} - live department view`}
    >
      <div className="space-y-6">
        {internshipsQuery.error && (
          <Card className="border-destructive/30">
            <CardContent className="flex items-start gap-3 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{getErrorMessage(internshipsQuery.error, 'Please refresh and try again.')}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><GraduationCap className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold">{totalQuery.data?.pagination.total ?? 0}</p><p className="text-sm text-muted-foreground">Total</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-blue-600" /><div><p className="text-2xl font-semibold">{ongoingQuery.data?.pagination.total ?? 0}</p><p className="text-sm text-muted-foreground">Ongoing</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="text-2xl font-semibold">{completedQuery.data?.pagination.total ?? 0}</p><p className="text-sm text-muted-foreground">Completed</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><IndianRupee className="h-5 w-5 text-emerald-600" /><div><p className="text-2xl font-semibold">{stipendQuery.data?.pagination.total ?? 0}</p><p className="text-sm text-muted-foreground">Receiving stipend</p></div></CardContent></Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search student, enrollment, company, or role..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as 'all' | InternshipStatus);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {Object.entries(INTERNSHIP_STATUS_CONFIG).map(([status, config]) => (
                <SelectItem key={status} value={status}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {internshipsQuery.isLoading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading internships...
              </div>
            ) : internships.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No internship records found"
                description="No internships matched the current department and filters."
                className="py-16"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label="Student" columnKey="student" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Company & Role" columnKey="company" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Type</TableHead>
                      <SortableTableHead label="Duration" columnKey="start_date" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Stipend</TableHead>
                      <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {internships.map((internship) => {
                      const daysRemaining = getInternshipDaysRemaining(internship);

                      return (
                        <TableRow key={internship.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{getInternshipStudentName(internship)}</p>
                              <p className="text-xs text-muted-foreground">
                                {getInternshipEnrollmentNumber(internship)} • {getInternshipDepartment(internship)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{internship.company_name}</p>
                              <p className="text-xs text-muted-foreground">{internship.role}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={INTERNSHIP_TYPE_CONFIG[internship.internship_type].color} variant="outline">
                              {INTERNSHIP_TYPE_CONFIG[internship.internship_type].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{format(new Date(internship.start_date), 'dd MMM yyyy')}</p>
                              <p className="text-xs text-muted-foreground">
                                {internship.end_date ? `to ${format(new Date(internship.end_date), 'dd MMM yyyy')}` : 'End date not set'}
                              </p>
                              {daysRemaining !== null && (
                                <p className="text-xs text-muted-foreground">
                                  {daysRemaining > 0 ? `${daysRemaining} days left` : 'Ended'}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {internship.is_receiving_stipend && internship.stipend_amount !== null ? (
                              <span className="text-sm">Rs {internship.stipend_amount.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {internship.internship_type === 'unpaid' ? 'Unpaid' : 'Not receiving'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={INTERNSHIP_STATUS_CONFIG[internship.status].color} variant="outline">
                              {INTERNSHIP_STATUS_CONFIG[internship.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => setDetailInternshipId(internship.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {(internshipsQuery.data?.pagination.totalPages ?? 1) > 1 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {internshipsQuery.data?.pagination.page} of {internshipsQuery.data?.pagination.totalPages}
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page > 1) setPage((current) => current - 1);
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page < (internshipsQuery.data?.pagination.totalPages ?? 1)) {
                        setPage((current) => current + 1);
                      }
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        <InternshipDetailSheet
          internshipId={detailInternshipId}
          open={Boolean(detailInternshipId)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setDetailInternshipId(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
