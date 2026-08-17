import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, FileCheck, Loader2, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GlobalPolicyCard } from '@/components/policies/GlobalPolicyCard';
import { usePolicies } from '@/hooks/use-policy-api';
import { getPolicyErrorMessage } from '@/lib/policyModule';

type PolicyGateLocationState = {
  from?: string;
};

/**
 * Mandatory acceptance of all GLOBAL policies, gating a student's access to the portal at
 * registration (and whenever a new global policy appears). Forwards to the photo gate once
 * every global policy is accepted.
 */
export default function StudentPolicyGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as PolicyGateLocationState | null;
  const next = locationState?.from && locationState.from !== '/student/policy-gate'
    ? locationState.from
    : '/student/access';

  const policiesQuery = usePolicies({
    global: true,
    limit: 100,
    sort_by: 'effective_date',
    sort_order: 'desc',
  });

  const policies = policiesQuery.data?.data ?? [];
  const pending = useMemo(() => policies.filter((policy) => !policy.accepted_current), [policies]);
  const allAccepted = !policiesQuery.isLoading && pending.length === 0;

  // Once nothing is pending (none exist, or all accepted) move on to the photo gate.
  useEffect(() => {
    if (allAccepted) {
      navigate(next, { replace: true });
    }
  }, [allAccepted, navigate, next]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader className="space-y-3 border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">Accept placement policies</CardTitle>
                <CardDescription>
                  You must read and accept the following policies before you can use the student portal.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            {policiesQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Loading the policies you need to accept…</p>
              </div>
            ) : policiesQuery.error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to load policies</AlertTitle>
                <AlertDescription>
                  {getPolicyErrorMessage(policiesQuery.error, 'Please refresh and try again.')}
                </AlertDescription>
              </Alert>
            ) : allAccepted ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                <p>All policies accepted. Redirecting…</p>
              </div>
            ) : (
              <>
                <Alert>
                  <FileCheck className="h-4 w-4" />
                  <AlertTitle>{pending.length} {pending.length === 1 ? 'policy' : 'policies'} pending</AlertTitle>
                  <AlertDescription>
                    Read each policy, tick the acceptance box, and choose Accept. Access unlocks once all are accepted.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  {policies.map((policy) => (
                    <GlobalPolicyCard key={policy.id} policy={policy} />
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button disabled={pending.length > 0} onClick={() => navigate(next, { replace: true })}>
                    Continue
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
