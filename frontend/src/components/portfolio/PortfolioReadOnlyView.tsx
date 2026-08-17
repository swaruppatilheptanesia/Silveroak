import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Award,
  Briefcase,
  Building2,
  CheckCircle,
  ExternalLink,
  EyeOff,
  FolderKanban,
  Github,
  Loader2,
  Tag,
} from 'lucide-react';
import { format } from 'date-fns';
import { useStudentPortfolio } from '@/hooks/use-portfolio-api';

interface PortfolioReadOnlyViewProps {
  studentId: string;
}

function formatMonthYear(dateValue: string | null | undefined) {
  if (!dateValue) {
    return null;
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return format(parsedDate, 'MMM yyyy');
}

function getTimelineLabel(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  isOngoing?: boolean,
) {
  const startLabel = formatMonthYear(startDate);
  const endLabel = isOngoing ? 'Present' : formatMonthYear(endDate);

  if (!startLabel && !endLabel) {
    return null;
  }

  if (startLabel && endLabel) {
    return `${startLabel} - ${endLabel}`;
  }

  return startLabel || endLabel;
}

export function PortfolioReadOnlyView({ studentId }: PortfolioReadOnlyViewProps) {
  const portfolioQuery = useStudentPortfolio(studentId);

  if (portfolioQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading portfolio...
      </div>
    );
  }

  if (portfolioQuery.error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
        <p className="font-medium text-foreground">Unable to load portfolio</p>
        <p className="text-sm">
          {portfolioQuery.error instanceof Error ? portfolioQuery.error.message : 'Please try again in a moment.'}
        </p>
      </div>
    );
  }

  const portfolioView = portfolioQuery.data;
  const portfolio = portfolioView?.portfolio;
  const projects = portfolio?.projects ?? [];
  const internships = portfolio?.showcases ?? [];

  if (!portfolioView || portfolioView.status === 'missing' || !portfolio) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <FolderKanban className="h-10 w-10 mb-3" />
        <p className="font-medium">No portfolio available</p>
        <p className="text-sm">This student has not created a portfolio yet.</p>
      </div>
    );
  }

  if (portfolioView.status === 'draft' || portfolioView.status === 'archived') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <EyeOff className="h-10 w-10 mb-3" />
        <p className="font-medium">
          {portfolioView.status === 'archived' ? 'Portfolio archived' : 'Portfolio not published'}
        </p>
        <p className="text-sm">
          {portfolioView.status === 'archived'
            ? 'This student portfolio is not currently visible to faculty.'
            : 'This student portfolio is still in draft mode.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Projects */}
      {projects.length > 0 && (
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
            <FolderKanban className="h-4 w-4" />
            Projects ({projects.length})
          </h4>
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-medium">{project.title}</h5>
                    {(() => {
                      const timelineLabel = getTimelineLabel(project.start_date, project.end_date, project.is_ongoing);
                      const subtitle = [project.role, timelineLabel].filter(Boolean).join(' • ');

                      return subtitle ? (
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex gap-1">
                    {project.github_url && (
                      <a
                        href={project.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-muted rounded-md transition-colors">
                        <Github className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                    {project.live_url && (
                      <a
                        href={project.live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-muted rounded-md transition-colors">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                )}
                {project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.technologies.map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                    ))}
                  </div>
                )}
                {project.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.keywords.map((kw) => (
                      <Badge key={kw} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />{kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Internships */}
      {internships.length > 0 && (
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
            <Briefcase className="h-4 w-4" />
            Internship Experience ({internships.length})
          </h4>
          <div className="space-y-3">
            {internships.map((intern) => (
              <div key={intern.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="font-medium">{intern.role}</h5>
                  {intern.is_verified && (
                    <Badge variant="default" className="text-xs gap-1">
                      <CheckCircle className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {intern.company_name}
                  {intern.duration_months ? ` • ${intern.duration_months} months` : ''}
                </p>
                <ul className="space-y-1 mt-2">
                  {intern.key_outcomes.map((outcome, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Award className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && internships.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Portfolio is published but has no content yet.</p>
        </div>
      )}
    </div>
  );
}
