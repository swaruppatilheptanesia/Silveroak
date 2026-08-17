import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  FileText,
  GraduationCap,
  Gift,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  UserCircle2,
  XCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InterestPostingsCard } from '@/components/dashboard/InterestPostingsCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useMasterValues } from '@/hooks/use-master-api';
import {
  useRegisterInterests,
  useStudentCertifications,
  useStudentInterests,
  useStudentProfile,
  useStudentProjects,
  useStudentResumes,
} from '@/hooks/use-student-api';
import { useAcceptOffer, useMyOffers } from '@/hooks/use-offer-api';
import { RejectMyOfferDialog } from '@/components/offers/RejectMyOfferDialog';
import { PostingTypePolicyDialog } from '@/components/policies/PostingTypePolicyDialog';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { formatCGPA, formatDate, formatDateTime, formatPhoneNumber, getInitials } from '@/lib/formatters';
import {
  getPostingTypeInterestLabel,
  getPostingTypeInterestComparisonKey,
  getPostingTypeInterestOptions,
  resolveBackendAssetUrl,
} from '@/lib/studentModule';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function DashboardSkeleton() {
  return (
    <DashboardLayout
      title="Student Dashboard"
      subtitle="Loading your placement overview"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full bg-muted" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-56 bg-muted" />
                <Skeleton className="h-4 w-72 bg-muted" />
                <Skeleton className="h-2 w-full bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 bg-muted" />
                <Skeleton className="mt-3 h-8 w-20 bg-muted" />
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
  icon: typeof GraduationCap;
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

export default function Dashboard() {
  const profileQuery = useStudentProfile();
  const resumesQuery = useStudentResumes();
  const projectsQuery = useStudentProjects();
  const certificationsQuery = useStudentCertifications();
  const interestsQuery = useStudentInterests();
  const postingTypeValuesQuery = useMasterValues('posting_type');
  const registerInterests = useRegisterInterests();
  const myOffersQuery = useMyOffers();
  const acceptOffer = useAcceptOffer();
  const [rejectOfferId, setRejectOfferId] = useState<string | null>(null);
  const [rejectOfferMeta, setRejectOfferMeta] = useState<{ company?: string; role?: string }>({});
  const postingTypeOptionsResult = usePostingTypeOptions();
  const [interestGate, setInterestGate] = useState<{ value: string; label: string; masterId: string | null } | null>(null);

  if (profileQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (profileQuery.error || !profileQuery.data) {
    return (
      <DashboardLayout
        title="Student Dashboard"
        subtitle="Your placement overview could not be loaded"
      >
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Unable to load student profile</AlertTitle>
          <AlertDescription>
            {getErrorMessage(profileQuery.error, 'Please log in again and retry.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const { student, academic, skills } = profileQuery.data;
  const resumes = resumesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const certifications = certificationsQuery.data ?? [];
  const interests = interestsQuery.data ?? [];
  const profileCompletion = student.profile_completion_percentage;
  const defaultResume = resumes.find((resume) => resume.is_default);
  // Registration status per posting type (pending/approved only — a withdrawn row is NOT counted as
  // registered; it is surfaced separately below as a locked status the student cannot act on).
  const interestStatusByKey = new Map(
    interests
      .filter((interest) => interest.status !== 'withdrawn')
      .map((interest) => [getPostingTypeInterestComparisonKey(interest.interest_type), interest] as const)
  );
  // Withdrawn-by-TPO rows: shown to the student as a locked "Withdrawn" status + audit message; the
  // student cannot re-register (the backend registerInterests throws INTEREST_WITHDRAWN).
  const withdrawnInterestByKey = new Map(
    interests
      .filter((interest) => interest.status === 'withdrawn')
      .map((interest) => [getPostingTypeInterestComparisonKey(interest.interest_type), interest] as const)
  );
  const registeredInterestBadges = Array.from(interestStatusByKey.values()).map((interest) => ({
    value: interest.interest_type,
    status: interest.status,
  }));
  const postingTypeOptions = getPostingTypeInterestOptions(postingTypeValuesQuery.data);
  // Application Receiving OFF → the type stays listed but its Register button is disabled.
  // Keyed by the same comparison key the interest list renders on.
  const acceptingByPostingTypeKey = new Map(
    postingTypeOptionsResult.options.map((option) => [
      getPostingTypeInterestComparisonKey(option.value),
      option.acceptingApplications,
    ])
  );
  const readinessItems = [
    {
      label: 'Personal details completed',
      done: Boolean(
        student.full_name &&
          student.mobile &&
          student.date_of_birth &&
          student.gender &&
          student.residential_address
      ),
    },
    {
      label: 'Academic record added',
      done: Boolean(
        academic &&
          (academic.cgpa != null ||
            academic.tenth_percentage != null ||
            academic.twelfth_percentage != null)
      ),
    },
    {
      label: 'Skills profile updated',
      done: Boolean(
        skills &&
          ((skills.technical_skills?.length ?? 0) > 0 || (skills.domain_interests?.length ?? 0) > 0)
      ),
    },
    {
      label: 'Resume uploaded',
      done: resumes.length > 0,
    },
    {
      label: 'At least one project added',
      done: projects.length > 0,
    },
    {
      label: 'Placement policy accepted',
      done: student.policy_accepted,
    },
  ];

  const secondaryErrorMessages = [
    resumesQuery.error,
    projectsQuery.error,
    certificationsQuery.error,
    interestsQuery.error,
    postingTypeValuesQuery.error,
  ]
    .filter(Boolean)
    .map((error) => getErrorMessage(error));

  const myOffers = myOffersQuery.data ?? [];
  const pendingOffers = myOffers.filter((offer) => offer.status === 'pending_student_action');
  const pendingOffer = pendingOffers[0] ?? null;
  const remainingPending = Math.max(0, pendingOffers.length - 1);
  const hasAnyOffer = myOffers.length > 0;
  const offerBlockReason = hasAnyOffer
    ? 'You already have an offer on record; applications are locked.'
    : null;

  async function handleAcceptPendingOffer(offerId: string) {
    try {
      await acceptOffer.mutateAsync(offerId);
      toast.success('Offer accepted.');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to accept the offer.'));
    }
  }

  async function handleRegisterInterest(postingTypeValue: string, displayLabel: string) {
    if (offerBlockReason) {
      toast.error(offerBlockReason);
      return;
    }
    try {
      await registerInterests.mutateAsync({ interest_types: [postingTypeValue] });
      toast.success(`${displayLabel} registered successfully.`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to register interest.'));
    }
  }

  // Map a posting-type value → its master id (to fetch the linked policy for the gate).
  function resolvePostingTypeMasterId(value: string): string | null {
    const options = postingTypeOptionsResult.options ?? [];
    const direct = options.find((option) => option.value === value);
    if (direct) return direct.id;
    const normalized = getPostingTypeInterestComparisonKey(value);
    return options.find((option) => getPostingTypeInterestComparisonKey(option.value) === normalized)?.id ?? null;
  }

  // Open the posting-type policy gate; on accept it proceeds to register interest.
  function openInterestGate(postingTypeValue: string, displayLabel: string) {
    if (offerBlockReason) {
      toast.error(offerBlockReason);
      return;
    }
    setInterestGate({ value: postingTypeValue, label: displayLabel, masterId: resolvePostingTypeMasterId(postingTypeValue) });
  }

  return (
    <DashboardLayout
      title="Student Dashboard"
      subtitle="Your live profile, readiness, and interest registration status"
    >
      <div className="space-y-6">
        {pendingOffer ? (
          <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-600" />
                You have a new offer to act on
              </CardTitle>
              <CardDescription>
                Review the offer below and choose to accept or reject. Rejection is permanent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Briefcase className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="font-medium">{pendingOffer.company.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <UserCircle2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Role</p>
                    <p className="font-medium">{pendingOffer.role}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{pendingOffer.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {pendingOffer.type === 'job' ? 'CTC' : 'Stipend'}
                  </p>
                  <p className="font-medium">
                    {pendingOffer.type === 'job'
                      ? pendingOffer.ctc ?? '—'
                      : pendingOffer.stipend ?? '—'}
                  </p>
                </div>
                {pendingOffer.location ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{pendingOffer.location}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-muted-foreground">Offer date</p>
                  <p className="font-medium">{formatDate(pendingOffer.offer_date)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void handleAcceptPendingOffer(pendingOffer.id)}
                  disabled={acceptOffer.isPending}
                >
                  {acceptOffer.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Accept Offer
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setRejectOfferId(pendingOffer.id);
                    setRejectOfferMeta({ company: pendingOffer.company.name, role: pendingOffer.role });
                  }}
                  disabled={acceptOffer.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/applications">View in My Applications</Link>
                </Button>
              </div>
              {remainingPending > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {remainingPending} more pending offer{remainingPending === 1 ? '' : 's'} —{' '}
                  <Link to="/applications" className="underline">
                    open My Applications to act on them
                  </Link>
                  .
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {secondaryErrorMessages.length > 0 && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Some student sections loaded partially</AlertTitle>
            <AlertDescription>
              {secondaryErrorMessages[0]}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border border-border">
                  <AvatarImage
                    src={student.profile_photo_url ? resolveBackendAssetUrl(student.profile_photo_url) : undefined}
                    alt={student.full_name}
                  />
                  <AvatarFallback className="text-lg font-semibold">
                    {getInitials(student.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-foreground">{student.full_name}</h2>
                    <Badge variant="outline">
                      {student.roll_number || student.enrollment_number}
                    </Badge>
                    <Badge variant={student.policy_accepted ? 'success' : 'warning'}>
                      {student.policy_accepted ? 'Policy Accepted' : 'Policy Pending'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      {student.email}
                    </span>
                    {student.mobile && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4" />
                        {formatPhoneNumber(student.mobile)}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {student.department} • {student.batch}
                    </span>
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile completion</p>
                    <p className="text-sm text-muted-foreground">
                      Keep your profile updated to improve opportunity matching.
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-foreground">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="h-2.5" />
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/profile">
                      Update Profile
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/resumes">Manage Resumes</Link>
                  </Button>
                  {!student.policy_accepted && (
                    <Button variant="outline" asChild>
                    <Link to="/policy">Accept Policy</Link>
                  </Button>
                )}
              </div>
            </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Current CGPA"
            value={formatCGPA(academic?.cgpa)}
            hint={academic?.semester ? `Semester ${academic.semester}` : 'Add academic details'}
            icon={GraduationCap}
          />
          <StatCard
            title="Resumes"
            value={String(resumes.length)}
            hint={defaultResume ? `Default: ${defaultResume.name}` : 'Upload your first resume'}
            icon={FileText}
          />
          <StatCard
            title="Projects"
            value={String(projects.length)}
            hint={projects.length > 0 ? 'Profile projects are visible' : 'Add at least one project'}
            icon={BookOpen}
          />
          <StatCard
            title="Certifications"
            value={String(certifications.length)}
            hint={certifications.length > 0 ? 'Certificates added' : 'Showcase extra credentials'}
            icon={Award}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Interest Registration</CardTitle>
              <CardDescription>
                Register the programs you want to be considered for.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {postingTypeValuesQuery.isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-20 w-full bg-muted" />
                  ))}
                </div>
              ) : postingTypeOptions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No interest programs are available yet. Please check back once the placement cell publishes posting types.
                </p>
              ) : (
                <div className="space-y-3">
                  {postingTypeOptions.map((option) => {
                    const registrationKey = getPostingTypeInterestComparisonKey(option.value);
                    const registrationStatus = interestStatusByKey.get(registrationKey)?.status;
                    const withdrawnInterest = withdrawnInterestByKey.get(registrationKey);
                    const isWithdrawn = Boolean(withdrawnInterest);
                    const isApproved = registrationStatus === 'approved';
                    const isPending = registrationStatus === 'pending';
                    const isRegistered = isApproved || isPending;
                    // Missing entry = accepting (covers pre-migration rows / any not in the options map).
                    const isAccepting = acceptingByPostingTypeKey.get(registrationKey) !== false;
                    const withdrawnMessage = withdrawnInterest
                      ? `You have been withdrawn from this Posting Type by TPO Admin${
                          withdrawnInterest.reviewed_at ? ` on ${formatDateTime(withdrawnInterest.reviewed_at)}` : ''
                        }${withdrawnInterest.reviewed_by_name ? ` by ${withdrawnInterest.reviewed_by_name}` : ''}.`
                      : undefined;
                    const disabledReason = isWithdrawn
                      ? 'You have been withdrawn from this posting type by the TPO cell. Contact the TPO cell to be reinstated.'
                      : isPending
                        ? 'Your registration is awaiting TPO approval.'
                        : !isAccepting
                          ? 'Applications are currently closed for this posting type.'
                          : offerBlockReason ?? undefined;

                    return (
                      <div
                        key={option.value}
                        className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{option.label}</p>
                            {isWithdrawn && <Badge variant="destructive">Withdrawn</Badge>}
                            {!isWithdrawn && isApproved && <Badge variant="success">Registered</Badge>}
                            {!isWithdrawn && isPending && <Badge variant="warning">Pending approval</Badge>}
                            {!isWithdrawn && !isAccepting && <Badge variant="secondary">Applications closed</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                          {isWithdrawn && withdrawnMessage && (
                            <p className="mt-1 text-xs font-medium text-destructive">{withdrawnMessage}</p>
                          )}
                          {isWithdrawn && withdrawnInterest?.status_reason && (
                            <p className="mt-0.5 text-xs italic text-muted-foreground">Reason: {withdrawnInterest.status_reason}</p>
                          )}
                          {!isWithdrawn && isPending && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Waiting for the TPO cell to approve your registration. You can apply once it is approved.
                            </p>
                          )}
                          {!isWithdrawn && !isAccepting && !isRegistered && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Registration is paused for this posting type. Please check back later.
                            </p>
                          )}
                        </div>
                        <Button
                          variant={isRegistered || isWithdrawn ? 'outline' : 'default'}
                          size="sm"
                          disabled={
                            isWithdrawn ||
                            isRegistered ||
                            !isAccepting ||
                            registerInterests.isPending ||
                            Boolean(offerBlockReason)
                          }
                          title={disabledReason}
                          onClick={() => openInterestGate(option.value, option.label)}
                        >
                          {isWithdrawn ? 'Withdrawn' : isApproved ? 'Already registered' : isPending ? 'Pending approval' : 'Register'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {registeredInterestBadges.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">Registered interests</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {registeredInterestBadges.map((interest) => (
                      <Badge
                        key={interest.value}
                        variant={interest.status === 'approved' ? 'success' : 'warning'}
                      >
                        {getPostingTypeInterestLabel(interest.value)}
                        {interest.status === 'pending' ? ' · Pending' : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Readiness Checklist</CardTitle>
                <CardDescription>
                  Complete these items to stay ready for upcoming opportunities.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {readinessItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${item.done ? 'text-emerald-500' : 'text-muted-foreground'}`}
                    />
                    <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Snapshot</CardTitle>
                <CardDescription>
                  A quick view of the details currently available in your profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">Program</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {student.institute || 'Institute pending'} • {student.course || 'Course pending'}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">Academic standing</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {academic?.cgpa != null ? `CGPA ${formatCGPA(academic.cgpa)}` : 'CGPA not added'}
                    {academic ? ` • Active backlogs ${academic.active_backlogs}` : ''}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">Latest profile activity</p>
                  <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {resumes[0] && <p>Latest resume uploaded on {formatDate(resumes[0].uploaded_at)}</p>}
                    {projects[0] && <p>Latest project added on {formatDate(projects[0].created_at)}</p>}
                    {certifications[0] && (
                      <p>Latest certification added on {formatDate(certifications[0].created_at)}</p>
                    )}
                    {!resumes[0] && !projects[0] && !certifications[0] && (
                      <EmptyState
                        icon={UserCircle2}
                        title="No recent student activity"
                        description="Start by updating your profile, adding a project, or uploading a resume."
                        compact
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <InterestPostingsCard interests={interests} />
      </div>

      <RejectMyOfferDialog
        open={Boolean(rejectOfferId)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectOfferId(null);
            setRejectOfferMeta({});
          }
        }}
        offerId={rejectOfferId}
        companyName={rejectOfferMeta.company}
        role={rejectOfferMeta.role}
      />
      <PostingTypePolicyDialog
        open={interestGate !== null}
        onOpenChange={(open) => {
          if (!open) setInterestGate(null);
        }}
        postingTypeMasterId={interestGate?.masterId}
        postingTypeLabel={interestGate?.label}
        onProceed={() => {
          if (interestGate) void handleRegisterInterest(interestGate.value, interestGate.label);
        }}
      />
    </DashboardLayout>
  );
}
