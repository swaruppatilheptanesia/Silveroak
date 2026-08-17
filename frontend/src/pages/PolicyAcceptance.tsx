import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileCheck,
  FileText,
  Shield,
  User,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { usePolicyDetail, usePolicies } from '@/hooks/use-policy-api';
import { useAcceptPolicy, useStudentProfile } from '@/hooks/use-student-api';
import { formatDate, formatDateTime } from '@/lib/formatters';
import {
  getPolicyCategoryMeta,
  getPolicyErrorMessage,
  hasPolicyRichTextContent,
  sanitizePolicyRichTextHtml,
} from '@/lib/policyModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import type { ApiPolicyDetail, ApiPolicyListItem } from '@/types/policy';

const consentItems = [
  {
    id: 'profile_sharing_consent',
    icon: User,
    title: 'Profile Sharing',
    description: 'I consent to sharing my profile, academics, and skills with recruiting companies.',
  },
  {
    id: 'resume_sharing_consent',
    icon: FileText,
    title: 'Resume Sharing',
    description: 'I consent to sharing my uploaded resumes for shortlisting and hiring decisions.',
  },
  {
    id: 'data_storage_consent',
    icon: Database,
    title: 'Data Storage',
    description: 'I understand that my placement records may be stored for analytics, audits, and accreditation.',
  },
  {
    id: 'communication_consent',
    icon: Shield,
    title: 'Communication',
    description: 'I consent to placement communication through email, phone, SMS, and in-app notices.',
  },
] as const;

function PolicySkeleton() {
  return (
    <DashboardLayout
      title="Placement Policy"
      subtitle="Loading your consent status"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-56 bg-muted" />
            <Skeleton className="mt-3 h-4 w-72 bg-muted" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function renderPolicyContent(content: string) {
  if (hasPolicyRichTextContent(content)) {
    return (
      <div
        className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-li:text-foreground prose-p:text-foreground"
        dangerouslySetInnerHTML={{ __html: sanitizePolicyRichTextHtml(content) }}
      />
    );
  }

  return content.split('\n').map((line, index) => {
    if (line.startsWith('## ')) {
      return (
        <h2 key={index} className="mt-6 text-lg font-semibold text-foreground first:mt-0">
          {line.replace('## ', '')}
        </h2>
      );
    }

    if (line.startsWith('### ')) {
      return (
        <h3 key={index} className="mt-4 text-base font-semibold text-foreground">
          {line.replace('### ', '')}
        </h3>
      );
    }

    if (line.startsWith('- ')) {
      return (
        <p key={index} className="pl-4 text-sm text-muted-foreground">
          • {line.replace('- ', '')}
        </p>
      );
    }

    if (/^\d+\./.test(line)) {
      return (
        <p key={index} className="pl-4 text-sm text-muted-foreground">
          {line}
        </p>
      );
    }

    if (line.trim() === '') {
      return <div key={index} className="h-2" />;
    }

    return (
      <p key={index} className="text-sm text-muted-foreground">
        {line}
      </p>
    );
  });
}

function sortPolicies(policies: ApiPolicyListItem[]) {
  return [...policies].sort((left, right) => {
    const leftDate = left.effective_date ?? left.updated_at;
    const rightDate = right.effective_date ?? right.updated_at;
    return new Date(rightDate).getTime() - new Date(leftDate).getTime();
  });
}

function PolicyLibrary({
  policies,
  selectedPolicyId,
  onSelectPolicy,
  selectedPolicy,
  isLoading,
  error,
}: {
  policies: ApiPolicyListItem[];
  selectedPolicyId: string;
  onSelectPolicy: (policyId: string) => void;
  selectedPolicy: ApiPolicyDetail | ApiPolicyListItem | null;
  isLoading: boolean;
  error: unknown;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          Live policy documents
        </CardTitle>
        <CardDescription>
          Review the policy documents from the repository before recording your consent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertTitle>Unable to load policy documents</AlertTitle>
            <AlertDescription>
              {getPolicyErrorMessage(error, 'Please refresh and try again.')}
            </AlertDescription>
          </Alert>
        ) : policies.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No policy documents published yet"
            description="Ask the T&P office to add at least one policy document before continuing with acceptance."
            compact
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {policies.map((policy) => {
                const meta = getPolicyCategoryMeta(policy.category);
                return (
                  <Button
                    key={policy.id}
                    type="button"
                    size="sm"
                    variant={policy.id === selectedPolicyId ? 'default' : 'outline'}
                    onClick={() => onSelectPolicy(policy.id)}
                  >
                    {meta.label} • v{policy.version}
                  </Button>
                );
              })}
            </div>

            {selectedPolicy ? (
              <div className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{getPolicyCategoryMeta(selectedPolicy.category).label}</Badge>
                  <Badge variant="secondary">v{selectedPolicy.version}</Badge>
                  <Badge variant="outline">
                    Effective {selectedPolicy.effective_date ? formatDate(selectedPolicy.effective_date) : 'Not set'}
                  </Badge>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-foreground">{selectedPolicy.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedPolicy.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  Last updated {formatDateTime(selectedPolicy.updated_at)}
                </div>

                {selectedPolicy.document_url ? (
                  <Button variant="link" className="mt-3 h-auto p-0 text-sm" asChild>
                    <a href={resolveBackendAssetUrl(selectedPolicy.document_url)} target="_blank" rel="noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      {selectedPolicy.document_name || 'Open attached policy document'}
                    </a>
                  </Button>
                ) : null}

                <ScrollArea className="mt-4 h-[320px] pr-4">
                  {isLoading && !('content' in selectedPolicy) ? (
                    <div className="space-y-3">
                      <Skeleton className="h-5 w-32 bg-muted" />
                      <Skeleton className="h-4 w-full bg-muted" />
                      <Skeleton className="h-4 w-5/6 bg-muted" />
                      <Skeleton className="h-4 w-4/6 bg-muted" />
                    </div>
                  ) : 'content' in selectedPolicy ? (
                    <div className="space-y-3">{renderPolicyContent(selectedPolicy.content)}</div>
                  ) : null}
                </ScrollArea>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function PolicyAcceptance() {
  const profileQuery = useStudentProfile();
  const policiesQuery = usePolicies({
    limit: 100,
    sort_by: 'effective_date',
    sort_order: 'desc',
  });
  const acceptPolicy = useAcceptPolicy();

  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [policyRead, setPolicyRead] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [consents, setConsents] = useState({
    profile_sharing_consent: false,
    resume_sharing_consent: false,
    data_storage_consent: false,
    communication_consent: false,
  });

  const policies = useMemo(
    () => sortPolicies(policiesQuery.data?.data ?? []),
    [policiesQuery.data?.data]
  );

  useEffect(() => {
    if (policies.length === 0) {
      if (selectedPolicyId) {
        setSelectedPolicyId('');
      }
      return;
    }

    const selectedPolicySummary = policies.find((policy) => policy.id === selectedPolicyId);
    const firstPendingPolicy = policies.find((policy) => !policy.accepted_current);

    if (!selectedPolicyId || !selectedPolicySummary) {
      setSelectedPolicyId((firstPendingPolicy ?? policies[0]).id);
    } else if (selectedPolicySummary.accepted_current && firstPendingPolicy) {
      setSelectedPolicyId(firstPendingPolicy.id);
    }
  }, [policies, selectedPolicyId]);

  const policyDetailQuery = usePolicyDetail(selectedPolicyId);
  const selectedPolicy = policyDetailQuery.data
    ?? policies.find((policy) => policy.id === selectedPolicyId)
    ?? null;

  const allConsentsGiven = Object.values(consents).every(Boolean);
  const livePolicyAvailable = Boolean(policyDetailQuery.data?.content);

  if (profileQuery.isLoading || policiesQuery.isLoading) {
    return <PolicySkeleton />;
  }

  if (profileQuery.error || !profileQuery.data) {
    return (
      <DashboardLayout
        title="Placement Policy"
        subtitle="Unable to load policy status"
      >
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Unable to load policy data</AlertTitle>
          <AlertDescription>
            {getPolicyErrorMessage(profileQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const { student } = profileQuery.data;
  const pendingPolicies = policies.filter((policy) => !policy.accepted_current);
  const allPoliciesAccepted = policies.length > 0 && pendingPolicies.length === 0;
  const selectedPolicyNeedsAcceptance = selectedPolicy ? selectedPolicy.accepted_current !== true : false;
  const canSubmit = policyRead && rulesAccepted && allConsentsGiven && selectedPolicyNeedsAcceptance && livePolicyAvailable;

  async function handleSubmit() {
    if (!canSubmit) return;

    try {
      await acceptPolicy.mutateAsync({
        policy_id: selectedPolicyId,
        policy_read: true,
        rules_accepted: true,
        profile_sharing_consent: true,
        resume_sharing_consent: true,
        data_storage_consent: true,
        communication_consent: true,
      });
      toast.success('Placement policy accepted successfully.');
    } catch (error) {
      toast.error(getPolicyErrorMessage(error, 'Unable to accept policy.'));
    }
  }

  if (allPoliciesAccepted) {
    return (
      <DashboardLayout
        title="Placement Policy"
        subtitle="Your consent and policy status are already recorded"
      >
        <div className="space-y-6">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-emerald-100 p-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Policy already accepted</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your consent has already been recorded for the latest visible policy version.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Accepted on{' '}
                      {student.policy_accepted_at
                        ? formatDateTime(student.policy_accepted_at)
                        : selectedPolicy?.accepted_at
                          ? formatDateTime(selectedPolicy.accepted_at)
                          : 'timestamp unavailable'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <PolicyLibrary
            policies={policies}
            selectedPolicyId={selectedPolicyId}
            onSelectPolicy={setSelectedPolicyId}
            selectedPolicy={selectedPolicy}
            isLoading={policyDetailQuery.isLoading}
            error={policiesQuery.error ?? policyDetailQuery.error}
          />

          <Card>
            <CardHeader>
              <CardTitle>Recorded consent areas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {consentItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <Badge variant="success" className="mt-1">Consented</Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Placement Policy"
      subtitle="Read the policy, confirm the rules, and record consent"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Acceptance required</h2>
                  <Badge variant="warning">Pending</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your student profile is currently {student.profile_completion_percentage}% complete. Complete your profile and accept the policy to unlock interest registration.
                </p>
              </div>
              <div className="rounded-lg border border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">Current status</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Profile {student.profile_completion_percentage}% complete
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <PolicyLibrary
          policies={policies}
          selectedPolicyId={selectedPolicyId}
          onSelectPolicy={setSelectedPolicyId}
          selectedPolicy={selectedPolicy}
          isLoading={policyDetailQuery.isLoading}
          error={policiesQuery.error ?? policyDetailQuery.error}
        />

        {!livePolicyAvailable ? (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Live policy document required</AlertTitle>
            <AlertDescription>
              The acceptance action stays disabled until at least one policy document is available from the repository and its content loads successfully.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Confirm consent</CardTitle>
            <CardDescription>
              Please review each item carefully and confirm all of them before continuing.
              {pendingPolicies.length > 1 ? ` ${pendingPolicies.length} policies still need your acceptance.` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3 rounded-lg border border-border p-4">
              <Checkbox
                id="policy-read"
                checked={policyRead}
                onCheckedChange={(checked) => setPolicyRead(Boolean(checked))}
              />
              <div>
                <label htmlFor="policy-read" className="font-medium text-foreground">
                  I have read the placement policy.
                </label>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border p-4">
              <Checkbox
                id="rules-accepted"
                checked={rulesAccepted}
                onCheckedChange={(checked) => setRulesAccepted(Boolean(checked))}
              />
              <div>
                <label htmlFor="rules-accepted" className="font-medium text-foreground">
                  I accept the placement rules and understand the consequences of non-compliance.
                </label>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              {consentItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={item.id}
                        checked={consents[item.id]}
                        onCheckedChange={(checked) =>
                          setConsents((current) => ({
                            ...current,
                            [item.id]: Boolean(checked),
                          }))
                        }
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <label htmlFor={item.id} className="font-medium text-foreground">
                            {item.title}
                          </label>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Once accepted, your policy status will be saved with the time of acceptance.
              </p>
              <Button disabled={!canSubmit || acceptPolicy.isPending} onClick={handleSubmit}>
                {acceptPolicy.isPending ? 'Submitting...' : 'Accept Policy'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
