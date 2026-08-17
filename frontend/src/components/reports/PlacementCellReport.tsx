import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Award, Briefcase, Building2, CheckCircle2, Download, Percent, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { UserScopeSelector } from '@/components/admin/UserScopeSelector';
import { useCompanyMasterReport, usePlacementCellReport } from '@/hooks/use-report-analytics-api';
import { usePostings } from '@/hooks/use-posting-api';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import type { ApiPostingType } from '@/types/posting';
import type { PlacementCellReportPosting, PlacementCellReportSummary } from '@/types/report';
import PostingTypeFilter from './PostingTypeFilter';
import { downloadCSV } from './ReportToolbar';

type QueryParams = {
  posting_type?: string;
  company_id?: string;
  posting_id?: string;
  institute?: string[];
  course?: string[];
  branch?: string[];
  semester?: string[];
};

function formatAmount(value: number | null, kind: 'ctc' | 'stipend') {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return '—';
  }

  return kind === 'ctc' ? `₹${value.toFixed(2)} LPA` : `₹${value.toFixed(2)}`;
}

function formatRate(value: number) {
  if (!Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: ReactNode;
  description?: string;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClassName}`} />
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs text-muted-foreground">{title}</p>
            <div className="text-lg font-semibold leading-tight">{value}</div>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PackagePair({
  ctc,
  stipend,
}: {
  ctc: number | null;
  stipend: number | null;
}) {
  return (
    <div className="space-y-1 text-sm">
      <div>
        <span className="text-muted-foreground">CTC: </span>
        <span className="font-medium">{formatAmount(ctc, 'ctc')}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Stipend: </span>
        <span className="font-medium">{formatAmount(stipend, 'stipend')}</span>
      </div>
    </div>
  );
}

export default function PlacementCellReport() {
  const [postingTypeFilter, setPostingTypeFilter] = useState<'all' | ApiPostingType>('all');
  const [selectedInstitutes, setSelectedInstitutes] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedPostingId, setSelectedPostingId] = useState('');

  const companyQuery = useCompanyMasterReport();

  const postingsQuery = usePostings({
    limit: 100,
    company_id: selectedCompanyId || undefined,
    type: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const postingOptions = useMemo(() => {
    return (postingsQuery.data?.data ?? []).map((posting: any) => ({
      value: posting.id,
      label: posting.title,
      description: `${posting.company?.name ?? 'Unknown company'} • ${formatPostingTypeLabel(posting.type)}`,
      keywords: [posting.title, posting.role_name, posting.company?.name, posting.type, posting.status]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
    }));
  }, [postingsQuery.data]);

  useEffect(() => {
    if (postingsQuery.isFetched && selectedPostingId && !postingOptions.some((option) => option.value === selectedPostingId)) {
      setSelectedPostingId('');
    }
  }, [postingsQuery.isFetched, postingOptions, selectedPostingId]);

  const queryParams = useMemo<QueryParams>(() => ({
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    company_id: selectedCompanyId || undefined,
    posting_id: selectedPostingId || undefined,
    institute: selectedInstitutes.length > 0 ? selectedInstitutes : undefined,
    course: selectedCourses.length > 0 ? selectedCourses : undefined,
    branch: selectedBranches.length > 0 ? selectedBranches : undefined,
    semester: selectedSemesters.length > 0 ? selectedSemesters : undefined,
  }), [
    postingTypeFilter,
    selectedBranches,
    selectedCompanyId,
    selectedCourses,
    selectedInstitutes,
    selectedPostingId,
    selectedSemesters,
  ]);

  const { data, isLoading } = usePlacementCellReport(queryParams);

  const summary = data?.summary ?? {
    eligible_students: 0,
    registered_students: 0,
    placed_students: 0,
    joined_students: 0,
    noc_issued: 0,
    job_postings: 0,
    highest_ctc: null,
    average_ctc: null,
    highest_internship_stipend: null,
    average_internship_stipend: null,
    eligible_to_registered_rate: 0,
    eligible_to_placed_rate: 0,
    registered_to_placed_rate: 0,
    placed_to_joined_rate: 0,
    placed_to_noc_rate: 0,
  } satisfies PlacementCellReportSummary;

  const postings = data?.postings ?? [];

  const companyOptions = useMemo(() => {
    return (companyQuery.data?.companies ?? [])
      .map((company: any) => ({
        value: company.company_id,
        label: company.name,
        description: company.classification ? `Classification: ${company.classification}` : undefined,
        keywords: [company.name, company.industry, company.classification, company.company_id]
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [companyQuery.data]);

  const handleExport = () => {
    const rows = postings.map((row: PlacementCellReportPosting) => [
      `"${row.company_name}"`,
      `"${row.posting_title}"`,
      formatPostingTypeLabel(row.posting_type),
      row.eligible_students,
      row.registered_students,
      row.placed_students,
      row.joined_students,
      row.noc_issued,
      formatAmount(row.highest_ctc, 'ctc'),
      formatAmount(row.average_ctc, 'ctc'),
      formatAmount(row.highest_internship_stipend, 'stipend'),
      formatAmount(row.average_internship_stipend, 'stipend'),
      row.selected_rate,
      row.joined_rate,
    ].join(','));

    downloadCSV(
      [
        'Company,Job Posting,Posting Type,Eligible Students,Registered Students,Placed Students,Joined Students,NOC Issued,Highest CTC,Average CTC,Highest Stipend,Average Stipend,Registered vs Selected %,Selected vs Joined %',
        ...rows,
      ].join('\n'),
      'placement_cell_report',
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Placement Analytics
          </div>
          <h3 className="text-xl font-semibold">Placement Cell Report</h3>
          <p className="text-sm text-muted-foreground">
            Placement cell summary with institute/course/branch/semester targeting, company filtering, and posting-level outcomes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <PostingTypeFilter
              value={postingTypeFilter}
              onValueChange={(value) => {
                setPostingTypeFilter(value as 'all' | ApiPostingType);
                setSelectedPostingId('');
              }}
              triggerClassName="h-9 w-[180px] text-xs"
            />
            <SearchableSelect
              options={companyOptions}
              value={selectedCompanyId}
              onValueChange={(value) => {
                setSelectedCompanyId(value);
                setSelectedPostingId('');
              }}
              placeholder="Company (optional)"
              searchPlaceholder="Search company..."
              emptyMessage="No companies found."
              loadingMessage="Loading companies..."
              isLoading={companyQuery.isLoading}
              clearable
              buttonClassName="h-9 w-[220px] text-xs"
              contentClassName="w-[min(30rem,calc(100vw-2rem))]"
            />
            <SearchableSelect
              options={postingOptions}
              value={selectedPostingId}
              onValueChange={setSelectedPostingId}
              placeholder={selectedCompanyId ? 'Job posting (optional)' : 'Job posting (optional)'}
              searchPlaceholder="Search posting..."
              emptyMessage="No postings found."
              loadingMessage="Loading postings..."
              isLoading={postingsQuery.isLoading}
              clearable
              buttonClassName="h-9 w-[260px] text-xs"
              contentClassName="w-[min(36rem,calc(100vw-2rem))]"
            />
          </div>

          <UserScopeSelector
            targetInstitutes={selectedInstitutes}
            targetBranches={selectedBranches}
            targetCourses={selectedCourses}
            targetSemesters={selectedSemesters}
            onTargetInstitutesChange={setSelectedInstitutes}
            onTargetBranchesChange={setSelectedBranches}
            onTargetCoursesChange={setSelectedCourses}
            onTargetSemestersChange={setSelectedSemesters}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          title="Eligible Students"
          value={summary.eligible_students}
          description="Match the selected scope and posting targeting"
          icon={Users}
          iconClassName="text-primary"
        />
        <SummaryCard
          title="Registered Students"
          value={summary.registered_students}
          description="Applied to the selected posting(s)"
          icon={Briefcase}
          iconClassName="text-emerald-600"
        />
        <SummaryCard
          title="Placed Students"
          value={summary.placed_students}
          description="Accepted or joined offers"
          icon={CheckCircle2}
          iconClassName="text-blue-600"
        />
        <SummaryCard
          title="Joined Students"
          value={summary.joined_students}
          description="Final joining confirmations"
          icon={Building2}
          iconClassName="text-cyan-600"
        />
        <SummaryCard
          title="NOC Issued"
          value={summary.noc_issued}
          description="Issued for the selected placement cohort"
          icon={Award}
          iconClassName="text-amber-600"
        />
        <SummaryCard
          title="Job Postings"
          value={summary.job_postings}
          description="Matching postings in the selected scope"
          icon={TrendingUp}
          iconClassName="text-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <SummaryCard
          title="Highest Package"
          value={(
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">CTC: </span>
                <span>{formatAmount(summary.highest_ctc, 'ctc')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Internship stipend: </span>
                <span>{formatAmount(summary.highest_internship_stipend, 'stipend')}</span>
              </div>
            </div>
          )}
          description="Shown separately for job and internship offers"
          icon={Briefcase}
          iconClassName="text-emerald-600"
        />
        <SummaryCard
          title="Average Package"
          value={(
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">CTC: </span>
                <span>{formatAmount(summary.average_ctc, 'ctc')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Internship stipend: </span>
                <span>{formatAmount(summary.average_internship_stipend, 'stipend')}</span>
              </div>
            </div>
          )}
          description="Separate averages for job and internship offers"
          icon={Award}
          iconClassName="text-blue-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          title="Eligible → Registered"
          value={formatRate(summary.eligible_to_registered_rate)}
          description="Eligible students that actually registered"
          icon={Percent}
          iconClassName="text-primary"
        />
        <SummaryCard
          title="Registered → Selected"
          value={formatRate(summary.registered_to_placed_rate)}
          description="Registered students that became selected"
          icon={Percent}
          iconClassName="text-emerald-600"
        />
        <SummaryCard
          title="Selected → Joined"
          value={formatRate(summary.placed_to_joined_rate)}
          description="Selected students that joined"
          icon={Percent}
          iconClassName="text-blue-600"
        />
        <SummaryCard
          title="Selected → NOC"
          value={formatRate(summary.placed_to_noc_rate)}
          description="Selected students with issued NOCs"
          icon={Percent}
          iconClassName="text-amber-600"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Posting</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Eligible</TableHead>
                  <TableHead className="text-right">Registered</TableHead>
                  <TableHead className="text-right">Placed</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                  <TableHead className="text-right">NOC Issued</TableHead>
                  <TableHead>Highest Package</TableHead>
                  <TableHead>Average Package</TableHead>
                  <TableHead className="text-right">Reg. vs Sel.</TableHead>
                  <TableHead className="text-right">Sel. vs Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && postings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                      Loading placement cell report...
                    </TableCell>
                  </TableRow>
                ) : postings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                      No placement cell data found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  postings.map((row: PlacementCellReportPosting) => (
                    <TableRow key={row.posting_id}>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{row.posting_title}</p>
                          <p className="text-xs text-muted-foreground">{row.posting_id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{row.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {formatPostingTypeLabel(row.posting_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.eligible_students}</TableCell>
                      <TableCell className="text-right">{row.registered_students}</TableCell>
                      <TableCell className="text-right font-medium">{row.placed_students}</TableCell>
                      <TableCell className="text-right">{row.joined_students}</TableCell>
                      <TableCell className="text-right">{row.noc_issued}</TableCell>
                      <TableCell>
                        <PackagePair ctc={row.highest_ctc} stipend={row.highest_internship_stipend} />
                      </TableCell>
                      <TableCell>
                        <PackagePair ctc={row.average_ctc} stipend={row.average_internship_stipend} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                          {formatRate(row.selected_rate)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                          {formatRate(row.joined_rate)}
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
