import { useDeferredValue, useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AddPolicyDialog } from '@/components/admin/AddPolicyDialog';
import { EditPolicyDialog } from '@/components/admin/EditPolicyDialog';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { SearchInput } from '@/components/shared/SearchInput';
import {
  useCreatePolicy,
  useDeletePolicy,
  usePolicies,
  usePolicyDetail,
  useUpdatePolicy,
  useUploadPolicyDocument,
} from '@/hooks/use-policy-api';
import {
  filterPoliciesBySearch,
  getPolicyCategoryMeta,
  getPolicyErrorMessage,
  hasPolicyRichTextContent,
  sanitizePolicyRichTextHtml,
} from '@/lib/policyModule';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import type { ApiPolicyDetail, ApiPolicyListItem, CreatePolicyInput, UpdatePolicyInput } from '@/types/policy';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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
        <h2 key={index} className="mt-6 text-lg font-bold text-foreground first:mt-0">
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
        <li key={index} className="ml-4 text-sm text-foreground">
          {line.replace('- ', '')}
        </li>
      );
    }

    if (/^\d+\./.test(line)) {
      return (
        <li key={index} className="ml-4 list-decimal text-sm text-foreground">
          {line.replace(/^\d+\.\s*/, '')}
        </li>
      );
    }

    if (line.trim() === '') {
      return <div key={index} className="h-2" />;
    }

    return (
      <p key={index} className="text-sm text-foreground">
        {line}
      </p>
    );
  });
}

export default function PolicyRepository() {
  const [search, setSearch] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiPolicyListItem | null>(null);

  const deferredSearch = useDeferredValue(search);

  const policiesQuery = usePolicies({
    limit: 100,
    sort_by: 'updated_at',
    sort_order: 'desc',
  });
  const detailQuery = usePolicyDetail(selectedPolicyId);
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();
  const uploadPolicyDocument = useUploadPolicyDocument();
  const deletePolicy = useDeletePolicy();

  const policies = policiesQuery.data?.data ?? [];
  const filteredPolicies = useMemo(
    () => filterPoliciesBySearch(policies, deferredSearch),
    [deferredSearch, policies]
  );

  const selectedPolicy = detailQuery.data
    ?? policies.find((policy) => policy.id === selectedPolicyId)
    ?? null;
  const selectedPolicyContent = selectedPolicy && 'content' in selectedPolicy
    ? (selectedPolicy.content as string)
    : '';

  if (policiesQuery.isLoading) {
    return (
      <DashboardLayout
        title="Policy Repository"
        subtitle="Manage the live placement policy and guideline library"
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (policiesQuery.error) {
    return (
      <DashboardLayout
        title="Policy Repository"
        subtitle="Manage the live placement policy and guideline library"
      >
        <Alert variant="destructive">
          <FileText className="h-4 w-4" />
          <AlertTitle>Unable to load policies</AlertTitle>
          <AlertDescription>
            {getPolicyErrorMessage(policiesQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  async function handleCreatePolicy(data: CreatePolicyInput) {
    try {
      const created = await createPolicy.mutateAsync(data);
      toast.success('Policy added successfully.');
      setAddOpen(false);
      setSelectedPolicyId(created.id);
    } catch (error) {
      toast.error(getPolicyErrorMessage(error, 'Unable to create the policy.'));
    }
  }

  async function handleUpdatePolicy(data: UpdatePolicyInput) {
    if (!selectedPolicyId) return;

    try {
      await updatePolicy.mutateAsync({
        id: selectedPolicyId,
        data,
      });
      toast.success('Policy updated successfully.');
      setEditOpen(false);
    } catch (error) {
      toast.error(getPolicyErrorMessage(error, 'Unable to update the policy.'));
    }
  }

  async function handleDeletePolicy() {
    if (!deleteTarget) return;

    try {
      await deletePolicy.mutateAsync(deleteTarget.id);
      toast.success('Policy deleted successfully.');
      if (selectedPolicyId === deleteTarget.id) {
        setSelectedPolicyId('');
      }
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getPolicyErrorMessage(error, 'Unable to delete the policy.'));
    }
  }

  return (
    <DashboardLayout
      title="Policy Repository"
      subtitle="Manage the live placement policy and guideline library"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="max-w-sm flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search policies..."
              />
            </div>
          </div>

          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Policy
          </Button>
        </div>

        {filteredPolicies.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={FileText}
                title="No policies found"
                description="Try changing the category filter or search query."
                compact
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredPolicies.map((policy) => {
              const meta = getPolicyCategoryMeta(policy.category);
              const Icon = meta.icon;

              return (
                <Card key={policy.id} className="cursor-pointer transition-shadow hover:shadow-sm" onClick={() => setSelectedPolicyId(policy.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2.5 ${meta.colorClassName}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-base">{policy.title}</CardTitle>
                          <CardDescription>{policy.description || 'No description added.'}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{meta.label}</Badge>
                        <Badge variant={policy.posting_type_master ? 'secondary' : 'success'}>
                          {policy.posting_type_master
                            ? formatPostingTypeLabel(policy.posting_type_master.value)
                            : 'Global'}
                        </Badge>
                        <span>v{policy.version}</span>
                      </div>
                      <span>Updated {formatDate(policy.updated_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Sheet
        open={Boolean(selectedPolicyId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPolicyId('');
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedPolicyId && detailQuery.isLoading && !selectedPolicy ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <PageLoader />
            </div>
          ) : detailQuery.error ? (
            <Alert variant="destructive">
              <FileText className="h-4 w-4" />
              <AlertTitle>Unable to load policy details</AlertTitle>
              <AlertDescription>
                {getPolicyErrorMessage(detailQuery.error, 'Please close this panel and try again.')}
              </AlertDescription>
            </Alert>
          ) : selectedPolicy ? (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{getPolicyCategoryMeta(selectedPolicy.category).label}</Badge>
                  <Badge variant="secondary">v{selectedPolicy.version}</Badge>
                </div>
                <SheetTitle>{selectedPolicy.title}</SheetTitle>
                <SheetDescription>{selectedPolicy.description || 'No description provided.'}</SheetDescription>
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
                  <span>Effective: {selectedPolicy.effective_date ? formatDate(selectedPolicy.effective_date) : 'Not set'}</span>
                  <span>Last updated: {formatDateTime(selectedPolicy.updated_at)}</span>
                  {'updated_by' in selectedPolicy ? (
                    <span>Updated by: {selectedPolicy.updated_by || 'Unknown'}</span>
                  ) : null}
                </div>
              </SheetHeader>

              <div className="mt-4 rounded-lg border p-3">
                <p className="text-sm font-medium">Student visibility</p>
                <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <p>Institute: {selectedPolicy.target_institutes?.[0] ?? 'All'}</p>
                  <p>Branch: {selectedPolicy.target_branches?.[0] ?? 'All'}</p>
                  <p>Course: {selectedPolicy.target_courses?.[0] ?? 'All'}</p>
                </div>
              </div>

              {selectedPolicy.document_url ? (
                <div className="mt-4 rounded-lg border p-3">
                  <p className="text-sm font-medium">Attached document</p>
                  <Button variant="link" className="mt-1 h-auto p-0 text-sm" asChild>
                    <a href={resolveBackendAssetUrl(selectedPolicy.document_url)} target="_blank" rel="noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      {selectedPolicy.document_name || 'Open policy document'}
                    </a>
                  </Button>
                </div>
              ) : null}

              <ScrollArea className="mt-6 h-[calc(100vh-18rem)] pr-4">
                <div className="space-y-3">
                  {renderPolicyContent(selectedPolicyContent)}
                </div>
              </ScrollArea>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteTarget(selectedPolicy as ApiPolicyListItem)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AddPolicyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={handleCreatePolicy}
        onUploadDocument={(file) => uploadPolicyDocument.mutateAsync(file)}
        isPending={createPolicy.isPending}
        isUploadingDocument={uploadPolicyDocument.isPending}
      />

      <EditPolicyDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        policy={detailQuery.data ?? null}
        onSave={handleUpdatePolicy}
        onUploadDocument={(file) => uploadPolicyDocument.mutateAsync(file)}
        isPending={updatePolicy.isPending}
        isUploadingDocument={uploadPolicyDocument.isPending}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium">{deleteTarget?.title}</span> from the policy repository.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeletePolicy()} disabled={deletePolicy.isPending}>
              {deletePolicy.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
