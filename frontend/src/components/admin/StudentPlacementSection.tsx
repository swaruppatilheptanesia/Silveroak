import { useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { useReopenStudentPlacement } from '@/hooks/use-admin-api';
import { formatDateTime } from '@/lib/formatters';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import type { ApiAdminStudent, ReopenPlacementInput } from '@/types/admin';

interface StudentPlacementSectionProps {
  studentId: string;
  studentName?: string;
  placement: ApiAdminStudent['placement'];
  postingTypeOptOuts: ApiAdminStudent['posting_type_opt_outs'];
  history: ApiAdminStudent['placement_pref_history'];
  onUpdatedStudent?: (student: ApiAdminStudent) => void;
}

type PendingReopen =
  | { scope: 'global' }
  | { scope: 'posting_type'; posting_type_master_id: string; label: string };

export function StudentPlacementSection({
  studentId,
  studentName,
  placement,
  postingTypeOptOuts,
  history,
  onUpdatedStudent,
}: StudentPlacementSectionProps) {
  const reopen = useReopenStudentPlacement();
  const [pending, setPending] = useState<PendingReopen | null>(null);

  const optedOut = placement?.opted_out ?? false;

  async function handleReopen(data: ReopenPlacementInput) {
    try {
      const updated = await reopen.mutateAsync({ studentId, data });
      onUpdatedStudent?.(updated);
      toast.success('Placement reopened.');
      setPending(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reopen placement.');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Students can opt out themselves; only the T&amp;P office can re-enable (reopen) placement.
      </p>

      {/* Global status */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Overall placement:</span>
        <Badge variant={optedOut ? 'warning' : 'success'}>{optedOut ? 'Opted out' : 'Interested'}</Badge>
      </div>

      {optedOut ? (
        <Alert variant="destructive">
          <AlertTitle>Opted out of all placement</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>
              {placement.reason ? <span>{placement.reason}</span> : <span>No reason recorded.</span>}
              {placement.opted_out_at ? (
                <span className="block text-xs">Opted out on {formatDateTime(placement.opted_out_at)}</span>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPending({ scope: 'global' })}
              disabled={reopen.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reopen placement
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-sm text-muted-foreground">This student is participating in placement.</p>
      )}

      {/* Per-posting-type opt-outs */}
      {postingTypeOptOuts.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Posting types opted out</p>
          {postingTypeOptOuts.map((item) => (
            <div
              key={item.posting_type_master_id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{formatPostingTypeLabel(item.label)}</p>
                {item.reason ? <p className="text-muted-foreground">{item.reason}</p> : null}
                <p className="text-xs text-muted-foreground">Opted out on {formatDateTime(item.updated_at)}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setPending({
                    scope: 'posting_type',
                    posting_type_master_id: item.posting_type_master_id,
                    label: item.label,
                  })
                }
                disabled={reopen.isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reopen
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Change history */}
      {history.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4 text-primary" />
            Change history
          </p>
          <div className="space-y-1">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={entry.interested ? 'success' : 'warning'}>
                    {entry.interested ? 'Reopened' : 'Opted out'}
                  </Badge>
                  <span className="font-medium">
                    {entry.scope === 'global'
                      ? 'Placement (all)'
                      : formatPostingTypeLabel(entry.posting_type_label ?? '')}
                  </span>
                  {entry.reason ? <span className="text-muted-foreground">— {entry.reason}</span> : null}
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <ConfirmActionDialog
        open={Boolean(pending)}
        onOpenChange={(open) => (open ? undefined : setPending(null))}
        title={
          pending?.scope === 'posting_type'
            ? `Reopen ${formatPostingTypeLabel(pending.label)}?`
            : 'Reopen placement?'
        }
        description={
          pending?.scope === 'posting_type'
            ? `${studentName ?? 'The student'} will be able to apply and register interest for this posting type again.`
            : `${studentName ?? 'The student'} will be able to apply and register interest again.`
        }
        confirmLabel="Reopen"
        isPending={reopen.isPending}
        onConfirm={() => {
          if (!pending) return;
          if (pending.scope === 'global') {
            void handleReopen({ scope: 'global' });
          } else {
            void handleReopen({ scope: 'posting_type', posting_type_master_id: pending.posting_type_master_id });
          }
        }}
      />
    </div>
  );
}
