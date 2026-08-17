import { downloadCSV } from '@/components/reports/ReportToolbar';
import { getCompanyClassificationLabel } from '@/lib/employerModule';
import { APPLICATION_STAGE_CONFIG, type ApplicationStage } from '@/types/application';
import type {
  ApplicationPipelineStats,
  CompanyWiseStats,
  PlacementStats,
} from '@/types/report';

const stageOrderFallback = Number.MAX_SAFE_INTEGER;

export function getReportErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function formatReportNumber(value: number) {
  return value.toLocaleString('en-IN');
}

export function getPlacementTypeLabel(type: string) {
  switch (type) {
    case 'job':
      return 'Job Offers';
    case 'internship':
      return 'Internship Offers';
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

export function sortPipelineStages(pipeline: ApplicationPipelineStats['pipeline']) {
  return [...pipeline].sort((left, right) => {
    const leftConfig = APPLICATION_STAGE_CONFIG[left.stage as ApplicationStage];
    const rightConfig = APPLICATION_STAGE_CONFIG[right.stage as ApplicationStage];
    const leftOrder = leftConfig?.order ?? stageOrderFallback;
    const rightOrder = rightConfig?.order ?? stageOrderFallback;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.stage.localeCompare(right.stage);
  });
}

export function getPipelineStageLabel(stage: string) {
  return APPLICATION_STAGE_CONFIG[stage as ApplicationStage]?.label
    ?? stage.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getPipelineStageColorClass(stage: string) {
  return APPLICATION_STAGE_CONFIG[stage as ApplicationStage]?.color
    ?? 'bg-muted text-muted-foreground border-border';
}

export function getCompanyClassificationColor(classification: string | null) {
  switch (classification) {
    case 'preferred':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'blacklisted':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
  }
}

export function getCompanyClassificationText(classification: string | null) {
  return getCompanyClassificationLabel(classification as 'preferred' | 'normal' | 'blacklisted' | null);
}

export function exportPlacementStatsCsv(stats: PlacementStats) {
  const rows = [
    ['Metric', 'Value'],
    ['Placed', String(stats.placed)],
    ['Unplaced', String(stats.unplaced)],
    ...stats.offers_by_type.map((entry) => [getPlacementTypeLabel(entry.type), String(entry.count)]),
  ];

  downloadCSV(rows.map((row) => row.join(',')).join('\n'), 'placement_analytics');
}

export function exportPipelineCsv(stats: ApplicationPipelineStats) {
  const rows = [
    ['Stage', 'Count'],
    ...sortPipelineStages(stats.pipeline).map((entry) => [getPipelineStageLabel(entry.stage), String(entry.count)]),
  ];

  downloadCSV(rows.map((row) => row.join(',')).join('\n'), 'application_pipeline');
}

export function exportCompanyStatsCsv(stats: CompanyWiseStats) {
  const rows = [
    ['Company', 'Classification', 'Postings', 'Offers', 'Engagements'],
    ...stats.companies.map((company) => [
      company.name,
      getCompanyClassificationText(company.classification),
      String(company.postings_count),
      String(company.offers_count),
      String(company.engagements_count),
    ]),
  ];

  downloadCSV(rows.map((row) => row.join(',')).join('\n'), 'company_analytics');
}
