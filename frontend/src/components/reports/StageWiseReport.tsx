import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Award, TrendingUp, BarChart3 } from 'lucide-react';
import { APPLICATION_STAGE_CONFIG, PIPELINE_STAGES } from '@/types/application';
import { useCompanyMasterReport, useStageWiseReport } from '@/hooks/use-report-analytics-api';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';
import PostingTypeFilter from './PostingTypeFilter';

interface PostingStageCounts {
  postingId: string;
  postingTitle: string;
  companyName: string;
  stages: Record<string, number>;
  total: number;
}

type QueryParams = {
  company_id?: string;
  posting_type?: string;
  from?: Date;
  to?: Date;
};

export default function StageWiseReport() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [companyFilter, setCompanyFilter] = useState('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');

  const { data: companyData } = useCompanyMasterReport();

  const queryParams = useMemo<QueryParams>(() => ({
    company_id: companyFilter === 'all' ? undefined : companyFilter,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    from: dateRange.from,
    to: dateRange.to,
  }), [companyFilter, dateRange.from, dateRange.to, postingTypeFilter]);

  const { data, isLoading } = useStageWiseReport(queryParams);

  const companies = useMemo(() => {
    return (companyData?.companies ?? []).map((company: any) => ({
      id: company.company_id,
      name: company.name,
    }));
  }, [companyData]);

  const allStages = [...PIPELINE_STAGES, 'rejected'];

  const postingData: PostingStageCounts[] = useMemo(() => {
    return (data?.postings ?? []).map((posting: any) => ({
      postingId: posting.posting_id,
      postingTitle: posting.posting_title,
      companyName: posting.company_name,
      stages: posting.stages ?? {},
      total: posting.total,
    }));
  }, [data]);

  const overallStats = data?.stats ?? { total_applications: 0, opportunities: 0, offers_made: 0, conversion_rate: 0 };

  const handleExport = () => {
    const header = `Opportunity,Company,${allStages.map((stage) => APPLICATION_STAGE_CONFIG[stage as keyof typeof APPLICATION_STAGE_CONFIG]?.label ?? stage).join(',')},Total`;
    const rows = postingData.map((posting) =>
      `"${posting.postingTitle}",${posting.companyName},${allStages.map((stage) => posting.stages[stage] || 0).join(',')},${posting.total}`
    );
    const csv = `${header}\n${rows.join('\n')}`;
    downloadCSV(csv, 'stage_wise_application_count');
  };

  const cards = [
    { label: 'Total Applications', value: overallStats.total_applications, icon: Users, color: 'text-primary' },
    { label: 'Opportunities', value: overallStats.opportunities, icon: BarChart3, color: 'text-blue-600' },
    { label: 'Offers Made', value: overallStats.offers_made, icon: Award, color: 'text-green-600' },
    { label: 'Conversion Rate', value: `${overallStats.conversion_rate}%`, icon: TrendingUp, color: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar title="Stage-wise Application Count" totalRecords={overallStats.total_applications} dateRange={dateRange} onDateRangeChange={setDateRange} onExportCSV={handleExport}>
        <div className="flex flex-wrap gap-2">
          <PostingTypeFilter
            value={postingTypeFilter}
            onValueChange={setPostingTypeFilter}
            triggerClassName="h-9 w-[180px] text-xs"
          />
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReportToolbar>

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
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] sticky left-0 bg-background z-10">Opportunity</TableHead>
                  {allStages.map((stage) => (
                    <TableHead key={stage} className="text-center min-w-[80px]">
                      <span className="text-xs">{APPLICATION_STAGE_CONFIG[stage as keyof typeof APPLICATION_STAGE_CONFIG]?.label ?? stage}</span>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && postingData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={allStages.length + 2} className="text-center py-8 text-muted-foreground">
                      Loading stage-wise application counts...
                    </TableCell>
                  </TableRow>
                ) : postingData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={allStages.length + 2} className="text-center py-8 text-muted-foreground">
                      No application data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {postingData.map((posting) => (
                      <TableRow key={posting.postingId}>
                        <TableCell className="sticky left-0 bg-background z-10">
                          <div>
                            <p className="font-medium text-sm">{posting.postingTitle}</p>
                            <p className="text-xs text-muted-foreground">{posting.companyName}</p>
                          </div>
                        </TableCell>
                        {allStages.map((stage) => {
                          const count = posting.stages[stage] || 0;
                          return (
                            <TableCell key={stage} className="text-center">
                              {count > 0 ? (
                                <Badge variant="secondary" className="text-xs min-w-[28px] justify-center">
                                  {count}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-bold">{posting.total}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell className="sticky left-0 bg-muted/50 z-10 font-semibold">Total</TableCell>
                      {allStages.map((stage) => {
                        const total = postingData.reduce((sum, posting) => sum + (posting.stages[stage] || 0), 0);
                        return (
                          <TableCell key={stage} className="text-center font-semibold">
                            {total > 0 ? total : '—'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold">{postingData.reduce((sum, posting) => sum + posting.total, 0)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Showing {postingData.length} opportunities • Scroll horizontally to see all stages
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
