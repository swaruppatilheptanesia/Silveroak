import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  IndianRupee,
  MapPin,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ApplyDialog } from '@/components/opportunities/ApplyDialog';
import { PostingTypePolicyDialog } from '@/components/policies/PostingTypePolicyDialog';
import { MatchIndicator } from '@/components/opportunities/MatchIndicator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMyApplications } from '@/hooks/use-application-api';
import { useMyNocs } from '@/hooks/use-noc-api';
import { useMyOffers } from '@/hooks/use-offer-api';
import { usePostingDetail, usePostings } from '@/hooks/use-posting-api';
import { usePlacementPreferences, useStudentInterests, useStudentProfile, useStudentResumes } from '@/hooks/use-student-api';
import { formatCGPA, formatDate, formatDateTime } from '@/lib/formatters';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import {
  evaluatePostingForStudent,
  isPostingApplicationOpen,
  selectRecommendedPostings,
} from '@/lib/postingModule';
import { OFFER_STATUS_CONFIG } from '@/types/offer';
import { getPostingTypeLabel, getWorkModeLabel } from '@/services/postingService';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function OpportunityDetailSkeleton() {
  return (
    <DashboardLayout
      title="Opportunity Details"
      subtitle="Loading live posting information"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-64 bg-muted" />
            <Skeleton className="mt-3 h-4 w-80 bg-muted" />
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full bg-muted" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-72 w-full bg-muted" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function OpportunityDetail() {
  const { opportunityId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [policyGateOpen, setPolicyGateOpen] = useState(false);

  const postingQuery = usePostingDetail(opportunityId ?? '');
  const recommendedPostingsQuery = usePostings({
    limit: 100,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const profileQuery = useStudentProfile();
  const resumesQuery = useStudentResumes();
  const placementPrefsQuery = usePlacementPreferences();
  const applicationsQuery = useMyApplications();
  const myOffersQuery = useMyOffers();
  const myNocsQuery = useMyNocs();
  const interestsQuery = useStudentInterests();
  const postingData = postingQuery.data;
  const profileData = profileQuery.data;
  const postingPreview = postingData ?? null;
  const student = profileData?.student ?? null;
  const academic = profileData?.academic ?? null;
  const skills = profileData?.skills ?? null;
  const resumes = resumesQuery.data ?? [];
  const postingOffers = postingData?.offers ?? [];
  const highlightedOfferId = searchParams.get('offerId');
  const sortedPostingOffers = useMemo(() => {
    if (postingOffers.length === 0 || !highlightedOfferId) {
      return postingOffers;
    }

    return [...postingOffers].sort((left, right) => {
      if (left.id === highlightedOfferId) return -1;
      if (right.id === highlightedOfferId) return 1;
      return 0;
    });
  }, [highlightedOfferId, postingOffers]);
  const highlightedOffer = highlightedOfferId
    ? sortedPostingOffers.find((offer) => offer.id === highlightedOfferId) ?? null
    : null;
  const alreadyApplied = postingPreview
    ? (applicationsQuery.data ?? []).some((application) => application.posting.id === postingPreview.id)
    : false;
  const applicationOpen = postingPreview ? isPostingApplicationOpen(postingPreview) : false;
  const studentContext = useMemo(() => ({
    institute: student?.institute ?? '',
    course: student?.course ?? '',
    semester: academic?.semester ?? null,
    department: student?.department ?? '',
    batch: student?.batch ?? '',
    cgpa: academic?.cgpa ?? null,
    backlog_count: academic?.backlog_count ?? 0,
    technical_skills: skills?.technical_skills ?? [],
    domain_interests: skills?.domain_interests ?? [],
    policy_accepted: student?.policy_accepted ?? false,
  }), [
    academic?.backlog_count,
    academic?.cgpa,
    academic?.semester,
    skills?.domain_interests,
    skills?.technical_skills,
    student?.course,
    student?.batch,
    student?.department,
    student?.institute,
    student?.policy_accepted,
  ]);

  const evaluation = useMemo(() => {
    if (!postingPreview) {
      return {
        eligible: false,
        reasons: ['The opportunity details could not be loaded.'],
        matchPercentage: 0,
      };
    }

    if (!student) {
      return {
        eligible: false,
        reasons: ['Student profile data could not be loaded.'],
        matchPercentage: 0,
      };
    }

    return evaluatePostingForStudent(postingPreview, studentContext);
  }, [postingPreview, student, studentContext]);

  const recommendedPostingIds = useMemo(() => {
    if (!student) {
      return new Set<string>();
    }

    const postings = recommendedPostingsQuery.data?.data ?? [];
    const recommendedPostings = selectRecommendedPostings(
      postings.map((posting) => ({
        posting,
        eligibility: evaluatePostingForStudent(posting, studentContext),
        applicationOpen: isPostingApplicationOpen(posting),
      }))
    );

    return new Set(recommendedPostings.map((item) => item.posting.id));
  }, [recommendedPostingsQuery.data?.data, student, studentContext]);

  const readinessReasons = useMemo(() => {
    const reasons = [...evaluation.reasons];

    if (!student) {
      reasons.push('Your student profile is required before the application flow can proceed.');
    } else {
      if (student.profile_completion_percentage < 80) {
        reasons.push('Complete at least 80% of your profile before applying.');
      }
      if (!student.policy_accepted) {
        reasons.push('Accept the placement policy before applying.');
      }
    }

    if (!resumesQuery.isLoading && !resumesQuery.error && resumes.length === 0) {
      reasons.push('Upload at least one resume before applying.');
    }

    if (alreadyApplied) {
      reasons.push('You have already applied to this opportunity.');
    }

    if (!applicationOpen) {
      reasons.push('The application window is currently closed.');
    }

    if ((myOffersQuery.data?.length ?? 0) > 0) {
      reasons.push('You already have an offer on record; applications are locked.');
    }

    // Placement opt-out (global or for this posting's type) blocks applying — posting stays visible.
    const placementPrefs = placementPrefsQuery.data;
    if (placementPrefs?.global.opted_out) {
      reasons.push('You have opted out of placement. Re-enable it in Profile → Placement to apply.');
    } else if (placementPrefs && postingData?.posting_type_master_id) {
      const typePref = placementPrefs.posting_types.find(
        (item) => item.posting_type_master_id === postingData.posting_type_master_id,
      );
      if (typePref && !typePref.interested) {
        reasons.push(
          `You have opted out of ${getPostingTypeLabel(postingData.type)} placements — re-enable it in Profile → Placement to apply.`,
        );
      }
    }

    // A non-rejected self-sourced (self-placed) NOC for this posting type blocks applying to it.
    if (postingData?.type) {
      const postingTypeKey = postingData.type.trim().toLowerCase();
      const hasSelfPlacedNoc = (myNocsQuery.data ?? []).some(
        (noc) =>
          noc.placement_source === 'self_sourced' &&
          noc.status !== 'rejected' &&
          noc.program.trim().toLowerCase() === postingTypeKey,
      );
      if (hasSelfPlacedNoc) {
        reasons.push('You have a self-placed NOC for this posting type, so applications for it are blocked.');
      }
    }

    // Registering interest now requires TPO approval — a pending registration cannot apply yet.
    if (postingData?.type) {
      const postingTypeKey = postingData.type.trim().toLowerCase();
      const registration = (interestsQuery.data ?? []).find(
        (interest) =>
          interest.status !== 'withdrawn' &&
          interest.interest_type.trim().toLowerCase() === postingTypeKey,
      );
      if (registration && registration.status !== 'approved') {
        reasons.push('Your registration for this program is pending TPO approval — you can apply once it is approved.');
      }
    }

    return Array.from(new Set(reasons));
  }, [alreadyApplied, applicationOpen, evaluation.reasons, interestsQuery.data, myNocsQuery.data, myOffersQuery.data, placementPrefsQuery.data, postingData, resumes.length, resumesQuery.error, resumesQuery.isLoading, student]);

  const canApply = readinessReasons.length === 0;
  const showReadyBanner = canApply && !alreadyApplied;

  function getInitials(name: string | null | undefined) {
    if (!name) return 'NA';

    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || 'NA';
  }

  if (postingQuery.isLoading) {
    return <OpportunityDetailSkeleton />;
  }

  if (postingQuery.error || !postingData) {
    return (
      <DashboardLayout
        title="Opportunity Details"
        subtitle="This posting could not be loaded"
      >
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load the opportunity</AlertTitle>
          <AlertDescription>
            {getErrorMessage(postingQuery.error, 'The posting may have been removed or is no longer accessible.')}
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/opportunities')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to opportunities
        </Button>
      </DashboardLayout>
    );
  }

  const posting = postingData;

  return (
    <DashboardLayout
      title="Opportunity Details"
      subtitle="Review the opportunity details and check your application readiness"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Button variant="ghost" size="icon" onClick={() => navigate('/opportunities')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{posting.role_name}</h1>
              <Badge variant="outline">{getPostingTypeLabel(posting.type)}</Badge>
              {recommendedPostingIds.has(posting.id) && <Badge variant="warning"><Sparkles className="mr-1 h-3 w-3" />Recommended</Badge>}
              {alreadyApplied && <Badge variant="success">Applied</Badge>}
            </div>
            <p className="mt-2 text-muted-foreground">
              {posting.company.name}
              {posting.company.industry ? ` • ${posting.company.industry}` : ''}
              {` • ${posting.academic_year}`}
            </p>
          </div>
          <Button
            disabled={!canApply}
            onClick={() => setPolicyGateOpen(true)}
          >
            <Send className="mr-2 h-4 w-4" />
            {alreadyApplied ? 'Application Submitted' : 'Apply Now'}
          </Button>
        </div>

        {profileQuery.error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Student profile loaded partially</AlertTitle>
            <AlertDescription>
              {getErrorMessage(profileQuery.error, 'Eligibility and application readiness may be incomplete.')}
            </AlertDescription>
          </Alert>
        )}

        {resumesQuery.error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Resume library loaded partially</AlertTitle>
            <AlertDescription>
              {getErrorMessage(resumesQuery.error, 'Resume selection may be unavailable until the next refresh.')}
            </AlertDescription>
          </Alert>
        )}

        {applicationsQuery.error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Previous applications could not be confirmed</AlertTitle>
            <AlertDescription>
              {getErrorMessage(applicationsQuery.error, 'If you already applied, you will not be able to submit a duplicate application.')}
            </AlertDescription>
          </Alert>
        )}

        {alreadyApplied ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Application already submitted</AlertTitle>
            <AlertDescription>
              This opportunity is already in your application history. Track future status changes from the applications module.
            </AlertDescription>
          </Alert>
        ) : showReadyBanner ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>You can apply right now</AlertTitle>
            <AlertDescription>
              Your profile, policy status, resume availability, and eligibility all look good for this opportunity.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Application currently unavailable</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-5">
                {readinessReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className={evaluation.eligible ? 'border-primary/30 bg-primary/5' : undefined}>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                {evaluation.eligible ? (
                  <CheckCircle className="mt-0.5 h-6 w-6 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-6 w-6 text-destructive" />
                )}
                <div>
                  <p className="font-semibold text-foreground">
                    {evaluation.eligible ? 'Eligible by posting criteria' : 'Not eligible by posting criteria'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your branch, batch, CGPA, and backlog count meet the listed eligibility criteria.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <MatchIndicator percentage={evaluation.matchPercentage} size="lg" />
                </div>
                <div className="max-w-40 text-right text-sm text-muted-foreground">
                  Match is based on your current skills, interests, and branch alignment.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Applications</p>
              <p className="mt-2 text-2xl font-semibold">{posting._count.applications}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Offers</p>
              <p className="mt-2 text-2xl font-semibold">{posting._count.offers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Min CGPA</p>
              <p className="mt-2 text-2xl font-semibold">{formatCGPA(posting.min_cgpa)}</p>
              {academic?.cgpa != null && (
                <p className="mt-1 text-xs text-muted-foreground">Your CGPA: {formatCGPA(academic.cgpa)}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Max Backlogs</p>
              <p className="mt-2 text-2xl font-semibold">{posting.max_backlogs}</p>
              {academic && (
                <p className="mt-1 text-xs text-muted-foreground">Your backlogs: {academic.backlog_count}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className={applicationOpen ? 'border-primary/30 bg-primary/5' : undefined}>
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Clock className={`mt-0.5 h-5 w-5 ${applicationOpen ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-semibold text-foreground">
                  {applicationOpen ? 'Applications are open' : 'Application window'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {posting.application_start_date && posting.application_end_date
                    ? `${formatDate(posting.application_start_date)} to ${formatDate(posting.application_end_date)}`
                    : 'This posting stays open while it remains published.'}
                </p>
              </div>
            </div>
            <Button disabled={!canApply} onClick={() => setPolicyGateOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              {alreadyApplied ? 'Application Submitted' : 'Apply Now'}
            </Button>
          </CardContent>
        </Card>

        {sortedPostingOffers.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {sortedPostingOffers.length === 1 ? 'Student Offered' : 'Students Offered'}
              </CardTitle>
              <CardDescription>
                {sortedPostingOffers.length === 1
                  ? 'This posting has been offered to the student below.'
                  : 'This posting has been offered to the students below.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedPostingOffers.map((offer) => {
                const student = offer.student;
                const statusConfig = OFFER_STATUS_CONFIG[offer.status];
                const isHighlighted = highlightedOffer?.id === offer.id;

                return (
                  <div
                    key={offer.id}
                    className={cn(
                      'flex flex-col gap-3 rounded-lg border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between',
                      isHighlighted ? 'border-primary bg-background/80' : 'bg-background',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 border border-border">
                        <AvatarImage
                          src={student.profile_photo_url ? resolveBackendAssetUrl(student.profile_photo_url) : undefined}
                          alt={student.full_name}
                        />
                        <AvatarFallback className="text-sm font-semibold">
                          {getInitials(student.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{student.full_name}</p>
                          {isHighlighted && <Badge variant="secondary">Opened from notification</Badge>}
                          <Badge variant="outline" className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {student.enrollment_number}
                          {student.department ? ` • ${student.department}` : ''}
                          {student.batch ? ` • Batch ${student.batch}` : ''}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Offered as {offer.role}
                          {offer.location ? ` • ${offer.location}` : ''}
                          {offer.offer_date ? ` • ${formatDate(offer.offer_date)}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company and Role Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium text-foreground">{posting.company.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium text-foreground">{posting.role_name}</p>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {(posting.locations?.length ?? 0) > 1 ? 'Locations' : 'Location'}
                  </p>
                  <p className="font-medium text-foreground">
                    {(posting.locations?.length ? posting.locations : [posting.location].filter(Boolean)).join(', ')}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Work mode</p>
                <Badge variant="outline">{getWorkModeLabel(posting.work_mode)}</Badge>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              {posting.ctc && (
                <div className="flex items-start gap-2">
                  <IndianRupee className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">CTC</p>
                    <p className="font-medium text-foreground">{posting.ctc}</p>
                  </div>
                </div>
              )}
              {posting.stipend && (
                <div className="flex items-start gap-2">
                  <IndianRupee className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Stipend</p>
                    <p className="font-medium text-foreground">{posting.stipend}</p>
                  </div>
                </div>
              )}
              {posting.duration && (
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium text-foreground">{posting.duration}</p>
                  </div>
                </div>
              )}
            </div>

            {posting.bond_details && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Bond details</p>
                  <p className="mt-1 text-sm text-foreground">{posting.bond_details}</p>
                </div>
              </>
            )}

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground">Role description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {posting.role_description || 'No additional role description has been provided for this posting yet.'}
              </p>
            </div>

            {(() => {
              const pdfUrls = posting.job_description_pdf_urls?.length
                ? posting.job_description_pdf_urls
                : [posting.job_description_pdf_url].filter((url): url is string => Boolean(url));
              if (pdfUrls.length === 0) return null;
              return (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {pdfUrls.length > 1 ? 'Job description PDFs' : 'Job description PDF'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pdfUrls.map((url, index) => (
                        <Button key={url} variant="outline" asChild>
                          <a href={resolveBackendAssetUrl(url)} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {posting.job_description_pdf_names?.[index] || (pdfUrls.length > 1 ? `View PDF ${index + 1}` : 'View PDF')}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Eligibility Criteria
            </CardTitle>
            <CardDescription>Make sure you meet these requirements before applying.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Eligible branches</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {posting.eligible_branches.length > 0 ? posting.eligible_branches.map((branch) => (
                    <Badge key={branch} variant="outline">{branch}</Badge>
                  )) : <Badge variant="secondary">Open to all branches</Badge>}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eligible batches</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {posting.eligible_batches.length > 0 ? posting.eligible_batches.map((batch) => (
                    <Badge key={batch} variant="secondary">{batch}</Badge>
                  )) : <Badge variant="secondary">Open to all batches</Badge>}
                </div>
              </div>
            </div>

            {posting.skill_requirements && (
              <div>
                <p className="text-sm text-muted-foreground">Skill requirements</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{posting.skill_requirements}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Selection Process
            </CardTitle>
            <CardDescription>Stages configured on the posting by the TPO team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              {posting.has_written_test ? (
                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">Written test</p>
                <p className="text-sm text-muted-foreground">
                  {posting.has_written_test
                    ? posting.written_test_details || 'Written round is part of the process.'
                    : 'No written test has been configured.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              {posting.has_gd ? (
                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">Group discussion</p>
                <p className="text-sm text-muted-foreground">
                  {posting.has_gd
                    ? posting.gd_details || 'Group discussion is part of the process.'
                    : 'No group discussion has been configured.'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Technical rounds</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{posting.technical_rounds}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">HR rounds</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{posting.hr_rounds}</p>
              </div>
            </div>

            {posting.additional_info && (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Additional information</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{posting.additional_info}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 p-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p>Published at: {posting.published_at ? formatDateTime(posting.published_at) : 'Not published yet'}</p>
              <p>Created: {formatDateTime(posting.created_at)}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/opportunities')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to opportunities
              </Button>
              <Button disabled={!canApply} onClick={() => setPolicyGateOpen(true)}>
                <Send className="mr-2 h-4 w-4" />
                {alreadyApplied ? 'Application Submitted' : 'Apply Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ApplyDialog
        open={applyDialogOpen}
        onOpenChange={setApplyDialogOpen}
        postingId={posting.id}
        opportunityTitle={posting.role_name}
        companyName={posting.company.name}
      />
      <PostingTypePolicyDialog
        open={policyGateOpen}
        onOpenChange={setPolicyGateOpen}
        postingTypeMasterId={posting.posting_type_master_id}
        postingTypeLabel={getPostingTypeLabel(posting.type)}
        onProceed={() => setApplyDialogOpen(true)}
      />
    </DashboardLayout>
  );
}
