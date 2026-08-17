import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  MapPin, 
  Calendar, 
  IndianRupee, 
  Briefcase,
  Clock,
  Sparkles,
  CheckCircle,
  XCircle
} from "lucide-react";
import { getPostingTypeLabel, getWorkModeLabel } from '@/services/postingService';
import { formatDate } from "@/lib/formatters";
import { isPostingApplicationOpen } from "@/lib/postingModule";
import type { ApiPostingListItem } from "@/types/posting";
import { Link } from "react-router-dom";

interface OpportunityCardProps {
  posting: ApiPostingListItem;
  matchPercentage?: number;
  isRecommended?: boolean;
  isEligible?: boolean;
}

export function OpportunityCard({ 
  posting, 
  matchPercentage, 
  isRecommended = false,
  isEligible = true 
}: OpportunityCardProps) {
  const applicationOpen = isPostingApplicationOpen(posting);
  const applicationLabel = posting.application_end_date
    ? `${applicationOpen ? 'Deadline' : 'Closed'}: ${formatDate(posting.application_end_date)}`
    : applicationOpen
      ? 'Open while published'
      : 'Currently closed';

  return (
      <Card className={`hover:shadow-md transition-shadow ${!isEligible ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">{posting.role_name}</h3>
              {isRecommended && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 shrink-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Recommended
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{posting.company.name}</span>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0">
            {getPostingTypeLabel(posting.type)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-3">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{posting.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            <span>{getWorkModeLabel(posting.work_mode)}</span>
          </div>
          {posting.ctc && (
            <div className="flex items-center gap-1">
              <IndianRupee className="h-3.5 w-3.5" />
              <span>{posting.ctc}</span>
            </div>
          )}
          {posting.stipend && (
            <div className="flex items-center gap-1">
              <IndianRupee className="h-3.5 w-3.5" />
              <span>{posting.stipend}</span>
            </div>
          )}
        </div>

        {posting.duration && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{posting.duration}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {posting.eligible_branches.slice(0, 3).map((branch) => (
            <Badge key={branch} variant="secondary" className="text-xs">
              {branch}
            </Badge>
          ))}
          {posting.eligible_branches.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{posting.eligible_branches.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {isEligible ? (
              <div className="flex items-center gap-1 text-green-600 text-xs">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Eligible</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <XCircle className="h-3.5 w-3.5" />
                <span>Not Eligible</span>
              </div>
            )}
            {matchPercentage !== undefined && (
              <Badge variant="outline" className="text-xs">
                Profile {matchPercentage}%
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{applicationLabel}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild variant="outline" className="w-full">
          <Link to={`/opportunities/${posting.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
