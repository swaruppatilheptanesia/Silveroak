import { useMemo, useState } from 'react';
import { ArrowDown, Download, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { useMasterValues } from '@/hooks/use-master-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOfferToJoinFunnelReport } from '@/hooks/use-report-analytics-api';
import { JOINING_STATUS_CONFIG, OFFER_STATUS_CONFIG } from '@/types/offer';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';
import PostingTypeFilter from './PostingTypeFilter';
import { uniqueNonEmptyStrings } from './reportUtils';

type QueryParams = {
  from?: Date;
  to?: Date;
  academic_year?: string;
  department?: string;
  batch?: string;
  posting_type?: string;
  search?: string;
};

function stageColor(label: string) {
  if (label === 'Offers Released') return 'bg-blue-500';
  if (label === 'Pending Action') return 'bg-amber-500';
  if (label === 'Accepted') return 'bg-emerald-500';
  if (label === 'Rejected (Admin)') return 'bg-destructive';
  if (label === 'Joined') return 'bg-primary';
  return 'bg-red-500';
}

export default function OfferToJoinFunnelReport() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [academicYear, setAcademicYear] = useState('');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const academicYearQuery = useMasterValues('academic_year');

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateRange.from,
    to: dateRange.to,
    academic_year: academicYear || undefined,
    department: deptFilter === 'all' ? undefined : deptFilter,
    batch: batchFilter === 'all' ? undefined : batchFilter,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    search: searchQuery || undefined,
  }), [academicYear, batchFilter, dateRange.from, dateRange.to, deptFilter, postingTypeFilter, searchQuery]);

  const { data, isLoading } = useOfferToJoinFunnelReport(queryParams);

  const offers = data?.offers ?? [];
  const stages = data?.stages ?? [];
  const stats = data?.stats ?? {
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    joined: 0,
    dnj: 0,
    pending_join: 0,
  };

  const departments = useMemo<string[]>(
    () => uniqueNonEmptyStrings(offers.map((offer: any) => offer.department)),
    [offers],
  );
  const batches = useMemo<string[]>(
    () => uniqueNonEmptyStrings(offers.map((offer: any) => offer.batch)),
    [offers],
  );
  const academicYearOptions = useMemo(
    () => [...(academicYearQuery.data ?? [])]
      .sort((left, right) => right.localeCompare(left))
      .map((year) => ({ value: year, label: year })),
    [academicYearQuery.data],
  );
  const departmentOptions = useMemo(
    () => departments.map((department) => ({ value: department, label: department })),
    [departments],
  );
  const batchOptions = useMemo(
    () => batches.map((batch) => ({ value: batch, label: batch })),
    [batches],
  );

  const handleExport = () => {
    const rows = offers.map((offer: any) => (
      `"${offer.student_name}",${offer.enrollment_number},${offer.department},${offer.batch},${offer.company_name},${offer.role},${offer.type},${OFFER_STATUS_CONFIG[offer.status as keyof typeof OFFER_STATUS_CONFIG]?.label ?? offer.status},${JOINING_STATUS_CONFIG[offer.joining_status as keyof typeof JOINING_STATUS_CONFIG]?.label ?? offer.joining_status}`
    ));

    downloadCSV(
      `Student,Enrollment,Department,Batch,Company,Role,Type,Status,Joining\n${rows.join('\n')}`,
      'offer_to_join_funnel',
    );
  };

  const acceptanceRate = stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0;
  const joinRate = stats.accepted > 0 ? Math.round((stats.joined / stats.accepted) * 100) : 0;
  const dnjRate = stats.accepted > 0 ? Math.round((stats.dnj / stats.accepted) * 100) : 0;

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar
        title="Offer-to-Join Funnel"
        totalRecords={stats.total}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExportCSV={handleExport}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search student, company or role..."
              className="pl-9 h-9 w-[220px] text-xs"
            />
          </div>
          <SearchableSelect
            options={academicYearOptions}
            value={academicYear}
            onValueChange={setAcademicYear}
            placeholder="Academic year"
            searchPlaceholder="Search academic year..."
            emptyMessage="No academic years found."
            loadingMessage="Loading academic years..."
            isLoading={academicYearQuery.isLoading}
            clearable
            buttonClassName="h-9 w-[160px] text-xs"
            contentClassName="w-[min(28rem,calc(100vw-2rem))]"
          />
          <PostingTypeFilter
            value={postingTypeFilter}
            onValueChange={setPostingTypeFilter}
            triggerClassName="h-9 w-[160px] text-xs"
          />
          <SearchableSelect
            options={departmentOptions}
            value={deptFilter === 'all' ? '' : deptFilter}
            onValueChange={(value) => setDeptFilter(value || 'all')}
            placeholder="Department"
            searchPlaceholder="Search department..."
            emptyMessage="No departments found."
            loadingMessage="Loading departments..."
            clearable
            buttonClassName="h-9 w-[180px] text-xs"
            contentClassName="w-[min(28rem,calc(100vw-2rem))]"
          />
          <SearchableSelect
            options={batchOptions}
            value={batchFilter === 'all' ? '' : batchFilter}
            onValueChange={(value) => setBatchFilter(value || 'all')}
            placeholder="Batch"
            searchPlaceholder="Search batch..."
            emptyMessage="No batches found."
            loadingMessage="Loading batches..."
            clearable
            buttonClassName="h-9 w-[140px] text-xs"
            contentClassName="w-[min(28rem,calc(100vw-2rem))]"
          />
        </div>
      </ReportToolbar>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Acceptance Rate</p>
            <p className="text-2xl font-bold text-emerald-600">{acceptanceRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Join Rate</p>
            <p className="text-2xl font-bold text-primary">{joinRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">DNJ Rate</p>
            <p className="text-2xl font-bold text-destructive">{dnjRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Pending Joining</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending_join}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.map((stage: any, index: number) => {
            const percentage = typeof stage.percentage === 'number'
              ? stage.percentage
              : stats.total > 0
                ? Math.round((stage.value / stats.total) * 100)
                : 0;

            return (
              <div key={stage.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{stage.label}</span>
                  <span className="text-sm font-bold">
                    {stage.value} <span className="text-xs text-muted-foreground">({percentage}%)</span>
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted">
                  <div className={`${stageColor(stage.label)} h-3 rounded-full`} style={{ width: `${percentage}%` }} />
                </div>
                {index < stages.length - 1 && index !== 2 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && offers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading offer funnel data...
                    </TableCell>
                  </TableRow>
                ) : offers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No offers match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  offers.map((offer: any) => (
                    <TableRow key={offer.offer_id}>
                      <TableCell className="font-medium text-sm">{offer.student_name}</TableCell>
                      <TableCell className="text-sm">{offer.company_name}</TableCell>
                      <TableCell className="text-sm">{offer.role}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{offer.type === 'job' ? 'Job' : offer.type === 'internship' ? 'Internship' : 'Stipend Internship'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            offer.status === 'accepted' || offer.status === 'joined'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : offer.status === 'pending_student_action'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-destructive/10 text-destructive'
                          }
                        >
                          {OFFER_STATUS_CONFIG[offer.status as keyof typeof OFFER_STATUS_CONFIG]?.label ?? offer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            offer.joining_status === 'joined'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : offer.joining_status === 'did_not_join'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-amber-500/10 text-amber-600'
                          }
                        >
                          {JOINING_STATUS_CONFIG[offer.joining_status as keyof typeof JOINING_STATUS_CONFIG]?.label ?? offer.joining_status}
                        </Badge>
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
