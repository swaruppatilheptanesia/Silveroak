import { useMemo, useState } from 'react';
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
import { Download, Search, Building2, Users, CheckCircle, Clock } from 'lucide-react';
import { useCompanyInternshipReport } from '@/hooks/use-report-analytics-api';
import { useToast } from '@/hooks/use-toast';

type QueryParams = {
  from?: string;
  to?: string;
  department?: string;
  batch?: string;
  search?: string;
};

interface CompanySummary {
  company_name: string;
  company_id: string | null;
  total: number;
  ongoing: number;
  completed: number;
  discontinued: number;
  avgStipend: number;
  departments: string[];
  batches: string[];
}

export default function CompanyInternshipSummary() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateFrom || undefined,
    to: dateTo || undefined,
    department: departmentFilter === 'all' ? undefined : departmentFilter,
    batch: batchFilter === 'all' ? undefined : batchFilter,
    search: searchQuery || undefined,
  }), [batchFilter, dateFrom, dateTo, departmentFilter, searchQuery]);

  const { data, isLoading } = useCompanyInternshipReport(queryParams);

  const summaries: CompanySummary[] = useMemo(() => {
    return (data?.companies ?? []).map((company: any) => ({
      company_name: company.company_name,
      company_id: company.company_id,
      total: company.total,
      ongoing: company.ongoing,
      completed: company.completed,
      discontinued: company.discontinued,
      avgStipend: company.avgStipend,
      departments: company.departments ?? [],
      batches: company.batches ?? [],
    }));
  }, [data]);

  const batches = useMemo(() => Array.from(new Set(summaries.flatMap((summary) => summary.batches))).sort(), [summaries]);

  const totals = useMemo(() => ({
    companies: data?.stats?.companies ?? summaries.length,
    interns: data?.stats?.interns ?? summaries.reduce((sum, summary) => sum + summary.total, 0),
    ongoing: data?.stats?.ongoing ?? summaries.reduce((sum, summary) => sum + summary.ongoing, 0),
    completed: data?.stats?.completed ?? summaries.reduce((sum, summary) => sum + summary.completed, 0),
  }), [data, summaries]);

  const handleExportCsv = () => {
    const header = 'Company,Total Interns,Ongoing,Completed,Discontinued,Avg Stipend (₹),Departments,Batches\n';
    const rows = summaries.map((summary) =>
      `"${summary.company_name}",${summary.total},${summary.ongoing},${summary.completed},${summary.discontinued},${summary.avgStipend || 'N/A'},"${summary.departments.join(', ')}","${summary.batches.join(', ')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'company_internship_summary.csv';
    a.click();
    toast({ title: 'Exported', description: 'CSV downloaded successfully.' });
  };

  const cards = [
    { label: 'Companies', value: totals.companies, icon: Building2, color: 'text-primary' },
    { label: 'Total Interns', value: totals.interns, icon: Users, color: 'text-blue-600' },
    { label: 'Ongoing', value: totals.ongoing, icon: Clock, color: 'text-amber-600' },
    { label: 'Completed', value: totals.completed, icon: CheckCircle, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Company-wise Breakdown</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search company..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {Array.from(new Set(summaries.flatMap((summary) => summary.departments))).sort().map((department) => (
                  <SelectItem key={department} value={department}>{department}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} placeholder="From" />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} placeholder="To" />
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Company</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Ongoing</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">Discontinued</TableHead>
                  <TableHead className="text-right">Avg Stipend</TableHead>
                  <TableHead>Departments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && summaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading company internship summary...</TableCell>
                  </TableRow>
                ) : summaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No companies match the selected filters.</TableCell>
                  </TableRow>
                ) : (
                  summaries.map((summary) => (
                    <TableRow key={summary.company_id ?? summary.company_name}>
                      <TableCell className="font-medium text-sm">{summary.company_name}</TableCell>
                      <TableCell className="text-center font-bold">{summary.total}</TableCell>
                      <TableCell className="text-center text-blue-600">{summary.ongoing}</TableCell>
                      <TableCell className="text-center text-green-600">{summary.completed}</TableCell>
                      <TableCell className="text-center text-red-600">{summary.discontinued}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {summary.avgStipend > 0 ? `₹${summary.avgStipend.toLocaleString('en-IN')}` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {summary.departments.map((department) => (
                            <Badge key={department} variant="outline" className="text-xs">{department}</Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">Showing {summaries.length} companies</p>
        </CardContent>
      </Card>
    </div>
  );
}
