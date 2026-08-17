import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';
import {
  OpportunityFilters,
  defaultFilters,
  type FilterState,
} from '@/components/opportunities/OpportunityFilters';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePostings } from '@/hooks/use-posting-api';
import { useStudentProfile, useStudentResumes } from '@/hooks/use-student-api';
import {
  evaluatePostingForStudent,
  extractCompensationNumber,
  isPostingApplicationOpen,
  selectRecommendedPostings,
} from '@/lib/postingModule';
import { toast } from 'sonner';

const STORAGE_KEY = 'opportunity-filter-preferences';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function OpportunitySkeleton() {
  return (
    <DashboardLayout
      title="Discover Opportunities"
      subtitle="Loading live job and internship postings"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-48 bg-muted" />
            <Skeleton className="mt-3 h-4 w-80 bg-muted" />
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 bg-muted" />
                <Skeleton className="mt-3 h-8 w-20 bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-32 bg-muted" />
                <Skeleton className="mt-3 h-4 w-40 bg-muted" />
                <Skeleton className="mt-5 h-24 w-full bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: typeof Briefcase;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getInitialFilters(): FilterState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultFilters;

    const parsed = JSON.parse(saved);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.search === 'string' &&
      typeof parsed.type === 'string' &&
      typeof parsed.workMode === 'string' &&
      Array.isArray(parsed.locations) &&
      Array.isArray(parsed.domains) &&
      typeof parsed.minStipend === 'number' &&
      typeof parsed.maxCtc === 'number'
    ) {
      return parsed as FilterState;
    }
  } catch {
    return defaultFilters;
  }

  return defaultFilters;
}

export default function Opportunities() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const profileQuery = useStudentProfile();
  const resumesQuery = useStudentResumes();
  const postingsQuery = usePostings({
    limit: 100,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const profileData = profileQuery.data;
  const profileStudent = profileData?.student ?? null;
  const profileAcademic = profileData?.academic ?? null;
  const profileSkills = profileData?.skills ?? null;
  const resumes = resumesQuery.data ?? [];
  const postings = useMemo(() => postingsQuery.data?.data ?? [], [postingsQuery.data?.data]);
  const profileCompletion = profileStudent?.profile_completion_percentage ?? 0;
  const canApplyByReadiness = Boolean(
    profileStudent &&
      profileCompletion >= 80 &&
      profileStudent.policy_accepted &&
      resumes.length > 0
  );

  const postingInsights = useMemo(() => {
    const context = {
      institute: profileStudent?.institute ?? '',
      course: profileStudent?.course ?? '',
      semester: profileAcademic?.semester ?? null,
      department: profileStudent?.department ?? '',
      batch: profileStudent?.batch ?? '',
      cgpa: profileAcademic?.cgpa ?? null,
      backlog_count: profileAcademic?.backlog_count ?? 0,
      technical_skills: profileSkills?.technical_skills ?? [],
      domain_interests: profileSkills?.domain_interests ?? [],
      policy_accepted: profileStudent?.policy_accepted ?? false,
    };

    return postings.map((posting) => ({
      posting,
      eligibility: evaluatePostingForStudent(posting, context),
      applicationOpen: isPostingApplicationOpen(posting),
      stipendValue: extractCompensationNumber(posting.stipend),
      ctcValue: extractCompensationNumber(posting.ctc),
    }));
  }, [
    postings,
    profileAcademic?.backlog_count,
    profileAcademic?.cgpa,
    profileAcademic?.semester,
    profileSkills?.domain_interests,
    profileSkills?.technical_skills,
    profileStudent?.course,
    profileStudent?.batch,
    profileStudent?.department,
    profileStudent?.institute,
    profileStudent?.policy_accepted,
  ]);

  const filteredPostings = useMemo(() => {
    return postingInsights.filter(({ posting, stipendValue, ctcValue }) => {
      const searchableFields = [
        posting.title,
        posting.role_name,
        posting.company.name,
        posting.company.industry ?? '',
        posting.location,
      ];

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!searchableFields.some((field) => field.toLowerCase().includes(searchLower))) {
          return false;
        }
      }

      if (filters.type !== 'all' && posting.type !== filters.type) return false;
      if (filters.workMode !== 'all' && posting.work_mode !== filters.workMode) return false;

      if (
        filters.locations.length > 0 &&
        !filters.locations.some((location) => posting.location.toLowerCase().includes(location.toLowerCase()))
      ) {
        return false;
      }

      if (
        filters.domains.length > 0 &&
        !filters.domains.some((domain) =>
          searchableFields.some((field) => field.toLowerCase().includes(domain.toLowerCase()))
        )
      ) {
        return false;
      }

      // Slider is in thousands (₹{minStipend}K/month); stipendValue is in rupees — convert to compare.
      if (filters.minStipend > 0 && (stipendValue == null || stipendValue < filters.minStipend * 1000)) {
        return false;
      }

      if (filters.maxCtc < 100 && ctcValue != null && ctcValue > filters.maxCtc) {
        return false;
      }

      return true;
    });
  }, [filters, postingInsights]);

  const recommendedPostings = useMemo(() => {
    return selectRecommendedPostings(postingInsights);
  }, [postingInsights]);
  const recommendedPostingIds = useMemo(
    () => new Set(recommendedPostings.map((item) => item.posting.id)),
    [recommendedPostings]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.locations.length > 0) count += filters.locations.length;
    if (filters.domains.length > 0) count += filters.domains.length;
    if (filters.minStipend > 0) count += 1;
    if (filters.maxCtc < 100) count += 1;
    return count;
  }, [filters]);

  const eligibleCount = postingInsights.filter(({ eligibility }) => eligibility.eligible).length;
  const openCount = postingInsights.filter(({ applicationOpen }) => applicationOpen).length;
  const partialErrors = [resumesQuery.error].filter(Boolean).map((error) => getErrorMessage(error));

  if (profileQuery.isLoading || postingsQuery.isLoading) {
    return <OpportunitySkeleton />;
  }

  if (profileQuery.error || !profileData) {
    return (
      <DashboardLayout
        title="Discover Opportunities"
        subtitle="Live opportunities could not be loaded"
      >
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load your student profile</AlertTitle>
          <AlertDescription>
            {getErrorMessage(profileQuery.error, 'Please log in again and retry.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  if (postingsQuery.error) {
    return (
      <DashboardLayout
        title="Discover Opportunities"
        subtitle="Live opportunities could not be loaded"
      >
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load postings</AlertTitle>
          <AlertDescription>
            {getErrorMessage(postingsQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const { student, academic, skills } = profileData;

  function handleSavePreferences() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    toast.success('Opportunity filters saved.');
  }

  function handleResetFilters() {
    setFilters(defaultFilters);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('Opportunity filters cleared.');
  }

  return (
    <DashboardLayout
      title="Discover Opportunities"
      subtitle="Browse jobs and internships available to you"
    >
      <div className="space-y-6">
        {partialErrors.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Some student data loaded partially</AlertTitle>
            <AlertDescription>{partialErrors[0]}</AlertDescription>
          </Alert>
        )}

        {!student.policy_accepted && (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Placement policy pending</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span>Accept the placement policy first before you start applying.</span>
              <div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/policy">Review policy</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {profileCompletion < 80 && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Profile completion is {profileCompletion}%</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span>You can browse opportunities now, but application submission is blocked until your profile reaches at least 80%.</span>
              <div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/profile">Complete profile</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!resumesQuery.isLoading && !resumesQuery.error && resumes.length === 0 && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Resume required before applying</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span>You need at least one uploaded resume before you can submit an application.</span>
              <div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/resumes">Upload resume</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Published postings"
            value={String(postings.length)}
            hint="Student-visible opportunities"
            icon={Briefcase}
          />
          <StatCard
            title="Eligible for you"
            value={String(eligibleCount)}
            hint="Based on branch, batch, CGPA, and backlogs"
            icon={CheckCircle2}
          />
          <StatCard
            title="Recommended"
            value={String(recommendedPostings.length)}
            hint="Strong profile match from live rules"
            icon={Sparkles}
          />
          <StatCard
            title="Open now"
            value={String(openCount)}
            hint="Currently accepting applications"
            icon={FileText}
          />
        </div>

        <Card className={canApplyByReadiness ? 'border-primary/30 bg-primary/5' : undefined}>
          <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">Application Readiness</h2>
                <Badge variant={canApplyByReadiness ? 'success' : 'warning'}>
                  {canApplyByReadiness ? 'Ready to apply' : 'Action needed'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Live application submission checks your profile completion, policy acceptance, resume availability, and posting eligibility.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <span>Profile: {profileCompletion}%</span>
              <span>Policy: {student.policy_accepted ? 'Accepted' : 'Pending'}</span>
              <span>Resumes: {resumes.length}</span>
            </div>
          </CardContent>
        </Card>

        {recommendedPostings.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Recommended for You
                <Badge variant="secondary">{recommendedPostings.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {recommendedPostings.map(({ posting, eligibility }) => (
                  <OpportunityCard
                    key={posting.id}
                    posting={posting}
                    matchPercentage={eligibility.matchPercentage}
                    isRecommended
                    isEligible={eligibility.eligible}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <OpportunityFilters
          filters={filters}
          onFiltersChange={setFilters}
          onSavePreferences={handleSavePreferences}
          onResetFilters={handleResetFilters}
          activeFilterCount={activeFilterCount}
        />

        {postings.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Briefcase}
                title="No opportunities to show yet"
                description="Opportunities appear here only for Posting Types you have enrolled in. Register your interest in a Posting Type on your Dashboard to start seeing its postings."
                actionLabel="Register interest on Dashboard"
                onAction={() => navigate('/')}
              />
            </CardContent>
          </Card>
        ) : filteredPostings.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Briefcase}
                title="No opportunities match your filters"
                description="Try broadening your search or clearing some filters."
                actionLabel="Clear filters"
                onAction={handleResetFilters}
              />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="eligible" className="w-full">
            <TabsList>
              <TabsTrigger value="eligible">
                Eligible ({filteredPostings.filter(({ eligibility }) => eligibility.eligible).length})
              </TabsTrigger>
              <TabsTrigger value="all">All ({filteredPostings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="eligible" className="mt-4">
              {filteredPostings.filter(({ eligibility }) => eligibility.eligible).length === 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <EmptyState
                      icon={Briefcase}
                      title="No eligible opportunities in this filtered set"
                      description="Try the All tab to see the full list, or update your filters."
                      compact
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredPostings
                    .filter(({ eligibility }) => eligibility.eligible)
                    .map(({ posting, eligibility }) => (
                      <OpportunityCard
                        key={posting.id}
                        posting={posting}
                        matchPercentage={eligibility.matchPercentage}
                        isEligible={eligibility.eligible}
                        isRecommended={recommendedPostingIds.has(posting.id)}
                      />
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredPostings.map(({ posting, eligibility }) => (
                  <OpportunityCard
                    key={posting.id}
                    posting={posting}
                    matchPercentage={eligibility.matchPercentage}
                    isEligible={eligibility.eligible}
                    isRecommended={recommendedPostingIds.has(posting.id)}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
