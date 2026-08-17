import { useMemo, useState } from 'react';
import {
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Plus,
  XCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NOCRequestCard } from '@/components/noc/NOCRequestCard';
import { NOCRequestDetailSheet } from '@/components/noc/NOCRequestDetailSheet';
import { NOCRequestWizard } from '@/components/noc/NOCRequestWizard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyNocs } from '@/hooks/use-noc-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { isActiveNocStatus, isCompletedNocStatus } from '@/lib/nocModule';
import type { ApiNocMyItem } from '@/types/noc';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: number;
  icon: typeof FileText;
  iconClassName: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-muted p-2">
          <Icon className={iconClassName} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NOCDashboard() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApiNocMyItem | null>(null);
  const [postingTypeFilter, setPostingTypeFilter] = useState<string>('all');
  const requestsQuery = useMyNocs();
  const postingTypeOptions = usePostingTypeOptions();

  const allRequests = requestsQuery.data ?? [];
  const requests = useMemo(
    () =>
      postingTypeFilter === 'all'
        ? allRequests
        : allRequests.filter((request) => request.program === postingTypeFilter),
    [allRequests, postingTypeFilter]
  );
  const activeRequests = useMemo(
    () => requests.filter((request) => isActiveNocStatus(request.status)),
    [requests]
  );
  const completedRequests = useMemo(
    () => requests.filter((request) => isCompletedNocStatus(request.status)),
    [requests]
  );
  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'pending_faculty' || request.status === 'pending_tpo').length,
    [requests]
  );
  const issuedCount = useMemo(
    () => requests.filter((request) => request.status === 'issued').length,
    [requests]
  );
  const rejectedCount = useMemo(
    () => requests.filter((request) => request.status === 'rejected').length,
    [requests]
  );

  return (
    <DashboardLayout
      title="NOC Requests"
      subtitle="Track your live No Objection Certificate requests for internships, training, and project work"
    >
      <div className="space-y-6">
        {requestsQuery.error && (
          <Alert variant="destructive">
            <FileText className="h-4 w-4" />
            <AlertTitle>Unable to load your NOC requests</AlertTitle>
            <AlertDescription>
              {getErrorMessage(requestsQuery.error, 'Please refresh and try again.')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Requests" value={requests.length} icon={FileText} iconClassName="h-5 w-5 text-primary" />
          <StatCard title="Pending" value={pendingCount} icon={Clock} iconClassName="h-5 w-5 text-amber-600" />
          <StatCard title="Issued" value={issuedCount} icon={CheckCircle} iconClassName="h-5 w-5 text-emerald-600" />
          <StatCard title="Rejected" value={rejectedCount} icon={XCircle} iconClassName="h-5 w-5 text-red-600" />
        </div>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            New requests move through `pending_faculty`, `pending_tpo`, and then `issued` when the TPO approves and generates the certificate. Rejected requests stay visible here so you can review the reason and resubmit if needed.
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
          <Button onClick={() => setIsWizardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Request New NOC
          </Button>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active ({activeRequests.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {requestsQuery.isLoading ? (
              <Card>
                <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your live NOC requests...
                </CardContent>
              </Card>
            ) : activeRequests.length === 0 ? (
              <Card>
                <CardContent className="p-0">
                  <EmptyState
                    icon={FileText}
                    title="No active requests"
                    description="Your pending and approved NOC requests will appear here."
                    actionLabel="Request New NOC"
                    onAction={() => setIsWizardOpen(true)}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeRequests.map((request) => (
                  <NOCRequestCard
                    key={request.id}
                    request={request}
                    onViewDetails={(item) => setSelectedRequest(item as ApiNocMyItem)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {requestsQuery.isLoading ? (
              <Card>
                <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading completed requests...
                </CardContent>
              </Card>
            ) : completedRequests.length === 0 ? (
              <Card>
                <CardContent className="p-0">
                  <EmptyState
                    icon={CheckCircle}
                    title="No completed requests"
                    description="Issued and rejected requests will appear here."
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {completedRequests.map((request) => (
                  <NOCRequestCard
                    key={request.id}
                    request={request}
                    onViewDetails={(item) => setSelectedRequest(item as ApiNocMyItem)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <NOCRequestWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />

      <NOCRequestDetailSheet
        request={selectedRequest}
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
      />
    </DashboardLayout>
  );
}
