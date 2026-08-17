import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Gift,
  IndianRupee,
  Loader2,
  MapPin,
  PartyPopper,
  Search,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PostingTypeBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyApplications, useWithdrawApplication } from '@/hooks/use-application-api';
import { useAcceptOffer, useMyOffers } from '@/hooks/use-offer-api';
import { RejectMyOfferDialog } from '@/components/offers/RejectMyOfferDialog';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { getOfferLifecycleState } from '@/lib/offerModule';
import { APPLICATION_STAGE_CONFIG, MOCK_ROUND_RESULT_CONFIG, type ApplicationStage } from '@/types/application';
import { JOINING_STATUS_CONFIG, OFFER_STATUS_CONFIG } from '@/types/offer';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function MyApplicationsSkeleton() {
  return (
    <DashboardLayout
      title="My Applications"
      subtitle="Loading your live application and offer history"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-7 w-56 bg-muted" />
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
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function MyApplications() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState<string>('all');
  const [offerFilter, setOfferFilter] = useState<string>('all');
  const [pendingAction, setPendingAction] = useState<
    | { type: 'withdraw'; id: string; title: string }
    | null
  >(null);
  const deferredSearch = useDeferredValue(searchTerm);

  const applicationsQuery = useMyApplications();
  const offersQuery = useMyOffers();
  const postingTypeOptions = usePostingTypeOptions();
  const withdrawApplication = useWithdrawApplication();
  const acceptOffer = useAcceptOffer();
  const [rejectOfferId, setRejectOfferId] = useState<string | null>(null);
  const [rejectOfferMeta, setRejectOfferMeta] = useState<{ company?: string; role?: string }>({});

  const applications = applicationsQuery.data ?? [];
  const offers = offersQuery.data ?? [];
  const joinedOffer = offers.find((offer) => offer.joining_status === 'joined');
  const blockingOffer = offers.find((offer) => offer.applications_blocked);
  const studentBlocked = Boolean(blockingOffer);

  async function handleAcceptOffer(offerId: string) {
    try {
      await acceptOffer.mutateAsync(offerId);
      toast.success('Offer accepted.');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to accept the offer.'));
    }
  }

  const filteredApplications = useMemo(() => {
    return applications.filter((application) => {
      if (stageFilter !== 'all' && application.current_stage !== stageFilter) return false;
      if (postingTypeFilter !== 'all' && application.posting.type !== postingTypeFilter) return false;

      if (deferredSearch) {
        const query = deferredSearch.toLowerCase();
        const fields = [
          application.posting.title,
          application.posting.company.name,
          application.current_stage,
        ];
        if (!fields.some((field) => field.toLowerCase().includes(query))) {
          return false;
        }
      }

      return true;
    });
  }, [applications, deferredSearch, stageFilter, postingTypeFilter]);

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      return offerFilter === 'all' || getOfferLifecycleState(offer) === offerFilter;
    });
  }, [offerFilter, offers]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applications.length };
    Object.keys(APPLICATION_STAGE_CONFIG).forEach((stage) => {
      counts[stage] = applications.filter((application) => application.current_stage === stage).length;
    });
    return counts;
  }, [applications]);

  const offerCounts = useMemo(() => {
    const counts: Record<string, number> = { all: offers.length };
    Object.keys(OFFER_STATUS_CONFIG).forEach((status) => {
      counts[status] = offers.filter((offer) => getOfferLifecycleState(offer) === status).length;
    });
    return counts;
  }, [offers]);

  const openApplications = applications.filter((application) =>
    !['offer_released', 'rejected'].includes(application.current_stage)
  ).length;

  if (applicationsQuery.isLoading || offersQuery.isLoading) {
    return <MyApplicationsSkeleton />;
  }

  if (applicationsQuery.error) {
    return (
      <DashboardLayout
        title="My Applications"
        subtitle="Your application history could not be loaded"
      >
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load applications</AlertTitle>
          <AlertDescription>
            {getErrorMessage(applicationsQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  async function handleWithdraw(applicationId: string, postingTitle: string) {
    setPendingAction({ type: 'withdraw', id: applicationId, title: postingTitle });
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;

    try {
      if (pendingAction.type === 'withdraw') {
        await withdrawApplication.mutateAsync(pendingAction.id);
        toast.success('Application withdrawn successfully.');
      }
      setPendingAction(null);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to withdraw the application.'));
    }
  }

  return (
    <DashboardLayout
      title="My Applications"
      subtitle="Track your live applications, offers, and internship records"
    >
      <div className="space-y-6">
        {offersQuery.error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Offers loaded partially</AlertTitle>
            <AlertDescription>
              {getErrorMessage(offersQuery.error, 'Your offer summary could not be refreshed right now.')}
            </AlertDescription>
          </Alert>
        )}

        {joinedOffer && (
          <Alert>
            <PartyPopper className="h-4 w-4" />
            <AlertTitle>Congratulations on joining</AlertTitle>
            <AlertDescription>
              Your live offer record shows a confirmed joining outcome for {joinedOffer.company.name}.
            </AlertDescription>
          </Alert>
        )}

        {studentBlocked && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Applications are locked</AlertTitle>
            <AlertDescription>
              {blockingOffer?.company?.name && blockingOffer?.role
                ? `Your offer from ${blockingOffer.company.name} for ${blockingOffer.role} is on record. You can no longer apply to new postings or register interest in this cycle.`
                : 'Your offer record locks further applications and interest registrations for this placement cycle.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total applications"
            value={String(applications.length)}
            hint="Student application records"
          />
          <StatCard
            title="Active pipeline"
            value={String(openApplications)}
            hint="Not yet rejected or closed with offer"
          />
          <StatCard
            title="Offers"
            value={String(offers.length)}
            hint="Offer records tied to your profile"
          />
          <StatCard
            title="Accepted offers"
            value={String(offerCounts.accepted || 0)}
            hint="Offers released by TPO"
          />
        </div>

        <Tabs defaultValue="applications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
            <TabsTrigger value="offers">Offers ({offers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={stageFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => setStageFilter('all')}
              >
                All
                <Badge variant="secondary" className="ml-2 rounded-full px-1.5 py-0 text-xs">
                  {stageCounts.all}
                </Badge>
              </Button>
              {Object.entries(APPLICATION_STAGE_CONFIG)
                .sort(([, left], [, right]) => left.order - right.order)
                .map(([stage, config]) => (
                  <Button
                    key={stage}
                    variant={stageFilter === stage ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setStageFilter(stage)}
                  >
                    {config.label}
                    {(stageCounts[stage] || 0) > 0 && (
                      <Badge variant="secondary" className="ml-2 rounded-full px-1.5 py-0 text-xs">
                        {stageCounts[stage]}
                      </Badge>
                    )}
                  </Button>
                ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search by company, role, or stage..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Select value={postingTypeFilter} onValueChange={setPostingTypeFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="All Posting Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Posting Types</SelectItem>
                  {postingTypeOptions.options.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {filteredApplications.length === 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <EmptyState
                      icon={FileText}
                      title="No applications found"
                      description={
                        applications.length === 0
                          ? "You haven't applied to any postings yet."
                          : 'No applications match the selected filters.'
                      }
                      actionLabel="Browse opportunities"
                      onAction={() => { window.location.href = '/opportunities'; }}
                    />
                  </CardContent>
                </Card>
              ) : (
                filteredApplications.map((application) => {
                  const stageConfig = APPLICATION_STAGE_CONFIG[application.current_stage];
                  const canWithdraw = !['offer_released', 'rejected'].includes(application.current_stage);

                  return (
                    <Card key={application.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="h-4 w-4 shrink-0" />
                              <span>{application.posting.company.name}</span>
                            </div>
                            <h3 className="mt-2 text-lg font-semibold text-foreground">{application.posting.title}</h3>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <Badge variant="outline" className={stageConfig.color}>
                                {stageConfig.label}
                              </Badge>
                              {application.mock_round_result && (
                                <Badge variant="outline" className={MOCK_ROUND_RESULT_CONFIG[application.mock_round_result].color}>
                                  Mock: {MOCK_ROUND_RESULT_CONFIG[application.mock_round_result].label}
                                </Badge>
                              )}
                              <PostingTypeBadge status={application.posting.type} />
                              <Badge variant="secondary">{application.posting.status}</Badge>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">{stageConfig.description}</p>
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Applied {formatDate(application.applied_at)}
                              </span>
                              {application.mock_round_result && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Mock result recorded
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 lg:items-end">
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/opportunities/${application.posting.id}`}>
                                View Posting
                                <ExternalLink className="ml-2 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            {canWithdraw && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={withdrawApplication.isPending}
                                onClick={() => handleWithdraw(application.id, application.posting.title)}
                              >
                                {withdrawApplication.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Withdraw
                              </Button>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Updated stage: {stageConfig.label}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="offers" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={offerFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => setOfferFilter('all')}
              >
                All
                <Badge variant="secondary" className="ml-2 rounded-full px-1.5 py-0 text-xs">
                  {offerCounts.all}
                </Badge>
              </Button>
              {Object.entries(OFFER_STATUS_CONFIG).map(([status, config]) => (
                <Button
                  key={status}
                  variant={offerFilter === status ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setOfferFilter(status)}
                >
                  {config.label}
                  {(offerCounts[status] || 0) > 0 && (
                    <Badge variant="secondary" className="ml-2 rounded-full px-1.5 py-0 text-xs">
                      {offerCounts[status]}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {filteredOffers.length === 0 ? (
              <Card>
                <CardContent className="p-0">
                  <EmptyState
                    icon={Gift}
                    title="No offers found"
                    description={offers.length === 0 ? 'You have not received any offers yet.' : 'No offers match the selected filter.'}
                    compact={offers.length > 0}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredOffers.map((offer) => {
                  const lifecycleState = getOfferLifecycleState(offer);
                  const statusConfig = OFFER_STATUS_CONFIG[lifecycleState];
                  return (
                    <Card key={offer.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="h-4 w-4 shrink-0" />
                              <span>{offer.company.name}</span>
                            </div>
                            <h3 className="mt-2 text-lg font-semibold text-foreground">{offer.role}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{offer.posting.title}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <Badge variant="outline" className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                              <PostingTypeBadge status={offer.posting.type} />
                              <Badge variant="outline" className={JOINING_STATUS_CONFIG[offer.joining_status].color}>
                                Joining: {JOINING_STATUS_CONFIG[offer.joining_status].label}
                              </Badge>
                              {offer.applications_blocked && (
                                <Badge variant="destructive">Applications Blocked</Badge>
                              )}
                              {offer.is_locked && <Badge variant="warning">Locked</Badge>}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Offered {formatDate(offer.offer_date)}
                              </span>
                              {(offer.ctc || offer.stipend) && (
                                <span className="flex items-center gap-1">
                                  <IndianRupee className="h-4 w-4" />
                                  {offer.ctc || offer.stipend}
                                </span>
                              )}
                              {offer.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {offer.location}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 lg:items-end">
                            {offer.status === 'pending_student_action' ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => void handleAcceptOffer(offer.id)}
                                  disabled={acceptOffer.isPending}
                                >
                                  {acceptOffer.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                  )}
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={acceptOffer.isPending}
                                  onClick={() => {
                                    setRejectOfferId(offer.id);
                                    setRejectOfferMeta({
                                      company: offer.company.name,
                                      role: offer.role,
                                    });
                                  }}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            ) : null}
                            <Badge variant="outline">{statusConfig.description}</Badge>
                            <span className="text-xs text-muted-foreground">
                              Last visible state: {statusConfig.label}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Card className="bg-muted/50">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Released offers are shown here as accepted. Admin-side rejection, joining verification, and compliance controls remain part of the dedicated Offers module.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ConfirmActionDialog
          open={Boolean(pendingAction)}
          onOpenChange={(open) => {
            if (!open) setPendingAction(null);
          }}
          title={pendingAction ? `Withdraw "${pendingAction.title}"?` : 'Confirm action'}
          description="This action cannot be undone."
          confirmLabel="Withdraw Application"
          confirmVariant="destructive"
          isPending={withdrawApplication.isPending}
          onConfirm={handleConfirmAction}
        />

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
      </div>
    </DashboardLayout>
  );
}
