import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  IndianRupee,
  Loader2,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useOfferDetail, useUpdateCompliance } from '@/hooks/use-offer-api';
import {
  formatOfferAuditAction,
  getDefaultApplicationsBlocked,
  getOfferCompensation,
  getOfferLifecycleState,
  isJoiningPending,
} from '@/lib/offerModule';
import { formatDate, formatDateTime } from '@/lib/formatters';
import {
  COMPLIANCE_STATUS_CONFIG,
  JOINING_STATUS_CONFIG,
  OFFER_STATUS_CONFIG,
  REJECTION_REASONS,
  type ComplianceStatus,
} from '@/types/offer';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';

interface OfferDetailSheetProps {
  offerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReject?: (offerId: string) => void;
  onUpdateJoining?: (offerId: string) => void;
  /** Read-only view (e.g. faculty): hides admin write controls (reject / update joining / edit compliance). */
  readOnly?: boolean;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function OfferDetailSheet({
  offerId,
  isOpen,
  onClose,
  onReject,
  onUpdateJoining,
  readOnly = false,
}: OfferDetailSheetProps) {
  const detailQuery = useOfferDetail(isOpen && offerId ? offerId : '');
  const updateCompliance = useUpdateCompliance();
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>('compliant');
  const [applicationsBlocked, setApplicationsBlocked] = useState(false);

  useEffect(() => {
    if (!detailQuery.data) return;
    setComplianceStatus(detailQuery.data.compliance_status);
    setApplicationsBlocked(detailQuery.data.applications_blocked);
  }, [detailQuery.data]);

  async function handleSaveCompliance() {
    if (!detailQuery.data) return;

    try {
      await updateCompliance.mutateAsync({
        offerId: detailQuery.data.id,
        data: {
          compliance_status: complianceStatus,
          applications_blocked: applicationsBlocked,
        },
      });
      toast.success('Compliance updated successfully.');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update compliance.'));
    }
  }

  const offer = detailQuery.data;
  const lifecycleKey = offer ? getOfferLifecycleState(offer) : null;
  const lifecycleConfig = lifecycleKey ? OFFER_STATUS_CONFIG[lifecycleKey] : null;
  const joiningConfig = offer ? JOINING_STATUS_CONFIG[offer.joining_status] : null;
  const complianceConfig = COMPLIANCE_STATUS_CONFIG[complianceStatus];
  const complianceChanged = Boolean(
    offer &&
      (offer.compliance_status !== complianceStatus ||
        offer.applications_blocked !== applicationsBlocked)
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full pr-0 sm:max-w-xl">
        <SheetHeader className="px-6">
          <SheetTitle>Offer Details</SheetTitle>
          <SheetDescription>
            {readOnly
              ? 'Review the offer details, lifecycle, and audit history.'
              : 'Review the live offer lifecycle, update compliance, and inspect audit history.'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-110px)] px-6">
          {!offerId ? (
            <div className="py-8 text-sm text-muted-foreground">Select an offer to view its details.</div>
          ) : detailQuery.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading offer detail...
            </div>
          ) : detailQuery.error || !offer ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {getErrorMessage(detailQuery.error, 'Unable to load the offer details.')}
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="flex flex-wrap items-center gap-2">
                {lifecycleConfig && (
                  <Badge variant="outline" className={lifecycleConfig.color}>
                    {lifecycleConfig.label}
                  </Badge>
                )}
                {joiningConfig && (
                  <Badge variant="outline" className={joiningConfig.color}>
                    Joining: {joiningConfig.label}
                  </Badge>
                )}
                <Badge variant="outline" className={COMPLIANCE_STATUS_CONFIG[offer.compliance_status].color}>
                  {COMPLIANCE_STATUS_CONFIG[offer.compliance_status].label}
                </Badge>
                {offer.is_locked && <Badge variant="secondary">Locked</Badge>}
              </div>

              {!readOnly && (
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap gap-2">
                    {offer.status === 'pending_student_action' && onReject && (
                      <Button variant="destructive" size="sm" onClick={() => onReject(offer.id)}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject Offer
                      </Button>
                    )}
                    {isJoiningPending(offer) && onUpdateJoining && (
                      <Button variant="outline" size="sm" onClick={() => onUpdateJoining(offer.id)}>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Update Joining
                      </Button>
                    )}
                  </div>
                  {(offer.status === 'pending_student_action' || isJoiningPending(offer)) && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Admin actions stay live from this drawer. Other updates refresh automatically after mutation.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Student
                </h4>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-semibold text-foreground">{offer.student.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {offer.student.enrollment_number} • {offer.student.department}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Offer Information
                </h4>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Company</p>
                    <p className="font-medium text-foreground">{offer.company.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Posting</p>
                    <p className="font-medium text-foreground">{offer.posting.title}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Role</p>
                    <p className="font-medium text-foreground">{offer.role}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <IndianRupee className="h-3 w-3" />
                      Compensation
                    </p>
                    <p className="font-medium text-foreground">{getOfferCompensation(offer)}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      Location
                    </p>
                    <p className="font-medium text-foreground">{offer.location || '—'}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Offer Date
                    </p>
                    <p className="font-medium text-foreground">{formatDate(offer.offer_date)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Lifecycle</h4>
                <div className="grid gap-3 rounded-lg bg-muted/30 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Current status</span>
                    {lifecycleConfig && (
                      <Badge variant="outline" className={lifecycleConfig.color}>
                        {lifecycleConfig.label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Joining status</span>
                    {joiningConfig && (
                      <Badge variant="outline" className={joiningConfig.color}>
                        {joiningConfig.label}
                      </Badge>
                    )}
                  </div>
                  {offer.accepted_at && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Accepted at</span>
                      <span className="text-foreground">{formatDateTime(offer.accepted_at)}</span>
                    </div>
                  )}
                  {offer.joining_date && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Joining date</span>
                      <span className="text-foreground">{formatDate(offer.joining_date)}</span>
                    </div>
                  )}
                </div>

                {offer.status === 'rejected_by_admin' && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
                    <p className="font-medium text-destructive">Rejection Details</p>
                    <p className="mt-1 text-muted-foreground">
                      {offer.rejection_reason
                        ? REJECTION_REASONS[offer.rejection_reason] ?? offer.rejection_reason
                        : 'No reason recorded.'}
                    </p>
                    {offer.rejection_remarks && (
                      <p className="mt-2 text-muted-foreground">{offer.rejection_remarks}</p>
                    )}
                    {offer.rejected_at && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Recorded on {formatDateTime(offer.rejected_at)}
                        {offer.rejected_by ? ` by ${offer.rejected_by}` : ''}
                      </p>
                    )}
                  </div>
                )}

                {offer.joining_status === 'did_not_join' && offer.dnj_reason && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
                    <p className="font-medium text-destructive">Did Not Join Reason</p>
                    <p className="mt-1 text-muted-foreground">{offer.dnj_reason}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  {applicationsBlocked ? (
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                  )}
                  Compliance
                </h4>

                <div className="rounded-lg border border-border p-4">
                  <div className="grid gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Compliance Status</p>
                      <p className="text-xs text-muted-foreground">
                        {complianceConfig.description}
                      </p>
                    </div>

                    {!readOnly && (
                      <>
                        <Select
                          value={complianceStatus}
                          onValueChange={(value) => {
                            const nextStatus = value as ComplianceStatus;
                            setComplianceStatus(nextStatus);
                            setApplicationsBlocked(getDefaultApplicationsBlocked(nextStatus));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select compliance status" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(COMPLIANCE_STATUS_CONFIG).map(([status, config]) => (
                              <SelectItem key={status} value={status}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">Block applications</p>
                            <p className="text-xs text-muted-foreground">
                              Toggle whether this offer blocks further applications.
                            </p>
                          </div>
                          <Switch
                            checked={applicationsBlocked}
                            onCheckedChange={setApplicationsBlocked}
                          />
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Current status</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={COMPLIANCE_STATUS_CONFIG[offer.compliance_status].color}>
                          {COMPLIANCE_STATUS_CONFIG[offer.compliance_status].label}
                        </Badge>
                        <Badge variant={offer.applications_blocked ? 'destructive' : 'secondary'}>
                          {offer.applications_blocked ? 'Applications Blocked' : 'Applications Open'}
                        </Badge>
                      </div>
                    </div>

                    {!readOnly && (
                      <Button
                        onClick={handleSaveCompliance}
                        disabled={!complianceChanged || updateCompliance.isPending}
                      >
                        {updateCompliance.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Compliance
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Audit Trail
                </h4>
                {offer.audit_trail.length === 0 ? (
                  <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
                    No audit activity recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {offer.audit_trail.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-border p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{formatOfferAuditAction(entry.action)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(entry.performed_at)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Actor: {entry.performed_by || 'System'}
                        </p>
                        {entry.details && (
                          <p className="mt-2 text-foreground">{entry.details}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
