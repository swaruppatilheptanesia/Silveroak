import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  FileText,
  Search,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
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
import { useClientSort } from '@/hooks/use-client-sort';
import { useMyCirculars } from '@/hooks/use-circular-api';
import { markSurfaceSeen } from '@/hooks/use-student-new-indicators';
import {
  formatCircularFieldValue,
  getCircularErrorMessage,
  getGeneratedCircularAdditionalFields,
  getCircularTypeLabel,
  toGeneratedCircularView,
} from '@/lib/circularModule';
import { formatDate, formatDateTime } from '@/lib/formatters';

export default function StudentCirculars() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCircularId, setSelectedCircularId] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);

  useEffect(() => {
    markSurfaceSeen('circulars');
  }, []);

  const circularsQuery = useMyCirculars();
  const circulars = useMemo(
    () => (circularsQuery.data ?? []).map(toGeneratedCircularView),
    [circularsQuery.data],
  );
  const filteredCirculars = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return circulars;
    }
    return circulars.filter((circular) => (
      circular.title.toLowerCase().includes(normalizedSearch)
        || circular.companyName.toLowerCase().includes(normalizedSearch)
        || circular.roleName.toLowerCase().includes(normalizedSearch)
        || circular.sourceLabel.toLowerCase().includes(normalizedSearch)
    ));
  }, [circulars, deferredSearch]);

  const { sorted: sortedCirculars, sort_by, sort_order, onSort } = useClientSort(filteredCirculars, {
    company: (c) => c.companyName,
    role: (c) => c.roleName,
    type: (c) => getCircularTypeLabel(c.circularType),
    published: (c) => new Date(c.generatedAt),
  });

  const selectedCircular = circulars.find((circular) => circular.id === selectedCircularId) ?? null;

  if (circularsQuery.isLoading) {
    return (
      <DashboardLayout
        title="Circulars"
        subtitle="Placement and internship circulars from the T&P office"
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (circularsQuery.error) {
    return (
      <DashboardLayout
        title="Circulars"
        subtitle="Placement and internship circulars from the T&P office"
      >
        <Alert variant="destructive">
          <FileText className="h-4 w-4" />
          <AlertTitle>Unable to load circulars</AlertTitle>
          <AlertDescription>
            {getCircularErrorMessage(circularsQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Circulars"
      subtitle="Placement and internship circulars from the T&P office"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by title, company, role, or source..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {filteredCirculars.length === 0 ? (
              <EmptyState
                className="p-6"
                compact
                icon={FileText}
                title="No circulars found"
                description="Placement and internship circulars will appear here as the T&P office publishes them."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label="Company" columnKey="company" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Role" columnKey="role" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Type" columnKey="type" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Published" columnKey="published" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCirculars.map((circular) => (
                      <TableRow key={circular.id}>
                        <TableCell className="font-medium">{circular.companyName}</TableCell>
                        <TableCell>{circular.roleName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCircularTypeLabel(circular.circularType)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(circular.generatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedCircularId(circular.id)}>
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={Boolean(selectedCircular)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCircularId('');
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
                  Published {formatDateTime(selectedCircular.generatedAt)}
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
    </DashboardLayout>
  );
}
