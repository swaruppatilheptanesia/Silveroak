import { useDeferredValue, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ScrollText } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useAuditLogs } from '@/hooks/use-admin-api';
import {
  getAuditActionMeta,
  getAuditModules,
  getSecurityErrorMessage,
  SYSTEM_ROLE_CONFIG,
  SYSTEM_ROLE_ORDER,
} from '@/lib/securityModule';
import { ReportToolbar, type DateRange } from '@/components/reports/ReportToolbar';
import type { ApiAuditLog, UserRole } from '@/types/admin';

const PAGE_SIZE = 50;

function filterLogsByDateRange(logs: ApiAuditLog[], range: DateRange) {
  if (!range.from && !range.to) return logs;

  return logs.filter((log) => {
    const date = new Date(log.created_at);

    if (range.from && date < range.from) return false;
    if (range.to) {
      const endOfDay = new Date(range.to);
      endOfDay.setHours(23, 59, 59, 999);
      if (date > endOfDay) return false;
    }

    return true;
  });
}

export default function AuditLogTab() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'created_at' | 'user' | 'action' | 'module'
  >('created_at', 'desc', () => setPage(1));
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const deferredSearch = useDeferredValue(search);

  const auditLogsQuery = useAuditLogs({
    page,
    limit: PAGE_SIZE,
    module: moduleFilter === 'all' ? undefined : moduleFilter,
    action: actionFilter === 'all' ? undefined : actionFilter,
    role: roleFilter === 'all' ? undefined : (roleFilter as UserRole),
    sort_by,
    sort_order,
  });

  const logs = auditLogsQuery.data?.data ?? [];
  const pagination = auditLogsQuery.data?.pagination;
  const modules = useMemo(() => getAuditModules(logs), [logs]);
  const actions = useMemo(
    () => [...new Set(logs.map((log) => log.action))].sort((left, right) => left.localeCompare(right)),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    const dateFiltered = filterLogsByDateRange(logs, dateRange);

    if (!normalizedSearch) {
      return dateFiltered;
    }

    return dateFiltered.filter((log) => {
      const userName = log.user?.name ?? '';
      const userEmail = log.user?.email ?? '';
      return (
        userName.toLowerCase().includes(normalizedSearch)
        || userEmail.toLowerCase().includes(normalizedSearch)
        || (log.details ?? '').toLowerCase().includes(normalizedSearch)
        || log.module.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [dateRange, deferredSearch, logs]);

  function handleExportCSV() {
    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Module', 'Details', 'IP Address'];
    const rows = filteredLogs.map((log) => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.user?.name ?? 'System',
      log.user?.email ?? '—',
      getAuditActionMeta(log.action).label,
      log.module,
      log.details ?? '',
      log.ip_address ?? '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const errorMessage = auditLogsQuery.error
    ? getSecurityErrorMessage(auditLogsQuery.error, 'Unable to load audit logs.')
    : null;

  if (auditLogsQuery.isLoading && !auditLogsQuery.data) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <ReportToolbar
        title="Audit Log"
        totalRecords={filteredLogs.length}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExportCSV={handleExportCSV}
      />

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load audit data</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Activity Log</CardTitle>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by user, module, or details..."
              />
            </div>
            <Select
              value={actionFilter}
              onValueChange={(value) => {
                setActionFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {getAuditActionMeta(action).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={moduleFilter}
              onValueChange={(value) => {
                setModuleFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {SYSTEM_ROLE_ORDER.map((role) => (
                  <SelectItem key={role} value={role}>
                    {SYSTEM_ROLE_CONFIG[role].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {auditLogsQuery.isFetching && !auditLogsQuery.isLoading ? (
            <div className="border-b px-6 py-3 text-sm text-muted-foreground">Refreshing audit logs...</div>
          ) : null}

          {filteredLogs.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ScrollText}
                title="No audit records found"
                description="Try widening the filters or date range."
                compact
              />
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label="Timestamp" columnKey="created_at" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="User" columnKey="user" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Action" columnKey="action" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Module" columnKey="module" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const actionMeta = getAuditActionMeta(log.action);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{log.user?.name ?? 'System'}</p>
                            {log.user?.email ? (
                              <p className="text-xs text-muted-foreground">{log.user.email}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={actionMeta.color}>
                            {actionMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.module}</TableCell>
                        <TableCell className="max-w-[320px] text-sm">
                          <span className="line-clamp-2">{log.details || 'No details recorded.'}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.ip_address ?? '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              {pagination
                ? `Showing ${logs.length} audit log${logs.length === 1 ? '' : 's'} on page ${pagination.page} of ${Math.max(pagination.totalPages, 1)}`
                : 'No pagination data available'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!pagination?.hasPrev}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current + 1)}
                disabled={!pagination?.hasNext}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
