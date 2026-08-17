import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Building2,
  Link2,
  Plus,
  Power,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserX,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from '@/lib/passwordPolicy';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { SearchInput } from '@/components/shared/SearchInput';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { UserScopeSelector } from '@/components/admin/UserScopeSelector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  useCreateUser,
  useAdminCrmDepartments,
  useAdminCrmEmployeeDetail,
  useAdminCrmEmployees,
  useLinkRecruiterToCompany,
  useRegenerateUserPassword,
  useUpdateUser,
  useUsers,
} from '@/hooks/use-admin-api';
import { useCompanies } from '@/hooks/use-employer-api';
import { TemporaryPasswordDialog } from '@/components/shared/TemporaryPasswordDialog';
import {
  getSecurityErrorMessage,
  getUserStatusLabel,
  getUserStatusVariant,
  SYSTEM_ROLE_CONFIG,
  SYSTEM_ROLE_ORDER,
} from '@/lib/securityModule';
import type {
  ApiCrmDepartmentOption,
  ApiCrmEmployeeOption,
  ApiUserListItem,
  CreateUserInput,
  UpdateUserInput,
  UserRole,
} from '@/types/admin';

const PAGE_SIZE = 20;
const CRM_TARGET_ROLES: UserRole[] = ['tpo_admin', 'faculty_coordinator'];
const INTERNAL_STAFF_ROLES: UserRole[] = ['tpo_admin', 'tpo_employee', 'faculty_coordinator', 'management'];
const ROLES_HIDDEN_FROM_CREATE: UserRole[] = ['student', 'tpo_employee', 'super_admin'];
// Both are official institute domains (CRM-fetched staff carry @socet.edu.in). Mirrored on the BE in
// admin.schema.ts — keep the two in sync.
const INSTITUTE_EMAIL_DOMAINS = ['@silveroakuni.ac.in', '@socet.edu.in'];
const INSTITUTE_EMAIL_DOMAINS_LABEL = INSTITUTE_EMAIL_DOMAINS.join(' or ');

function requiresInstituteEmail(role: UserRole) {
  return INTERNAL_STAFF_ROLES.includes(role);
}

type CrmSourceType = '' | '1' | '2';

function isCrmTargetRole(role: UserRole) {
  return CRM_TARGET_ROLES.includes(role);
}

function trimToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toCrmDepartmentOptions(items: ApiCrmDepartmentOption[] | undefined) {
  return (items ?? []).map((item) => ({
    value: String(item.id),
    label: item.departmentName,
    description: `ID ${item.id}`,
    keywords: [String(item.id)],
  }));
}

function toCrmEmployeeOptions(items: ApiCrmEmployeeOption[] | undefined) {
  return (items ?? []).map((item) => ({
    value: String(item.employeeCode),
    label: item.employeeName,
    description: `Code ${item.employeeCode}`,
    keywords: [String(item.employeeCode)],
  }));
}

function StatsCard({
  label,
  value,
  icon: Icon,
  colorClassName,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  colorClassName: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-8 w-8 ${colorClassName}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatLastLogin(timestamp: string | null) {
  return timestamp ? format(new Date(timestamp), 'dd MMM yyyy, HH:mm') : 'Never';
}

export default function UserManagementTab() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'name' | 'email' | 'role' | 'department' | 'is_active' | 'last_login_at'
  >('name', 'asc', () => setPage(1));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editUser, setEditUser] = useState<ApiUserListItem | null>(null);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'save'; user: ApiUserListItem }
    | { type: 'toggle'; user: ApiUserListItem }
    | null
  >(null);
  const [newUser, setNewUser] = useState<CreateUserInput>({
    name: '',
    email: '',
    password: '',
    role: 'student',
    phone: null,
    department: null,
    designation: null,
    crm_employee_code: null,
    institutes: [],
    courses: [],
    branches: [],
    company_id: null,
  });
  const [linkDialogUser, setLinkDialogUser] = useState<ApiUserListItem | null>(null);
  const [linkCompanyId, setLinkCompanyId] = useState('');
  const [editValues, setEditValues] = useState<UpdateUserInput>({
    name: '',
    role: 'student',
    phone: null,
    department: null,
    designation: null,
    crm_employee_code: null,
    is_active: true,
    institutes: [],
    courses: [],
    branches: [],
  });
  const [crmSourceType, setCrmSourceType] = useState<CrmSourceType>('');
  const [crmDepartmentId, setCrmDepartmentId] = useState('');
  const [crmEmployeeCode, setCrmEmployeeCode] = useState('');
  const [appliedCrmEmployeeCode, setAppliedCrmEmployeeCode] = useState('');

  const deferredSearch = useDeferredValue(search);

  const usersQuery = useUsers({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch || undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
    is_active: statusFilter === 'all' ? undefined : statusFilter,
    sort_by,
    sort_order,
  });
  const totalUsersQuery = useUsers({ page: 1, limit: 1 });
  const activeUsersQuery = useUsers({ page: 1, limit: 1, is_active: 'true' });
  const inactiveUsersQuery = useUsers({ page: 1, limit: 1, is_active: 'false' });
  const adminUsersQuery = useUsers({ page: 1, limit: 1, role: 'tpo_admin' });
  const superAdminUsersQuery = useUsers({ page: 1, limit: 1, role: 'super_admin' });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const linkRecruiter = useLinkRecruiterToCompany();
  const regeneratePassword = useRegenerateUserPassword();
  const [issuedPassword, setIssuedPassword] = useState<{ password: string; userLabel: string } | null>(null);
  const isCrmRole = isCrmTargetRole(newUser.role);
  const isRecruiterRole = newUser.role === 'recruiter';
  const companiesEnabled = isRecruiterRole || Boolean(linkDialogUser);
  const companiesQuery = useCompanies(companiesEnabled ? { page: 1, limit: 500, sort_by: 'name', sort_order: 'asc' } : {});
  const companyOptions = useMemo(() => {
    if (!companiesEnabled) return [] as { id: string; name: string }[];
    return (companiesQuery.data?.data ?? []).map((c) => ({ id: c.id, name: c.name }));
  }, [companiesEnabled, companiesQuery.data]);
  const crmDepartmentType = crmSourceType ? (Number(crmSourceType) as 1 | 2) : undefined;
  const crmDepartmentsQuery = useAdminCrmDepartments(isCrmRole ? crmDepartmentType : undefined);
  const crmEmployeesQuery = useAdminCrmEmployees(
    isCrmRole ? crmDepartmentType : undefined,
    crmDepartmentId ? Number(crmDepartmentId) : undefined,
  );
  const crmEmployeeDetailQuery = useAdminCrmEmployeeDetail(
    isCrmRole && crmEmployeeCode ? Number(crmEmployeeCode) : undefined,
  );
  const crmDepartmentOptions = useMemo(() => toCrmDepartmentOptions(crmDepartmentsQuery.data), [crmDepartmentsQuery.data]);
  const crmEmployeeOptions = useMemo(() => toCrmEmployeeOptions(crmEmployeesQuery.data), [crmEmployeesQuery.data]);

  const users = usersQuery.data?.data ?? [];
  const pagination = usersQuery.data?.pagination;
  const stats = {
    total: totalUsersQuery.data?.pagination.total ?? 0,
    active: activeUsersQuery.data?.pagination.total ?? 0,
    inactive: inactiveUsersQuery.data?.pagination.total ?? 0,
    admins: (adminUsersQuery.data?.pagination.total ?? 0) + (superAdminUsersQuery.data?.pagination.total ?? 0),
  };

  const errorMessage = useMemo(() => {
    const errors = [
      usersQuery.error,
      totalUsersQuery.error,
      activeUsersQuery.error,
      inactiveUsersQuery.error,
      adminUsersQuery.error,
      superAdminUsersQuery.error,
    ].filter(Boolean);

    return errors.length > 0
      ? getSecurityErrorMessage(errors[0], 'Unable to load users.')
      : null;
  }, [
    activeUsersQuery.error,
    adminUsersQuery.error,
    inactiveUsersQuery.error,
    superAdminUsersQuery.error,
    totalUsersQuery.error,
    usersQuery.error,
  ]);

  useEffect(() => {
    const detail = crmEmployeeDetailQuery.data;
    if (!showAddDialog || !isCrmRole || !detail) return;

    const detailEmployeeCode = String(detail.employeeCode);
    if (crmEmployeeCode !== detailEmployeeCode || appliedCrmEmployeeCode === detailEmployeeCode) return;

    setNewUser((current) => ({
      ...current,
      name: detail.employeeName || current.name,
      email: detail.officialEmail || detail.personalEmail || current.email,
      phone: detail.mobileNo || current.phone,
      department: detail.department || current.department,
      designation: detail.designation || current.designation,
      crm_employee_code: detailEmployeeCode,
    }));
    setAppliedCrmEmployeeCode(detailEmployeeCode);
  }, [
    appliedCrmEmployeeCode,
    crmEmployeeCode,
    crmEmployeeDetailQuery.data,
    isCrmRole,
    showAddDialog,
  ]);

  function resetNewUser() {
    setNewUser({
      name: '',
      email: '',
      password: '',
      role: 'student',
      phone: null,
      department: null,
      designation: null,
      crm_employee_code: null,
      institutes: [],
      courses: [],
      branches: [],
      company_id: null,
    });
    setCrmSourceType('');
    setCrmDepartmentId('');
    setCrmEmployeeCode('');
    setAppliedCrmEmployeeCode('');
  }

  function openEditDialog(user: ApiUserListItem) {
    setEditUser(user);
    setEditValues({
      name: user.name,
      role: user.role,
      phone: user.phone,
      department: user.department,
      designation: user.designation,
      crm_employee_code: user.crm_employee_code,
      is_active: user.is_active,
      institutes: user.institutes ?? [],
      courses: user.courses ?? [],
      branches: user.branches ?? [],
    });
  }

  async function handleCreateUser() {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      toast.error('Please fill in the required user fields.');
      return;
    }

    if (newUser.role === 'recruiter' && !newUser.company_id) {
      toast.error('Please select a company for the recruiter.');
      return;
    }

    if (requiresInstituteEmail(newUser.role)) {
      const email = newUser.email.trim().toLowerCase();
      if (!INSTITUTE_EMAIL_DOMAINS.some((domain) => email.endsWith(domain))) {
        toast.error(`TPO, Faculty and Management accounts must use a ${INSTITUTE_EMAIL_DOMAINS_LABEL} email address.`);
        return;
      }
    }

    const passwordPolicyError = getPasswordPolicyError(newUser.password);
    if (passwordPolicyError) {
      toast.error(passwordPolicyError);
      return;
    }

    try {
      await createUser.mutateAsync({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
        phone: trimToNull(newUser.phone),
        department: trimToNull(newUser.department) ?? newUser.branches?.[0] ?? null,
        designation: trimToNull(newUser.designation),
        crm_employee_code: trimToNull(newUser.crm_employee_code),
        institutes: newUser.institutes ?? [],
        courses: newUser.courses ?? [],
        branches: newUser.branches ?? [],
        company_id: newUser.role === 'recruiter' ? newUser.company_id ?? null : null,
      });
      toast.success('User created successfully.');
      setShowAddDialog(false);
      resetNewUser();
      setPage(1);
    } catch (error) {
      toast.error(getSecurityErrorMessage(error, 'Unable to create the user.'));
    }
  }

  function openLinkDialog(user: ApiUserListItem) {
    setLinkDialogUser(user);
    setLinkCompanyId(user.recruiter_profile?.company_id ?? '');
  }

  async function handleLinkRecruiter() {
    if (!linkDialogUser) return;
    if (!linkCompanyId) {
      toast.error('Please select a company.');
      return;
    }
    try {
      await linkRecruiter.mutateAsync({
        userId: linkDialogUser.id,
        data: { company_id: linkCompanyId },
      });
      toast.success('Recruiter linked to company.');
      setLinkDialogUser(null);
      setLinkCompanyId('');
    } catch (error) {
      toast.error(getSecurityErrorMessage(error, 'Unable to link recruiter.'));
    }
  }

  async function handleUpdateUser() {
    if (!editUser) return;
    if (!editValues.name?.trim()) {
      toast.error('Name is required.');
      return;
    }

    setPendingAction({ type: 'save', user: editUser });
  }

  async function handleToggleStatus(user: ApiUserListItem) {
    setPendingAction({ type: 'toggle', user });
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;

    try {
      if (pendingAction.type === 'save' && editUser) {
        await updateUser.mutateAsync({
          userId: editUser.id,
          data: {
            name: editValues.name.trim(),
            role: editValues.role,
            phone: trimToNull(editValues.phone),
            department: trimToNull(editValues.department) ?? editValues.branches?.[0] ?? null,
            designation: trimToNull(editValues.designation),
            crm_employee_code: trimToNull(editValues.crm_employee_code),
            institutes: editValues.institutes ?? [],
            courses: editValues.courses ?? [],
            branches: editValues.branches ?? [],
            is_active: editValues.is_active,
          },
        });
        toast.success('User updated successfully.');
        setEditUser(null);
      } else if (pendingAction.type === 'toggle') {
        const nextActive = !pendingAction.user.is_active;
        const isRecruiterReactivation = nextActive && pendingAction.user.role === 'recruiter';

        if (isRecruiterReactivation) {
          const result = await regeneratePassword.mutateAsync(pendingAction.user.id);
          await updateUser.mutateAsync({
            userId: pendingAction.user.id,
            data: { is_active: true },
          });
          setIssuedPassword({
            password: result.temporary_password,
            userLabel: pendingAction.user.email,
          });
          toast.success(`${pendingAction.user.name} is active again. Share the temporary password shown next.`);
        } else {
          await updateUser.mutateAsync({
            userId: pendingAction.user.id,
            data: { is_active: nextActive },
          });
          toast.success(`${pendingAction.user.name} is now ${nextActive ? 'active' : 'inactive'}.`);
        }
      }
      setPendingAction(null);
    } catch (error) {
      toast.error(getSecurityErrorMessage(error, 'Unable to update the user.'));
    }
  }

  if (usersQuery.isLoading && !usersQuery.data) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatsCard label="Total Users" value={stats.total} icon={Users} colorClassName="text-primary" />
        <StatsCard label="Active" value={stats.active} icon={UserCheck} colorClassName="text-emerald-600" />
        <StatsCard label="Inactive" value={stats.inactive} icon={UserX} colorClassName="text-destructive" />
        <StatsCard label="Admins" value={stats.admins} icon={ShieldCheck} colorClassName="text-amber-600" />
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <Users className="h-4 w-4" />
          <AlertTitle>Unable to load user management data</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">All Users</CardTitle>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Search by name or email..."
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value as 'all' | UserRole);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
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
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as 'all' | 'true' | 'false');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {usersQuery.isFetching && !usersQuery.isLoading ? (
            <div className="border-b px-6 py-3 text-sm text-muted-foreground">Refreshing users...</div>
          ) : null}

          {users.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No users found"
                description="Try adjusting the current search or filters."
                compact
              />
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label="Name" columnKey="name" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Email" columnKey="email" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Role" columnKey="role" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Department" columnKey="department" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Status" columnKey="is_active" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Last Login" columnKey="last_login_at" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const roleConfig = SYSTEM_ROLE_CONFIG[user.role];
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleConfig.color}>
                            {roleConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{user.department || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={getUserStatusVariant(user)}>
                            {getUserStatusLabel(user)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatLastLogin(user.last_login_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {user.role === 'recruiter' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openLinkDialog(user)}
                                title={user.recruiter_profile ? 'Change company link' : 'Link to company (recruiter has no company)'}
                              >
                                {user.recruiter_profile ? (
                                  <Building2 className="h-4 w-4" />
                                ) : (
                                  <Link2 className="h-4 w-4 text-amber-600" />
                                )}
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(user)}
                              title="Edit user"
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleToggleStatus(user)}
                              title={user.is_active ? 'Deactivate user' : 'Activate user'}
                              disabled={updateUser.isPending}
                            >
                              <Power className={`h-4 w-4 ${user.is_active ? 'text-destructive' : 'text-emerald-600'}`} />
                            </Button>
                          </div>
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
                ? `Showing ${users.length} user${users.length === 1 ? '' : 's'} on page ${pagination.page} of ${Math.max(pagination.totalPages, 1)}`
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

      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            resetNewUser();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser((current) => ({ ...current, role: value as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_ROLE_ORDER.filter((role) => !ROLES_HIDDEN_FROM_CREATE.includes(role)).map((role) => (
                    <SelectItem key={role} value={role}>
                      {SYSTEM_ROLE_CONFIG[role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isCrmRole ? (
              <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">CRM Autofill</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose Academic or HR, then select a department and employee. The ERP data autofills the
                    form; ERP-fetched fields are read-only and cannot be edited.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Source Type</Label>
                    <Select
                      value={crmSourceType}
                      onValueChange={(value) => {
                        const nextValue = value as CrmSourceType;
                        setCrmSourceType(nextValue);
                        setCrmDepartmentId('');
                        setCrmEmployeeCode('');
                        setAppliedCrmEmployeeCode('');
                        setNewUser((current) => ({
                          ...current,
                          name: '',
                          email: '',
                          phone: null,
                          department: null,
                          designation: null,
                          crm_employee_code: null,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Academic</SelectItem>
                        <SelectItem value="2">HR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Department</Label>
                    <SearchableSelect
                      options={crmDepartmentOptions}
                      value={crmDepartmentId}
                      onValueChange={(value) => {
                        setCrmDepartmentId(value);
                        setCrmEmployeeCode('');
                        setAppliedCrmEmployeeCode('');
                        setNewUser((current) => ({
                          ...current,
                          name: '',
                          email: '',
                          phone: null,
                          department: null,
                          designation: null,
                          crm_employee_code: null,
                        }));
                      }}
                      placeholder={crmDepartmentType ? 'Select department' : 'Select source first'}
                      searchPlaceholder="Search department..."
                      emptyMessage="No departments found."
                      loadingMessage="Loading departments..."
                      isLoading={crmDepartmentsQuery.isLoading}
                      disabled={!crmDepartmentType || crmDepartmentsQuery.isLoading}
                      clearable
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <SearchableSelect
                      options={crmEmployeeOptions}
                      value={crmEmployeeCode}
                      onValueChange={(value) => {
                        setCrmEmployeeCode(value);
                        setAppliedCrmEmployeeCode('');
                        if (!value) {
                          setNewUser((current) => ({
                            ...current,
                            name: '',
                            email: '',
                            phone: null,
                            department: null,
                            designation: null,
                            crm_employee_code: null,
                          }));
                        }
                      }}
                      placeholder={crmDepartmentId ? 'Select employee' : 'Select department first'}
                      searchPlaceholder="Search employee..."
                      emptyMessage="No employees found."
                      loadingMessage="Loading employees..."
                      isLoading={crmEmployeesQuery.isLoading}
                      disabled={!crmDepartmentId || crmEmployeesQuery.isLoading}
                      clearable
                    />
                  </div>
                </div>

                {(crmDepartmentsQuery.error || crmEmployeesQuery.error || crmEmployeeDetailQuery.error) ? (
                  <Alert variant="destructive">
                    <AlertTitle>Unable to load CRM data</AlertTitle>
                    <AlertDescription>
                      You can still enter the user details manually if CRM lookup is unavailable.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-user-name">Full Name *</Label>
                <Input
                  id="new-user-name"
                  value={newUser.name}
                  onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Enter full name"
                  readOnly={Boolean(newUser.crm_employee_code)}
                  className={newUser.crm_employee_code ? 'bg-muted' : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-email">Email *</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  value={newUser.email}
                  onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
                  placeholder={requiresInstituteEmail(newUser.role) ? `name${INSTITUTE_EMAIL_DOMAINS[0]}` : 'Enter email address'}
                  readOnly={Boolean(newUser.crm_employee_code)}
                  className={newUser.crm_employee_code ? 'bg-muted' : undefined}
                />
                {requiresInstituteEmail(newUser.role) ? (
                  <p className="text-xs text-muted-foreground">
                    Must end with <span className="font-medium">{INSTITUTE_EMAIL_DOMAINS_LABEL}</span> for {SYSTEM_ROLE_CONFIG[newUser.role].label} accounts.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-phone">Phone</Label>
                <Input
                  id="new-user-phone"
                  type="tel"
                  value={newUser.phone ?? ''}
                  onChange={(event) => setNewUser((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="Enter phone number"
                  readOnly={Boolean(newUser.crm_employee_code)}
                  className={newUser.crm_employee_code ? 'bg-muted' : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-designation">Designation</Label>
                <Input
                  id="new-user-designation"
                  value={newUser.designation ?? ''}
                  onChange={(event) => setNewUser((current) => ({ ...current, designation: event.target.value }))}
                  placeholder="Enter designation"
                  readOnly={Boolean(newUser.crm_employee_code)}
                  className={newUser.crm_employee_code ? 'bg-muted' : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-department">Department</Label>
                <Input
                  id="new-user-department"
                  value={newUser.department ?? ''}
                  onChange={(event) => setNewUser((current) => ({ ...current, department: event.target.value }))}
                  placeholder="Enter department"
                  readOnly={Boolean(newUser.crm_employee_code)}
                  className={newUser.crm_employee_code ? 'bg-muted' : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-password">Password *</Label>
                <Input
                  id="new-user-password"
                  type="password"
                  value={newUser.password}
                  onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Set a password"
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
              </div>
              {isRecruiterRole ? (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="new-user-company">Company *</Label>
                  <Select
                    value={newUser.company_id ?? ''}
                    onValueChange={(value) => setNewUser((current) => ({ ...current, company_id: value || null }))}
                  >
                    <SelectTrigger id="new-user-company">
                      <SelectValue
                        placeholder={
                          companiesQuery.isLoading
                            ? 'Loading companies...'
                            : companyOptions.length === 0
                              ? 'No companies available'
                              : 'Select a company'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {companyOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Required for recruiter accounts. The user will be linked to this company on creation.
                  </p>
                </div>
              ) : null}
              <div className="md:col-span-2">
                <UserScopeSelector
                  targetInstitutes={newUser.institutes ?? []}
                  targetBranches={newUser.branches ?? []}
                  targetCourses={newUser.courses ?? []}
                  onTargetInstitutesChange={(values) => setNewUser((current) => ({ ...current, institutes: values }))}
                  onTargetBranchesChange={(values) => setNewUser((current) => ({ ...current, branches: values }))}
                  onTargetCoursesChange={(values) => setNewUser((current) => ({ ...current, courses: values }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateUser()} disabled={createUser.isPending}>
              {createUser.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(linkDialogUser)}
        onOpenChange={(open) => {
          if (!open) {
            setLinkDialogUser(null);
            setLinkCompanyId('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Recruiter to Company</DialogTitle>
          </DialogHeader>
          {linkDialogUser ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">{linkDialogUser.name}</p>
                <p className="text-muted-foreground">{linkDialogUser.email}</p>
                {linkDialogUser.recruiter_profile?.company ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Currently linked to: {linkDialogUser.recruiter_profile.company.name}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-destructive">
                    Not currently linked to any company.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-company">Company *</Label>
                <Select value={linkCompanyId} onValueChange={(value) => setLinkCompanyId(value)}>
                  <SelectTrigger id="link-company">
                    <SelectValue
                      placeholder={
                        companiesQuery.isLoading
                          ? 'Loading companies...'
                          : companyOptions.length === 0
                            ? 'No companies available'
                            : 'Select a company'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {companyOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogUser(null)} disabled={linkRecruiter.isPending}>
              Cancel
            </Button>
            <Button onClick={() => void handleLinkRecruiter()} disabled={linkRecruiter.isPending}>
              {linkRecruiter.isPending ? 'Saving...' : 'Save Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editUser)}
        onOpenChange={(open) => {
          if (!open) {
            setEditUser(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          {editUser ? (
            <div className="grid gap-4 py-2 md:grid-cols-2">
              {editUser.crm_employee_code ? (
                <p className="text-xs text-muted-foreground md:col-span-2">
                  Name, email, phone, designation and department are fetched from the ERP and are read-only.
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="edit-user-name">Full Name</Label>
                <Input
                  id="edit-user-name"
                  value={editValues.name ?? ''}
                  onChange={(event) => setEditValues((current) => ({ ...current, name: event.target.value }))}
                  readOnly={Boolean(editUser.crm_employee_code)}
                  className={editUser.crm_employee_code ? 'bg-muted' : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-email">Email</Label>
                <Input id="edit-user-email" value={editUser.email} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-phone">Phone</Label>
                <Input
                  id="edit-user-phone"
                  type="tel"
                  value={editValues.phone ?? ''}
                  onChange={(event) => setEditValues((current) => ({ ...current, phone: event.target.value }))}
                  readOnly={Boolean(editUser.crm_employee_code)}
                  className={editUser.crm_employee_code ? 'bg-muted' : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-designation">Designation</Label>
                <Input
                  id="edit-user-designation"
                  value={editValues.designation ?? ''}
                  onChange={(event) => setEditValues((current) => ({ ...current, designation: event.target.value }))}
                  readOnly={Boolean(editUser.crm_employee_code)}
                  className={editUser.crm_employee_code ? 'bg-muted' : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-department">Department</Label>
                <Input
                  id="edit-user-department"
                  value={editValues.department ?? ''}
                  onChange={(event) => setEditValues((current) => ({ ...current, department: event.target.value }))}
                  readOnly={Boolean(editUser.crm_employee_code)}
                  className={editUser.crm_employee_code ? 'bg-muted' : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editValues.role ?? editUser.role}
                  onValueChange={(value) => setEditValues((current) => ({ ...current, role: value as UserRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SYSTEM_ROLE_ORDER.map((role) => (
                      <SelectItem key={role} value={role}>
                        {SYSTEM_ROLE_CONFIG[role].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <UserScopeSelector
                targetInstitutes={editValues.institutes ?? []}
                targetBranches={editValues.branches ?? []}
                targetCourses={editValues.courses ?? []}
                onTargetInstitutesChange={(values) => setEditValues((current) => ({ ...current, institutes: values }))}
                onTargetBranchesChange={(values) => setEditValues((current) => ({ ...current, branches: values }))}
                onTargetCoursesChange={(values) => setEditValues((current) => ({ ...current, courses: values }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={String(editValues.is_active ?? editUser.is_active)}
                  onValueChange={(value) => setEditValues((current) => ({ ...current, is_active: value === 'true' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpdateUser()} disabled={updateUser.isPending}>
              {updateUser.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={
          pendingAction?.type === 'save'
            ? `Save changes for ${pendingAction.user.name}?`
            : `${pendingAction?.user.is_active ? 'Deactivate' : 'Activate'} ${pendingAction?.user.name}?`
        }
        description={
          pendingAction?.type === 'save'
            ? 'This will update the user profile, role, and scope settings.'
            : pendingAction?.type === 'toggle' &&
                !pendingAction.user.is_active &&
                pendingAction.user.role === 'recruiter'
              ? 'Activating will generate a new temporary password for the recruiter — shown only once.'
              : `This will mark the user as ${pendingAction?.user.is_active ? 'inactive' : 'active'}.`
        }
        confirmLabel={pendingAction?.type === 'save' ? 'Save Changes' : pendingAction?.user.is_active ? 'Deactivate' : 'Activate'}
        confirmVariant={pendingAction?.type === 'toggle' && pendingAction.user.is_active ? 'destructive' : 'default'}
        isPending={updateUser.isPending || regeneratePassword.isPending}
        onConfirm={handleConfirmAction}
      />

      <TemporaryPasswordDialog
        open={Boolean(issuedPassword)}
        onOpenChange={(open) => {
          if (!open) setIssuedPassword(null);
        }}
        password={issuedPassword?.password ?? null}
        userLabel={issuedPassword?.userLabel}
      />
    </div>
  );
}
