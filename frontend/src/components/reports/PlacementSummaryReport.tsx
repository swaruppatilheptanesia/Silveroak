import { useMemo, useState } from 'react';
import { BarChart3, Briefcase, CheckCircle, Download, Users, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Progress,
} from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { useMasterValues } from '@/hooks/use-master-api';
import { usePlacementSummaryReport } from '@/hooks/use-report-analytics-api';
import { downloadCSV } from './ReportToolbar';

type QueryParams = {
  academic_year?: string;
  branch?: string;
  batch?: string;
};

export default function PlacementSummaryReport() {
  const [academicYear, setAcademicYear] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('');
  const academicYearQuery = useMasterValues('academic_year');

  const queryParams = useMemo<QueryParams>(() => ({
    academic_year: academicYear || undefined,
    branch: branchFilter === 'all' ? undefined : branchFilter,
    batch: batchFilter || undefined,
  }), [academicYear, batchFilter, branchFilter]);

  const { data, isLoading } = usePlacementSummaryReport(queryParams);

  const branches = data?.branches ?? [];
  const branchOptions = useMemo(() => Array.from(new Set(branches.map((r: any) => r.branch).filter(Boolean))).sort() as string[], [branches]);
  const stats = data?.stats ?? {
    students: 0,
    placed: 0,
    interned: 0,
    joined: 0,
    unplaced: 0,
    offers: 0,
    overall_rate: 0,
  };

  const academicYearOptions = useMemo(
    () => [...(academicYearQuery.data ?? [])]
      .sort((left, right) => right.localeCompare(left))
      .map((year) => ({ value: year, label: year })),
    [academicYearQuery.data],
  );

  const handleExport = () => {
    const rows = branches.map((row: any) => (
      `"${row.branch}",${row.totalStudents},${row.totalOffers},${row.placed},${row.interned},${row.joined},${row.unplaced},${row.avgCTC ? `₹${row.avgCTC.toFixed(2)} LPA` : '-'},${row.placementRate}%`
    ));
    downloadCSV(
      `Branch,Students,Offers,Placed Jobs,Interned,Joined,Unplaced,Avg CTC,Placement Rate\n${rows.join('\n')}`,
      'placement_summary',
    );
  };

  const cards = [
    { label: 'Students', value: stats.students, icon: Users, color: 'text-primary' },
    { label: 'Placed Jobs', value: stats.placed, icon: Briefcase, color: 'text-emerald-600' },
    { label: 'Interned', value: stats.interned, icon: CheckCircle, color: 'text-blue-600' },
    { label: 'Unplaced', value: stats.unplaced, icon: XCircle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            Placement Analytics
          </div>
          <h3 className="text-xl font-semibold">Placement Summary</h3>
          <p className="text-sm text-muted-foreground">
            Branch-level placement data from the backend.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <card.icon className={`h-5 w-5 shrink-0 ${card.color}`} />
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
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
              buttonClassName="h-9 w-[240px] text-xs"
              contentClassName="w-[min(28rem,calc(100vw-2rem))]"
            />
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-9 w-[200px] text-xs">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branchOptions.map((branch) => (
                  <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={batchFilter}
              onChange={(event) => setBatchFilter(event.target.value)}
              placeholder="Batch (e.g. 2025)"
              className="h-9 w-[180px] text-xs"
            />
          </div>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Placement Rate</span>
                <span className="text-sm font-bold">{stats.overall_rate}%</span>
              </div>
              <Progress value={stats.overall_rate} className="h-2.5" />
              <p className="text-xs text-muted-foreground">
                {stats.joined} students joined and {stats.offers} offers were recorded in total.
              </p>
            </CardContent>
          </Card>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Offers</TableHead>
                  <TableHead className="text-right">Placed</TableHead>
                  <TableHead className="text-right">Interned</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                  <TableHead className="text-right">Unplaced</TableHead>
                  <TableHead className="text-right">Avg CTC</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && branches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      Loading placement summary...
                    </TableCell>
                  </TableRow>
                ) : branches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No placement summary data available for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  branches.map((row: any) => (
                    <TableRow key={row.branch}>
                      <TableCell className="font-medium text-sm">{row.branch}</TableCell>
                      <TableCell className="text-right">{row.totalStudents}</TableCell>
                      <TableCell className="text-right">{row.totalOffers}</TableCell>
                      <TableCell className="text-right">{row.placed}</TableCell>
                      <TableCell className="text-right">{row.interned}</TableCell>
                      <TableCell className="text-right">{row.joined}</TableCell>
                      <TableCell className="text-right">
                        {row.unplaced > 0 ? (
                          <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">
                            {row.unplaced}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                            0
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {row.avgCTC > 0 ? `₹${row.avgCTC.toFixed(2)} LPA` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            row.placementRate >= 75
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : row.placementRate >= 50
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-destructive/10 text-destructive'
                          }
                        >
                          {row.placementRate.toFixed(1)}%
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
