import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Eye, FileText, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import GenerateCircularDialog from '@/components/circulars/GenerateCircularDialog';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListPager } from '@/components/shared/ListPager';
import { PageLoader } from '@/components/shared/PageLoader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useServerSort } from '@/hooks/use-server-sort';
import { useDeleteGeneratedCircular, useGeneratedCircularsPaged } from '@/hooks/use-circular-api';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissionModule';
import {
  formatCircularFieldValue,
  getCircularErrorMessage,
  getCircularTypeLabel,
  getGeneratedCircularAdditionalFields,
  toGeneratedCircularView,
} from '@/lib/circularModule';
import { formatDateTime } from '@/lib/formatters';

export default function CircularsManagement() {
  const [circularSearch, setCircularSearch] = useState('');
  const [viewCircularId, setViewCircularId] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deleteCircularId, setDeleteCircularId] = useState('');
  const deferredCircularSearch = useDeferredValue(circularSearch);
  const [page, setPage] = useState(1);

  const { user } = useAuth();
  const canDelete = hasPermission(user?.permissions, { module: 'circulars', action: 'delete' }, user?.role);
  const deleteCircular = useDeleteGeneratedCircular();

  const { sort_by, sort_order, onSort } = useServerSort<
    'company_name' | 'role_name' | 'type' | 'generated_at'
  >('generated_at', 'desc', () => setPage(1));

  useEffect(() => { setPage(1); }, [deferredCircularSearch]);

  const generatedCircularsQuery = useGeneratedCircularsPaged({
    page,
    limit: 20,
    search: deferredCircularSearch.trim() || undefined,
    sort_by,
    sort_order,
  });

  const generatedCircularViews = useMemo(
    () => (generatedCircularsQuery.data?.data ?? []).map(toGeneratedCircularView),
    [generatedCircularsQuery.data],
  );
  const pagination = generatedCircularsQuery.data?.pagination;

  const selectedCircular = generatedCircularViews.find((circular) => circular.id === viewCircularId) ?? null;
  const deleteCircularView = generatedCircularViews.find((circular) => circular.id === deleteCircularId) ?? null;

  const handleDeleteCircular = () => {
    if (!deleteCircularId) return;
    deleteCircular.mutate(deleteCircularId, {
      onSuccess: () => {
        toast.success('Circular deleted');
        setDeleteCircularId('');
      },
      onError: (error) => {
        toast.error(getCircularErrorMessage(error, 'Unable to delete circular.'));
      },
    });
  };

  if (generatedCircularsQuery.isLoading) {
    return (
      <DashboardLayout
        title="Circulars"
        subtitle="Generate and review circulars"
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (generatedCircularsQuery.error) {
    return (
      <DashboardLayout
        title="Circulars"
        subtitle="Generate and review circulars"
      >
        <Alert variant="destructive">
          <FileText className="h-4 w-4" />
          <AlertTitle>Unable to load circular data</AlertTitle>
          <AlertDescription>
            {getCircularErrorMessage(generatedCircularsQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Circulars"
      subtitle="Generate and review circulars"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Generated Circulars</h2>
            <p className="text-sm text-muted-foreground">
              Create circulars directly from postings or events. Templates are not required here.
            </p>
          </div>
          <Button onClick={() => setGenerateOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Circular
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by title, company, role, or source..."
                value={circularSearch}
                onChange={(event) => setCircularSearch(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {generatedCircularViews.length === 0 ? (
              <EmptyState
                className="p-6"
                compact
                icon={FileText}
                title="No circulars found"
                description="Generated circulars will appear here once circulars are created."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Circular ID</TableHead>
                      <TableHead>Title</TableHead>
                      <SortableTableHead label="Company" columnKey="company_name" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Role" columnKey="role_name" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Type" columnKey="type" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Generated On" columnKey="generated_at" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedCircularViews.map((circular) => (
                      <TableRow key={circular.id}>
                        <TableCell className="font-mono text-sm">{circular.id.slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="font-medium">{circular.title}</TableCell>
                        <TableCell className="font-medium">{circular.companyName}</TableCell>
                        <TableCell>{circular.roleName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCircularTypeLabel(circular.circularType)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDateTime(circular.generatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewCircularId(circular.id)}>
                              <Eye className="mr-1 h-4 w-4" />
                              View
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteCircularId(circular.id)}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <ListPager
              page={pagination?.page ?? 1}
              totalPages={pagination?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={Boolean(selectedCircular)}
        onOpenChange={(open) => {
          if (!open) {
            setViewCircularId('');
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedCircular ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCircular.title}</SheetTitle>
                <SheetDescription>
                  {selectedCircular.companyName} • {selectedCircular.roleName}
                  {' • '}
                  Generated {formatDateTime(selectedCircular.generatedAt)} by {selectedCircular.generatedByName}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{getCircularTypeLabel(selectedCircular.circularType)}</Badge>
                  {selectedCircular.sourceLabel ? (
                    <Badge variant="outline">
                      {selectedCircular.sourceType === 'event' ? 'Event & Drive' : 'Job Posting'}: {selectedCircular.sourceLabel}
                    </Badge>
                  ) : null}
                </div>

                <Separator />

                {selectedCircular.note ? (
                  <Card>
                    <CardContent className="space-y-2 p-4">
                      <p className="font-medium text-foreground">Note</p>
                      <p className="whitespace-pre-wrap text-sm text-foreground">{selectedCircular.note}</p>
                    </CardContent>
                  </Card>
                ) : null}

                {getGeneratedCircularAdditionalFields(selectedCircular).map((field) => (
                  <Card key={field.key}>
                    <CardContent className="space-y-2 p-4">
                      <p className="font-medium text-foreground">{field.label}</p>
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {formatCircularFieldValue(field.value)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <GenerateCircularDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
      />

      <ConfirmActionDialog
        open={Boolean(deleteCircularId)}
        onOpenChange={(open) => {
          if (!open) setDeleteCircularId('');
        }}
        title="Delete circular?"
        description={
          deleteCircularView
            ? `This permanently deletes the circular "${deleteCircularView.title}". This action cannot be undone.`
            : 'This permanently deletes the circular. This action cannot be undone.'
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        isPending={deleteCircular.isPending}
        onConfirm={handleDeleteCircular}
      />
    </DashboardLayout>
  );
}
