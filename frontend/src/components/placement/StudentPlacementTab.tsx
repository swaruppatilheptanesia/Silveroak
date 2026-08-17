import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ChevronDown, ChevronUp, History, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PlacementOptOutDialog } from '@/components/placement/PlacementOptOutDialog';
import {
  usePlacementPreferences,
  useUpdateGlobalPlacementOptOut,
  useUpdatePostingTypePreference,
} from '@/hooks/use-student-api';
import { formatApiErrorMessage } from '@/lib/apiError';
import { formatDateTime } from '@/lib/formatters';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import type { PlacementPostingTypePreference } from '@/types/student';

export function StudentPlacementTab() {
  const prefsQuery = usePlacementPreferences();
  const updateGlobal = useUpdateGlobalPlacementOptOut();
  const updatePostingType = useUpdatePostingTypePreference();

  const [globalOptOutOpen, setGlobalOptOutOpen] = useState(false);
  const [typeOptOut, setTypeOptOut] = useState<PlacementPostingTypePreference | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const prefs = prefsQuery.data;
  const globalOptedOut = prefs?.global.opted_out ?? false;

  // Re-enabling (reopen) is TPO-admin-only — students may opt out but not opt back in.
  async function optOutGlobal(reason?: string) {
    try {
      await updateGlobal.mutateAsync({ opted_out: true, reason });
      toast.success('Opted out of placement.');
      setGlobalOptOutOpen(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update placement preference.'));
    }
  }

  async function optOutPostingType(item: PlacementPostingTypePreference, reason?: string) {
    try {
      await updatePostingType.mutateAsync({
        posting_type_master_id: item.posting_type_master_id,
        interested: false,
        reason,
      });
      toast.success(`Opted out of ${formatPostingTypeLabel(item.value)}.`);
      setTypeOptOut(null);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update preference.'));
    }
  }

  if (prefsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading placement preferences…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (prefsQuery.error || !prefs) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load placement preferences</AlertTitle>
        <AlertDescription>
          {formatApiErrorMessage(prefsQuery.error, 'Please refresh and try again.')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global opt-out */}
      <Card>
        <CardHeader>
          <CardTitle>Placement participation</CardTitle>
          <CardDescription>
            Turn this off if you are not interested in placement at all. Once you opt out, only the
            T&amp;P office can re-enable it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <div className="min-w-0">
              <p className="font-medium text-foreground">Interested in placement</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {globalOptedOut
                  ? 'You have opted out of placement entirely. Postings stay visible but you cannot apply or register interest.'
                  : 'You are participating in placement. Manage individual posting types below.'}
              </p>
              {globalOptedOut && prefs.global.reason ? (
                <p className="mt-2 text-sm">
                  <span className="font-medium text-foreground">Reason:</span>{' '}
                  <span className="text-muted-foreground">{prefs.global.reason}</span>
                </p>
              ) : null}
              {globalOptedOut && prefs.global.updated_at ? (
                <p className="mt-1 text-xs text-muted-foreground">Opted out on {formatDateTime(prefs.global.updated_at)}</p>
              ) : null}
              {globalOptedOut ? (
                <p className="mt-2 text-xs font-medium text-amber-600">
                  Contact your T&amp;P office to re-enable placement.
                </p>
              ) : null}
            </div>
            <Switch
              checked={!globalOptedOut}
              disabled={globalOptedOut || updateGlobal.isPending}
              onCheckedChange={(checked) => {
                if (!checked) setGlobalOptOutOpen(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Per posting type */}
      <Card>
        <CardHeader>
          <CardTitle>Posting types</CardTitle>
          <CardDescription>
            Choose which posting types you want to participate in. Turning one off keeps those postings visible
            but blocks applying / registering interest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {globalOptedOut ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Placement is turned off</AlertTitle>
              <AlertDescription>
                Your overall placement is opted out. Contact your T&amp;P office to re-enable it before
                managing individual posting types.
              </AlertDescription>
            </Alert>
          ) : null}

          {prefs.posting_types.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posting types are configured yet.</p>
          ) : (
            prefs.posting_types.map((item) => (
              <div
                key={item.posting_type_master_id}
                className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{formatPostingTypeLabel(item.value)}</p>
                    {!item.interested ? <Badge variant="warning">Opted out</Badge> : null}
                  </div>
                  {!item.interested && item.reason ? (
                    <p className="mt-1 text-sm">
                      <span className="font-medium text-foreground">Reason:</span>{' '}
                      <span className="text-muted-foreground">{item.reason}</span>
                    </p>
                  ) : null}
                  {!item.interested && item.updated_at ? (
                    <p className="mt-1 text-xs text-muted-foreground">Opted out on {formatDateTime(item.updated_at)}</p>
                  ) : null}
                  {!item.interested ? (
                    <p className="mt-1 text-xs font-medium text-amber-600">
                      Contact your T&amp;P office to re-enable this posting type.
                    </p>
                  ) : null}
                </div>
                <Switch
                  checked={item.interested}
                  disabled={globalOptedOut || !item.interested || updatePostingType.isPending}
                  onCheckedChange={(checked) => {
                    if (!checked) setTypeOptOut(item);
                  }}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* History */}
      {prefs.history.length > 0 ? (
        <Card>
          <Collapsible open={showHistory} onOpenChange={setShowHistory}>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex w-full items-center justify-between gap-2 text-left">
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Change history
                  </CardTitle>
                  {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-2">
                {prefs.history.map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={entry.interested ? 'success' : 'warning'}>
                        {entry.interested ? 'Enabled' : 'Opted out'}
                      </Badge>
                      <span className="font-medium text-foreground">
                        {entry.scope === 'global'
                          ? 'Placement (all)'
                          : formatPostingTypeLabel(entry.posting_type_label ?? '')}
                      </span>
                      {entry.reason ? <span className="text-muted-foreground">— {entry.reason}</span> : null}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</span>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ) : null}

      {/* Dialogs — opt-out only; re-enabling is TPO-admin-only */}
      <PlacementOptOutDialog
        open={globalOptOutOpen}
        onOpenChange={setGlobalOptOutOpen}
        title="Opt out of placement?"
        description="You will not be able to apply or register interest for any posting. Only the T&P office can re-enable it afterwards."
        isPending={updateGlobal.isPending}
        onConfirm={(reason) => optOutGlobal(reason)}
      />

      <PlacementOptOutDialog
        open={Boolean(typeOptOut)}
        onOpenChange={(open) => (open ? undefined : setTypeOptOut(null))}
        title={typeOptOut ? `Opt out of ${formatPostingTypeLabel(typeOptOut.value)}?` : 'Opt out?'}
        description="These postings stay visible but you won't be able to apply or register interest. Only the T&P office can re-enable it afterwards."
        isPending={updatePostingType.isPending}
        onConfirm={(reason) => typeOptOut && optOutPostingType(typeOptOut, reason)}
      />
    </div>
  );
}
