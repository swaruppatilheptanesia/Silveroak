import { useMemo, useState } from 'react';
import { Building2, Download, Search, TrendingUp, Users, Briefcase, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { useMasterValues } from '@/hooks/use-master-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompanyPerformanceReport } from '@/hooks/use-report-analytics-api';
import { downloadCSV } from './ReportToolbar';

type QueryParams = {
  academic_year?: string;
  search?: string;
  sort_by?: string;
};

export default function CompanyPerformanceReport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [sortBy, setSortBy] = useState<'offers' | 'conversion' | 'name'>('offers');
  const academicYearQuery = useMasterValues('academic_year');

  const queryParams = useMemo<QueryParams>(() => ({
    academic_year: academicYear || undefined,
    search: searchQuery || undefined,
    sort_by: sortBy,
  }), [academicYear, searchQuery, sortBy]);

  const { data, isLoading } = useCompanyPerformanceReport(queryParams);

  const companies = data?.companies ?? [];

  const totals = useMemo(() => ({
    companies: data?.stats?.companies ?? companies.length,
    offers: data?.stats?.offers ?? companies.reduce((sum: number, company: any) => sum + company.offers, 0),
    joined: data?.stats?.joined ?? companies.reduce((sum: number, company: any) => sum + company.joined, 0),
    applicants: companies.reduce((sum: number, company: any) => sum + company.applicants, 0),
    conversion: companies.length > 0
      ? Number((companies.reduce((sum: number, company: any) => sum + company.conversion_rate, 0) / companies.length).toFixed(1))
      : 0,
  }), [companies, data]);
  const academicYearOptions = useMemo(
    () => [...(academicYearQuery.data ?? [])]
      .sort((left, right) => right.localeCompare(left))
      .map((year) => ({ value: year, label: year })),
    [academicYearQuery.data],
  );

  const handleExport = () => {
    const rows = companies.map((company: any) => (
      `"${company.name}","${company.industry ?? ''}",${company.applicants},${company.shortlisted},${company.offers},${company.accepted},${company.joined},${company.dnj},${company.conversion_rate}%`
    ));

    downloadCSV(
      `Company,Industry,Applicants,Shortlisted,Offers,Accepted,Joined,DNJ,Conversion Rate\n${rows.join('\n')}`,
      'company_performance',
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            Employer Analytics
          </div>
          <h3 className="text-xl font-semibold">Company Performance</h3>
          <p className="text-sm text-muted-foreground">
            Live company performance breakdown from the backend.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Companies</p>
            <p className="text-2xl font-bold">{totals.companies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Applicants</p>
            <p className="text-2xl font-bold text-primary">{totals.applicants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Offers</p>
            <p className="text-2xl font-bold text-emerald-600">{totals.offers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Joined</p>
            <p className="text-2xl font-bold text-blue-600">{totals.joined}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Conversion</p>
            <p className="text-2xl font-bold text-amber-600">{totals.conversion}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search company or industry..."
                className="pl-9 h-9 text-xs"
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
              buttonClassName="h-9 text-xs"
              contentClassName="w-[min(28rem,calc(100vw-2rem))]"
            />
            <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-xs">
              <span className="text-muted-foreground">Sort</span>
              <div className="flex gap-2">
                {[
                  { value: 'offers', label: 'Most Offers' },
                  { value: 'conversion', label: 'Best Conversion' },
                  { value: 'name', label: 'Name (A-Z)' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={sortBy === option.value ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setSortBy(option.value as typeof sortBy)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="text-right">Applicants</TableHead>
                  <TableHead className="text-right">Shortlisted</TableHead>
                  <TableHead className="text-right">Offers</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                  <TableHead className="text-right">DNJ</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      Loading company performance...
                    </TableCell>
                  </TableRow>
                ) : companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No company performance data available for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company: any) => (
                    <TableRow key={company.company_id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{company.industry || '—'}</TableCell>
                      <TableCell className="text-right">{company.applicants}</TableCell>
                      <TableCell className="text-right">{company.shortlisted}</TableCell>
                      <TableCell className="text-right">{company.offers}</TableCell>
                      <TableCell className="text-right">{company.accepted}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{company.joined}</TableCell>
                      <TableCell className="text-right">
                        {company.dnj > 0 ? <span className="text-destructive">{company.dnj}</span> : '0'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            company.conversion_rate >= 50
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : company.conversion_rate >= 20
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-muted text-muted-foreground'
                          }
                        >
                          {company.conversion_rate}%
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

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Joined vs Applicants</span>
            <span className="text-sm font-bold">{totals.applicants > 0 ? Math.round((totals.joined / totals.applicants) * 100) : 0}%</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              Backend-calculated company conversion summary.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
