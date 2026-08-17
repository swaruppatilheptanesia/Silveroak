import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  GraduationCap, 
  Building2, 
  MessageSquare, 
  Wrench,
  Users
} from "lucide-react";
import { formatEngagementDate, getEngagementTypeLabel } from '@/lib/employerModule';
import type { ApiEngagement } from '@/types/employer';

interface EngagementTimelineProps {
  engagements: ApiEngagement[];
}

const EngagementTimeline = ({ engagements }: EngagementTimelineProps) => {
  const getEngagementIcon = (type: ApiEngagement['visitor_type']) => {
    switch (type) {
      case 'placement':
        return <Briefcase className="h-4 w-4" />;
      case 'internship':
        return <GraduationCap className="h-4 w-4" />;
      case 'campus_visit':
        return <Building2 className="h-4 w-4" />;
      case 'guest_lecture':
        return <MessageSquare className="h-4 w-4" />;
      case 'workshop':
        return <Wrench className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const getEngagementColor = (type: ApiEngagement['visitor_type']) => {
    switch (type) {
      case 'placement':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
      case 'internship':
        return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
      case 'campus_visit':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
      case 'guest_lecture':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400';
      case 'workshop':
        return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (engagements.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No engagement history yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Add the first engagement record to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-6">
        {engagements.map((engagement) => (
          <div key={engagement.id} className="relative flex gap-4">
            {/* Icon */}
            <div className={`relative z-10 h-12 w-12 rounded-full flex items-center justify-center ${getEngagementColor(engagement.visitor_type)}`}>
              {getEngagementIcon(engagement.visitor_type)}
            </div>

            {/* Content */}
            <div className="flex-1 bg-card border rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="secondary">{getEngagementTypeLabel(engagement.visitor_type)}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatEngagementDate(engagement.date)}
                </span>
                {engagement.academic_year && (
                  <Badge variant="outline">{engagement.academic_year}</Badge>
                )}
              </div>

              <p className="text-sm">{engagement.remarks || 'No remarks added.'}</p>

              {(engagement.students_hired || engagement.packages_offered) && (
                <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t">
                  {engagement.students_hired ? (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">{engagement.students_hired}</span> students hired
                      </span>
                    </div>
                  ) : null}
                  {engagement.packages_offered ? (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Package: <span className="font-medium">{engagement.packages_offered}</span>
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EngagementTimeline;
