import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useClientSort } from '@/hooks/use-client-sort';
import { ReportToolbar, type DateRange } from '@/components/reports/ReportToolbar';
import { downloadCsvTable } from '@/lib/spreadsheetExport';
import AdminListScopeFilters from '@/components/admin/AdminListScopeFilters';
import { Lock, Briefcase, GraduationCap, Search, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminSelectionDatabase } from '@/hooks/use-admin-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { formatPostingTypeLabel } from '@/lib/postingModule';

type SelectionRecord = {
  id: string;
  student_name: string;
  enrollment_number: string;
  department: string;
  batch: string;
  company_name: string;
  role: string;
  type: 'placement' | 'internship';
  posting_type: string | null;
  selection_date: string;
  outcome: 'joined' | 'not_joined' | 'pending';
  joining_date: string | null;
  finalized_by: string | null;
  is_locked: boolean;
  noc_status: 'issued' | 'pending';
};

const OutcomeBadge = ({ outcome }: { outcome: SelectionRecord['outcome'] }) => {
  switch (outcome) {
    case 'joined':
      return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Joined</Badge>;
    case 'not_joined':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Not Joined</Badge>;
    case 'pending':
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
  }
};

const nocStatusLabel = (status: SelectionRecord['noc_status']) =>
  status === 'issued' ? 'NOC Issued' : 'NOC Pending';

const NocStatusBadge = ({ status }: { status: SelectionRecord['noc_status'] }) =>
  status === 'issued' ? (
    <Badge className="gap-1 border-transparent bg-green-100 text-green-800 hover:bg-green-100">
      <CheckCircle2 className="h-3 w-3" /> NOC Issued
    </Badge>
  ) : (
    <Badge className="gap-1 border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100">
      <Clock className="h-3 w-3" /> NOC Pending
    </Badge>
  );

export default function SelectionDatabaseTab() {
  const [subTab, setSubTab] = useState<'placements' | 'internships'>('placements');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');

  const selectionType = subTab === 'placements' ? 'placement' : 'internship';

  const summaryParams = useMemo(() => ({
    type: selectionType,
  }), [selectionType]);

  const filteredParams = useMemo(() => ({
    type: selectionType,
    search: search || undefined,
    department: deptFilter === 'all' ? undefined : deptFilter,
    batch: batchFilter === 'all' ? undefined : batchFilter,
    posting_type: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    company: companyFilter === 'all' ? undefined : companyFilter,
    outcome: outcomeFilter === 'all' ? undefined : outcomeFilter as SelectionRecord['outcome'],
    date_from: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    date_to: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    institute: instituteFilter || undefined,
    course: courseFilter || undefined,
    branch: branchFilter || undefined,
    academic_year: academicYearFilter === 'all' ? undefined : academicYearFilter,
  }), [academicYearFilter, batchFilter, branchFilter, companyFilter, courseFilter, dateRange.from, dateRange.to, deptFilter, instituteFilter, outcomeFilter, postingTypeFilter, search, selectionType]);

  const summaryQuery = useAdminSelectionDatabase(summaryParams);
  const filteredQuery = useAdminSelectionDatabase(filteredParams);

  const summaryRecords = useMemo(
    () => summaryQuery.data?.data ?? [],
    [summaryQuery.data],
  );
  const filteredRecords = useMemo(
    () => filteredQuery.data?.data ?? [],
    [filteredQuery.data],
  );
  const { sorted: sortedRecords, sort_by, sort_order, onSort } = useClientSort(filteredRecords, {
    student: (r) => r.student_name,
    department: (r) => r.department,
    batch: (r) => r.batch,
    company: (r) => r.company_name,
    role: (r) => r.role,
    posting_type: (r) => formatPostingTypeLabel(r.posting_type),
    selection_date: (r) => new Date(r.selection_date),
    outcome: (r) => r.outcome,
    noc_status: (r) => r.noc_status,
    joining_date: (r) => (r.joining_date ? new Date(r.joining_date) : null),
    finalized_by: (r) => r.finalized_by,
  });
  const stats = summaryQuery.data?.stats ?? {
    total: 0,
    joined: 0,
    not_joined: 0,
    pending: 0,
    locked: 0,
  };
  const placementCount = summaryQuery.data?.counts.placements ?? 0;
  const internshipCount = summaryQuery.data?.counts.internships ?? 0;

  const departments = useMemo(
    () => [...new Set(summaryRecords.map((record) => record.department))].sort(),
    [summaryRecords],
  );
  const batches = useMemo(
    () => [...new Set(summaryRecords.map((record) => record.batch))].sort(),
    [summaryRecords],
  );
  const companies = useMemo(
    () => [...new Set(summaryRecords.map((record) => record.company_name))].sort(),
    [summaryRecords],
  );
  const { options: postingTypeOptions, isLoading: postingTypesLoading, isEmpty: postingTypesEmpty } = usePostingTypeOptions();

  const handleExportCSV = () => {
    const headers = [
      'Name', 'Mobile No', 'Gender', 'Email', 'Enrollment No', 'Institute', 'Course', 'Branch', 'Semester',
      'CPI', '12th %', '10th %', 'Backlogs', 'Academic Year', 'Status', 'Joining Date', 'Company Name', 'Role',
      'Selection Date', 'NOC Status',
    ];
    const rows = filteredRecords.map((record) => [
      record.student_name,
      record.mobile ?? '',
      record.gender ?? '',
      record.email ?? '',
      record.enrollment_number,
      record.institute ?? '',
      record.course ?? '',
      record.department,
      record.semester ?? '',
      record.cgpa ?? '',
      record.twelfth_percentage ?? '',
      record.tenth_percentage ?? '',
      record.backlog_count ?? 0,
      record.batch,
      record.outcome,
      record.joining_date || '',
      record.company_name,
      record.role,
      record.selection_date,
      nocStatusLabel(record.noc_status),
    ]);
    downloadCsvTable(headers, rows, `selection-database-${subTab}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card>
          <CardContent className="px-4 pb-3 pt-4">
            <p className="text-xs text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 pb-3 pt-4">
            <p className="text-xs text-muted-foreground">Joined</p>
            <p className="text-2xl font-bold text-primary">{stats.joined}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 pb-3 pt-4">
            <p className="text-xs text-muted-foreground">Not Joined</p>
            <p className="text-2xl font-bold text-destructive">{stats.not_joined}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 pb-3 pt-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 pb-3 pt-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Finalized</p>
            <p className="text-2xl font-bold">{stats.locked}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={subTab} onValueChange={(value) => setSubTab(value as 'placements' | 'internships')}>
        <TabsList>
          <TabsTrigger value="placements" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" /> Placements
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{placementCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="internships" className="gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> Internships
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{internshipCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ReportToolbar
        title={subTab === 'placements' ? 'Placed Students Database' : 'Internship Selections Database'}
        totalRecords={filteredRecords.length}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExportCSV={handleExportCSV}
      >
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Depts</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department} value={department}>
                {department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={batchFilter} onValueChange={setBatchFilter}>
          <SelectTrigger className="h-9 w-[100px] text-xs">
            <SelectValue placeholder="Batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {batches.map((batch) => (
              <SelectItem key={batch} value={batch}>
                {batch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="h-9 w-[150px] text-xs">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company} value={company}>
                {company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={postingTypeFilter} onValueChange={setPostingTypeFilter} disabled={postingTypesLoading}>
          <SelectTrigger className="h-9 w-[150px] text-xs">
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
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="h-9 w-[120px] text-xs">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="joined">Joined</SelectItem>
            <SelectItem value="not_joined">Not Joined</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </ReportToolbar>

      <AdminListScopeFilters
        institute={{ value: instituteFilter, onChange: setInstituteFilter }}
        course={{ value: courseFilter, onChange: setCourseFilter }}
        branch={{ value: branchFilter, onChange: setBranchFilter }}
        academicYear={{ value: academicYearFilter, onChange: setAcademicYearFilter }}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, enrollment, company, role..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 pl-9 text-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <SortableTableHead label="Student" columnKey="student" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Department" columnKey="department" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Batch" columnKey="batch" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Company" columnKey="company" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Role" columnKey="role" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Posting Type" columnKey="posting_type" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Selection Date" columnKey="selection_date" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Outcome" columnKey="outcome" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="NOC Status" columnKey="noc_status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Joining Date" columnKey="joining_date" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Finalized By" columnKey="finalized_by" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-12 text-center text-muted-foreground">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-12 text-center text-muted-foreground">
                      No records found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRecords.map((record) => (
                    <TableRow key={record.id} className={record.is_locked ? 'bg-muted/30' : ''}>
                      <TableCell>
                        {record.is_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{record.student_name}</p>
                          <p className="text-xs text-muted-foreground">{record.enrollment_number}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{record.department}</TableCell>
                      <TableCell className="text-sm">{record.batch}</TableCell>
                      <TableCell className="text-sm font-medium">{record.company_name}</TableCell>
                      <TableCell className="text-sm">{record.role}</TableCell>
                      <TableCell>
                        {record.posting_type ? (
                          <Badge variant="secondary">{formatPostingTypeLabel(record.posting_type)}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(record.selection_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell><OutcomeBadge outcome={record.outcome} /></TableCell>
                      <TableCell><NocStatusBadge status={record.noc_status} /></TableCell>
                      <TableCell className="text-sm">
                        {record.joining_date ? format(new Date(record.joining_date), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{record.finalized_by || '—'}</TableCell>
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
