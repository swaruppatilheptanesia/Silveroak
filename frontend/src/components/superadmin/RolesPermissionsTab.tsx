import { useEffect, useMemo, useState } from 'react';
import { Eye, RotateCcw, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermissions, useUpdatePermission } from '@/hooks/use-admin-api';
import {
  getActivePermissionKeys,
  getPermissionLabel,
  getPermissionModules,
  getSecurityErrorMessage,
  PERMISSION_FIELD_CONFIG,
  SYSTEM_ROLE_CONFIG,
  SYSTEM_ROLE_ORDER,
  type PermissionFieldKey,
} from '@/lib/securityModule';
import { cn } from '@/lib/utils';
import type { ApiPermission } from '@/types/admin';

type PermissionDraftState = Record<string, ApiPermission>;

function buildDraftState(permissions: ApiPermission[]) {
  return permissions.reduce<PermissionDraftState>((accumulator, permission) => {
    accumulator[permission.id] = { ...permission };
    return accumulator;
  }, {});
}

export default function RolesPermissionsTab() {
  const permissionsQuery = usePermissions();
  const updatePermission = useUpdatePermission();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PermissionDraftState>({});
  const [savedDraft, setSavedDraft] = useState<PermissionDraftState>({});

  useEffect(() => {
    if (!permissionsQuery.data) return;
    const nextDraft = buildDraftState(permissionsQuery.data);
    setDraft(nextDraft);
    setSavedDraft(nextDraft);
  }, [permissionsQuery.data]);

  const permissions = permissionsQuery.data ?? [];
  const modules = useMemo(() => getPermissionModules(permissions), [permissions]);

  const changedPermissionIds = useMemo(() => {
    return Object.keys(draft).filter((permissionId) => {
      const current = draft[permissionId];
      const saved = savedDraft[permissionId];
      if (!current || !saved) return false;

      return PERMISSION_FIELD_CONFIG.some((field) => current[field.key] !== saved[field.key]);
    });
  }, [draft, savedDraft]);

  const changedCells = useMemo(() => {
    const cells = new Set<string>();

    changedPermissionIds.forEach((permissionId) => {
      const permission = draft[permissionId];
      if (permission) {
        cells.add(`${permission.module}::${permission.role}`);
      }
    });

    return cells;
  }, [changedPermissionIds, draft]);

  const hasChanges = changedPermissionIds.length > 0;

  function getPermission(module: string, role: (typeof SYSTEM_ROLE_ORDER)[number]) {
    return permissions.find((permission) => permission.module === module && permission.role === role) ?? null;
  }

  function getDraftPermission(permissionId: string) {
    return draft[permissionId] ?? null;
  }

  function togglePermission(permissionId: string, fieldKey: PermissionFieldKey) {
    setDraft((current) => {
      const permission = current[permissionId];
      if (!permission) return current;

      return {
        ...current,
        [permissionId]: {
          ...permission,
          [fieldKey]: !permission[fieldKey],
        },
      };
    });
  }

  async function handleSave() {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    try {
      for (const permissionId of changedPermissionIds) {
        const current = draft[permissionId];
        const saved = savedDraft[permissionId];
        if (!current || !saved) continue;

        const payload = PERMISSION_FIELD_CONFIG.reduce<Record<string, boolean>>((accumulator, field) => {
          if (current[field.key] !== saved[field.key]) {
            accumulator[field.key] = current[field.key];
          }
          return accumulator;
        }, {});

        await updatePermission.mutateAsync({
          permissionId,
          data: payload,
        });
      }

      setSavedDraft(draft);
      setIsEditing(false);
      toast.success(`Updated ${changedPermissionIds.length} permission row${changedPermissionIds.length === 1 ? '' : 's'}.`);
    } catch (error) {
      toast.error(getSecurityErrorMessage(error, 'Unable to save permission changes.'));
    }
  }

  function handleReset() {
    if (!permissionsQuery.data) return;
    const nextDraft = buildDraftState(permissionsQuery.data);
    setDraft(nextDraft);
    setSavedDraft(nextDraft);
    setIsEditing(false);
    toast.success('Permissions restored to the last saved version.');
  }

  function handleDiscard() {
    setDraft(savedDraft);
    setIsEditing(false);
  }

  if (permissionsQuery.isLoading && !permissionsQuery.data) {
    return <PageLoader />;
  }

  if (permissionsQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load permissions</AlertTitle>
        <AlertDescription>
          {getSecurityErrorMessage(permissionsQuery.error, 'Please refresh and try again.')}
        </AlertDescription>
      </Alert>
    );
  }

  if (permissions.length === 0) {
    return (
      <EmptyState
        icon={Save}
        title="No role permissions found"
        description="Create role permission records to start managing access here."
        compact
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Roles & Permissions Matrix</CardTitle>
              <CardDescription>
                {isEditing
                  ? 'Toggle the permission badges and save your changes.'
                  : 'Review the current permissions assigned to each role.'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Reset
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                    <Eye className="mr-2 h-3.5 w-3.5" />
                    View Mode
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  Edit Permissions
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {PERMISSION_FIELD_CONFIG.map((field) => (
              <div key={field.key} className="flex items-center gap-2">
                <Badge variant="outline" className={`${field.color} text-xs font-bold`}>
                  {field.label}
                </Badge>
                <span className="text-sm text-muted-foreground">{field.title}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-muted-foreground/40" />
              <span className="text-sm text-muted-foreground">No Access</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 min-w-[180px] bg-background">Module</TableHead>
                  {SYSTEM_ROLE_ORDER.map((role) => (
                    <TableHead key={role} className="min-w-[120px] text-center">
                      <span className="text-xs">{SYSTEM_ROLE_CONFIG[role].label}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => (
                  <TableRow key={module}>
                    <TableCell className="sticky left-0 z-10 bg-background font-medium text-sm">
                      {getPermissionLabel(module)}
                    </TableCell>
                    {SYSTEM_ROLE_ORDER.map((role) => {
                      const permission = getPermission(module, role);
                      const draftPermission = permission ? getDraftPermission(permission.id) : null;
                      const isChanged = changedCells.has(`${module}::${role}`);

                      if (!permission || !draftPermission) {
                        return (
                          <TableCell key={role} className="text-center text-xs text-muted-foreground">
                            N/A
                          </TableCell>
                        );
                      }

                      if (!isEditing) {
                        const activeKeys = getActivePermissionKeys(draftPermission);

                        return (
                          <TableCell key={role} className={cn('text-center', isChanged && 'bg-primary/5')}>
                            {activeKeys.length === 0 ? (
                              <X className="mx-auto h-4 w-4 text-muted-foreground/30" />
                            ) : (
                              <div className="flex flex-wrap items-center justify-center gap-0.5">
                                {PERMISSION_FIELD_CONFIG.filter((field) => draftPermission[field.key]).map((field) => (
                                  <Badge
                                    key={field.key}
                                    variant="outline"
                                    className={`${field.color} px-1 py-0 text-[10px] font-bold`}
                                  >
                                    {field.label}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell
                          key={role}
                          className={cn(
                            'text-center',
                            isChanged && 'bg-primary/10 ring-1 ring-inset ring-primary/20'
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-center gap-0.5">
                            {PERMISSION_FIELD_CONFIG.map((field) => {
                              const isActive = draftPermission[field.key];
                              return (
                                <button
                                  key={field.key}
                                  type="button"
                                  onClick={() => togglePermission(permission.id, field.key)}
                                  className={cn(
                                    'inline-flex min-h-[22px] items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-bold transition-all',
                                    isActive
                                      ? `${field.activeColor} border-transparent`
                                      : 'border-transparent bg-muted/30 text-muted-foreground/40 hover:border-muted-foreground/20 hover:bg-muted/60'
                                  )}
                                  title={`${isActive ? 'Remove' : 'Add'} ${field.title} permission`}
                                >
                                  {field.label}
                                </button>
                              );
                            })}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {SYSTEM_ROLE_ORDER.map((role) => {
          const rolePermissions = Object.values(draft).filter((permission) => permission.role === role);
          const totalPerms = rolePermissions.reduce((total, permission) => total + getActivePermissionKeys(permission).length, 0);
          const moduleAccess = rolePermissions.filter((permission) => getActivePermissionKeys(permission).length > 0).length;
          return (
            <Card key={role}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="outline" className={SYSTEM_ROLE_CONFIG[role].color}>
                    {SYSTEM_ROLE_CONFIG[role].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {moduleAccess}/{modules.length}
                  </span>
                </div>
                <p className="text-2xl font-bold">{totalPerms}</p>
                <p className="text-xs text-muted-foreground">active permissions</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isEditing && hasChanges ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{changedCells.size}</span> permission row(s) modified
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDiscard}>
                Discard
              </Button>
              <Button size="sm" onClick={() => void handleSave()} disabled={updatePermission.isPending}>
                <Save className="mr-2 h-3.5 w-3.5" />
                {updatePermission.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
