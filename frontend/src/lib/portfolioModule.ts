import type {
  ApiInternshipShowcase,
  ApiPortfolio,
  ApiPortfolioProject,
  ApiPortfolioStatus,
} from '@/types/portfolio';

export function getPortfolioErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function parsePortfolioList(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function parsePortfolioOutcomeList(value: string) {
  return Array.from(
    new Set(
      value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function formatPortfolioList(values: string[] | null | undefined) {
  return values?.join(', ') ?? '';
}

export function formatPortfolioOutcomeList(values: string[] | null | undefined) {
  return values?.join('\n') ?? '';
}

export function getPortfolioStatusMeta(status: ApiPortfolioStatus) {
  if (status === 'published') {
    return { label: 'Published', variant: 'success' as const };
  }

  if (status === 'archived') {
    return { label: 'Archived', variant: 'outline' as const };
  }

  return { label: 'Draft', variant: 'secondary' as const };
}

export function getPortfolioCompletionPercent(portfolio: Pick<ApiPortfolio, 'projects' | 'showcases'>) {
  let score = 0;

  if (portfolio.projects.length > 0) score += 40;
  if (portfolio.projects.length >= 2) score += 20;
  if (portfolio.showcases.length > 0) score += 30;
  if (portfolio.projects.some((project) => project.keywords.length > 0)) score += 10;

  return Math.min(score, 100);
}

export function getProjectDateLabel(project: Pick<ApiPortfolioProject, 'start_date' | 'end_date' | 'is_ongoing'>) {
  return {
    startDate: project.start_date,
    endDate: project.end_date,
    isOngoing: project.is_ongoing,
  };
}

export function getShowcaseDateLabel(showcase: Pick<ApiInternshipShowcase, 'start_date' | 'end_date'>) {
  return {
    startDate: showcase.start_date,
    endDate: showcase.end_date,
  };
}
