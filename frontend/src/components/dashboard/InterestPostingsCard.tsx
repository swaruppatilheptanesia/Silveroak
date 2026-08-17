import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Building2, Clock, IdCard, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePostings } from '@/hooks/use-posting-api';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import { getPostingTypeInterestComparisonKey } from '@/lib/studentModule';
import type { ApiPostingListItem } from '@/types/posting';
import type { ApiInterest } from '@/types/student';

interface InterestPostingsCardProps {
  interests: ApiInterest[];
}

const VISIBLE_LIMIT = 5;

export function InterestPostingsCard({ interests }: InterestPostingsCardProps) {
  const postingsQuery = usePostings({
    status: 'published',
    limit: 50,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const interestKeys = new Set(
    interests.map((interest) => getPostingTypeInterestComparisonKey(interest.interest_type)),
  );

  const matched = (postingsQuery.data?.data ?? []).filter((posting) =>
    interestKeys.has(getPostingTypeInterestComparisonKey(posting.type)),
  );

  const visible = matched.slice(0, VISIBLE_LIMIT);
  const hiddenCount = Math.max(0, matched.length - visible.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Postings</CardTitle>
        <CardDescription>
          Open opportunities matching the interests you've registered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {postingsQuery.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-24 w-full bg-muted" />
            ))}
          </div>
        ) : interests.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Register an interest above to see matching open postings here.
          </p>
        ) : matched.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No open postings match your registered interests right now. Check back soon.
          </p>
        ) : (
          <>
            {visible.map((posting) => (
              <PostingRow key={posting.id} posting={posting} />
            ))}
            {hiddenCount > 0 && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/opportunities">
                  View {hiddenCount} more {hiddenCount === 1 ? 'opportunity' : 'opportunities'}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PostingRow({ posting }: { posting: ApiPostingListItem }) {
  const compensation = posting.ctc?.trim() || posting.stipend?.trim() || null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div>
          <p className="font-medium text-foreground">{posting.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {posting.company.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip icon={<Briefcase className="h-3 w-3" />}>
            {formatPostingTypeLabel(posting.type)}
          </Chip>
          {posting.role_name && (
            <Chip icon={<IdCard className="h-3 w-3" />}>{posting.role_name}</Chip>
          )}
          {posting.duration && (
            <Chip icon={<Clock className="h-3 w-3" />}>{posting.duration}</Chip>
          )}
          {compensation && (
            <Chip icon={<IndianRupee className="h-3 w-3" />}>{compensation}</Chip>
          )}
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="shrink-0">
        <Link to={`/opportunities/${posting.id}`}>
          View Details
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Badge variant="secondary" className="gap-1 font-normal">
      {icon}
      {children}
    </Badge>
  );
}
