import { CheckCircle2, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { GlobalPolicyCard } from '@/components/policies/GlobalPolicyCard';
import { usePolicies } from '@/hooks/use-policy-api';
import { getPolicyErrorMessage } from '@/lib/policyModule';

/**
 * Student My Profile → Policies tab. Lists global policies with their accepted/pending status
 * and lets the student accept any pending ones (single-checkbox flow). Mirrors the registration gate.
 */
export function StudentPoliciesTab() {
  const policiesQuery = usePolicies({
    global: true,
    limit: 100,
    sort_by: 'effective_date',
    sort_order: 'desc',
  });

  const policies = policiesQuery.data?.data ?? [];
  const pendingCount = policies.filter((policy) => !policy.accepted_current).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Placement policies
            </CardTitle>
            <CardDescription>
              Read and accept the placement policies. You must accept all of them to stay eligible for placements.
            </CardDescription>
          </div>
          {!policiesQuery.isLoading && policies.length > 0 ? (
            pendingCount === 0 ? (
              <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> All accepted
              </span>
            ) : (
              <span className="text-sm font-medium text-amber-600">
                {pendingCount} pending
              </span>
            )
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {policiesQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading policies…
          </div>
        ) : policiesQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load policies</AlertTitle>
            <AlertDescription>
              {getPolicyErrorMessage(policiesQuery.error, 'Please refresh and try again.')}
            </AlertDescription>
          </Alert>
        ) : policies.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No policies published yet"
            description="There are no placement policies to accept right now."
            compact
          />
        ) : (
          policies.map((policy) => <GlobalPolicyCard key={policy.id} policy={policy} />)
        )}
      </CardContent>
    </Card>
  );
}
