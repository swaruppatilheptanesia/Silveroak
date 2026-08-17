import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { usePolicyDetail } from '@/hooks/use-policy-api';
import { useAcceptPolicy } from '@/hooks/use-student-api';
import { formatDateTime } from '@/lib/formatters';
import {
  getPolicyCategoryMeta,
  getPolicyErrorMessage,
  hasPolicyRichTextContent,
  sanitizePolicyRichTextHtml,
} from '@/lib/policyModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import type { ApiPolicyListItem } from '@/types/policy';

function PolicyBody({ content }: { content: string }) {
  if (hasPolicyRichTextContent(content)) {
    return (
      <div
        className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-li:text-foreground prose-p:text-foreground"
        dangerouslySetInnerHTML={{ __html: sanitizePolicyRichTextHtml(content) }}
      />
    );
  }
  return <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>;
}

/**
 * One global policy with a single "I have read and accept this policy" checkbox.
 * Shared by the registration gate and the My Profile → Policies tab.
 */
export function GlobalPolicyCard({
  policy,
  onAccepted,
  defaultExpanded = false,
}: {
  policy: ApiPolicyListItem;
  onAccepted?: () => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [agreed, setAgreed] = useState(false);
  const detailQuery = usePolicyDetail(expanded ? policy.id : '');
  const acceptPolicy = useAcceptPolicy();

  const meta = getPolicyCategoryMeta(policy.category);
  const accepted = policy.accepted_current === true;

  async function handleAccept() {
    if (!agreed) return;
    try {
      await acceptPolicy.mutateAsync({
        policy_id: policy.id,
        policy_read: true,
        rules_accepted: true,
      });
      toast.success(`Accepted: ${policy.title}`);
      setAgreed(false);
      onAccepted?.();
    } catch (error) {
      toast.error(getPolicyErrorMessage(error, 'Unable to accept this policy.'));
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{meta.label}</Badge>
            <Badge variant="secondary">v{policy.version}</Badge>
            {accepted ? <Badge variant="success">Accepted</Badge> : <Badge variant="warning">Pending</Badge>}
          </div>
          <h3 className="mt-2 font-semibold text-foreground">{policy.title}</h3>
          {policy.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{policy.description}</p>
          ) : null}
        </div>
        {accepted && policy.accepted_at ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {formatDateTime(policy.accepted_at)}
          </span>
        ) : null}
      </div>

      {policy.document_url ? (
        <Button variant="link" className="mt-2 h-auto p-0 text-sm" asChild>
          <a href={resolveBackendAssetUrl(policy.document_url)} target="_blank" rel="noreferrer">
            <Download className="mr-2 h-4 w-4" />
            {policy.document_name || 'Open attached policy document'}
          </a>
        </Button>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 h-auto px-0 text-sm"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
        {expanded ? 'Hide policy' : 'Read full policy'}
      </Button>

      {expanded ? (
        <ScrollArea className="mt-2 h-[260px] rounded-md border border-border p-3 pr-4">
          {detailQuery.isLoading && !detailQuery.data ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full bg-muted" />
              <Skeleton className="h-4 w-5/6 bg-muted" />
              <Skeleton className="h-4 w-4/6 bg-muted" />
            </div>
          ) : detailQuery.data ? (
            <PolicyBody content={detailQuery.data.content} />
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load the policy content.</p>
          )}
        </ScrollArea>
      ) : null}

      {!accepted ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Checkbox
              id={`accept-${policy.id}`}
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(Boolean(checked))}
            />
            <label htmlFor={`accept-${policy.id}`} className="text-sm font-medium text-foreground">
              I have read and accept this policy.
            </label>
          </div>
          <Button size="sm" disabled={!agreed || acceptPolicy.isPending} onClick={handleAccept}>
            {acceptPolicy.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Accept
          </Button>
        </div>
      ) : null}
    </div>
  );
}
