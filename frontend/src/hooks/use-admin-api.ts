/**
 * React Query hooks for the Admin API module.
 * Covers user management, audit logs, permissions.
 */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { masterService } from '@/services/masterService';
import type {
  AdminPortfolioQueryParams,
  AdminStudentQueryParams,
  BulkVerifyStudentsInput,
  CreateAdminEligibilityRuleInput,
  UserQueryParams,
  CreateUserInput,
  LinkRecruiterToCompanyInput,
  UpdateUserInput,
  AuditLogQueryParams,
  InterestRegistrationsQueryParams,
  SelectionDatabaseQueryParams,
  UpdateAdminEligibilityRuleInput,
  UpdatePermissionInput,
  UpdateStudentProfileBlockInput,
  ReopenPlacementInput,
  VerifyStudentInput,
} from '@/types/admin';
import { masterKeys } from '@/hooks/use-master-api';

// ── Query Keys ─────────────────────────────────────────

export const adminKeys = {
  all: ['admin'] as const,
  usersBase: () => [...adminKeys.all, 'users'] as const,
  users: (params: UserQueryParams) => [...adminKeys.all, 'users', params] as const,
  userDetail: (id: string) => [...adminKeys.all, 'user', id] as const,
  studentsBase: () => [...adminKeys.all, 'students'] as const,
  students: (params: AdminStudentQueryParams) => [...adminKeys.studentsBase(), params] as const,
  studentDetail: (id: string) => [...adminKeys.studentsBase(), 'detail', id] as const,
  auditLogs: (params: AuditLogQueryParams) => [...adminKeys.all, 'auditLogs', params] as const,
  permissions: () => [...adminKeys.all, 'permissions'] as const,
  eligibilityRules: () => [...adminKeys.all, 'eligibility-rules'] as const,
  portfolios: (params: AdminPortfolioQueryParams) => [...adminKeys.all, 'portfolios', params] as const,
  selectionDatabase: (params: SelectionDatabaseQueryParams) => [...adminKeys.all, 'selection-database', params] as const,
  interestSummary: () => [...adminKeys.all, 'interest-summary'] as const,
  recentInterestRegistrations: () => [...adminKeys.all, 'interest-registrations-recent'] as const,
  interestRegistrationsBase: () => [...adminKeys.all, 'interest-registrations'] as const,
  interestRegistrations: (params: InterestRegistrationsQueryParams) =>
    [...adminKeys.interestRegistrationsBase(), params] as const,
  crmDepartments: (departmentType: 1 | 2) => [...adminKeys.all, 'crm', 'departments', departmentType] as const,
  crmEmployees: (departmentType: 1 | 2, departmentId: number) =>
    [...adminKeys.all, 'crm', 'employees', departmentType, departmentId] as const,
  crmEmployeeDetail: (employeeCode: number) => [...adminKeys.all, 'crm', 'employee', employeeCode] as const,
};

// ── User Management Hooks ──────────────────────────────

export function useUsers(params: UserQueryParams = {}) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminService.getUsers(params),
    staleTime: 2 * 60 * 1000,
    // Keep prior results while a new search/filter/page key fetches, so the list never
    // drops to `data: undefined`. That `undefined` was tripping the All-Users tab's early
    // `<PageLoader />` return, which remounted the search box and stole focus mid-typing.
    placeholderData: keepPreviousData,
  });
}

export function useUserDetail(userId: string) {
  return useQuery({
    queryKey: adminKeys.userDetail(userId),
    queryFn: () => adminService.getUserDetail(userId),
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) => adminService.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserInput }) =>
      adminService.updateUser(userId, data),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
      qc.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
    },
  });
}

export function useLinkRecruiterToCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: LinkRecruiterToCompanyInput }) =>
      adminService.linkRecruiterToCompany(userId, data),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
      qc.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
    },
  });
}

export function useRegenerateUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminService.regenerateUserPassword(userId),
    onSuccess: (_, userId) => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
      qc.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
    },
  });
}

export function useAdminCrmDepartments(departmentType?: 1 | 2) {
  return useQuery({
    queryKey: departmentType ? adminKeys.crmDepartments(departmentType) : [...adminKeys.all, 'crm', 'departments', 'idle'] as const,
    queryFn: () => adminService.getCrmDepartments(departmentType as 1 | 2),
    enabled: departmentType === 1 || departmentType === 2,
    staleTime: 30 * 60 * 1000,
  });
}

export function useAdminCrmEmployees(departmentType?: 1 | 2, departmentId?: number) {
  return useQuery({
    queryKey:
      departmentType && departmentId
        ? adminKeys.crmEmployees(departmentType, departmentId)
        : [...adminKeys.all, 'crm', 'employees', 'idle'] as const,
    queryFn: () => adminService.getCrmEmployees(departmentType as 1 | 2, departmentId as number),
    enabled: (departmentType === 1 || departmentType === 2) && Number.isFinite(departmentId),
    staleTime: 30 * 60 * 1000,
  });
}

export function useAdminCrmEmployeeDetail(employeeCode?: number) {
  return useQuery({
    queryKey: employeeCode ? adminKeys.crmEmployeeDetail(employeeCode) : [...adminKeys.all, 'crm', 'employee', 'idle'] as const,
    queryFn: () => adminService.getCrmEmployeeDetail(employeeCode as number),
    enabled: Number.isFinite(employeeCode),
    staleTime: 30 * 60 * 1000,
  });
}

// ── Audit Log Hooks ────────────────────────────────────

export function useAuditLogs(params: AuditLogQueryParams = {}) {
  return useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: () => adminService.getAuditLogs(params),
    staleTime: 30 * 1000,
  });
}

// ── Permission Hooks ───────────────────────────────────

export function usePermissions() {
  return useQuery({
    queryKey: adminKeys.permissions(),
    queryFn: () => adminService.getPermissions(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ permissionId, data }: { permissionId: string; data: UpdatePermissionInput }) =>
      adminService.updatePermission(permissionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.permissions() });
    },
  });
}

// ── Student Management Hooks ──────────────────────────

export function useAdminStudents(params: AdminStudentQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: adminKeys.students(params),
    queryFn: () => adminService.getStudents(params),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useAdminStudentDetail(studentId: string) {
  return useQuery({
    queryKey: adminKeys.studentDetail(studentId),
    queryFn: () => adminService.getStudentDetail(studentId),
    enabled: !!studentId,
  });
}

export function useVerifyAdminStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: string; data: VerifyStudentInput }) =>
      adminService.verifyStudent(studentId, data),
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: adminKeys.studentsBase() });
      qc.invalidateQueries({ queryKey: adminKeys.studentDetail(studentId) });
      qc.invalidateQueries({ queryKey: adminKeys.interestRegistrationsBase() });
    },
  });
}

export function useUpdateStudentProfileBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: string; data: UpdateStudentProfileBlockInput }) =>
      adminService.updateStudentProfileBlock(studentId, data),
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: adminKeys.studentsBase() });
      qc.invalidateQueries({ queryKey: adminKeys.studentDetail(studentId) });
    },
  });
}

export function useReopenStudentPlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: string; data: ReopenPlacementInput }) =>
      adminService.reopenStudentPlacement(studentId, data),
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: adminKeys.studentsBase() });
      qc.invalidateQueries({ queryKey: adminKeys.studentDetail(studentId) });
    },
  });
}

export function useBulkVerifyAdminStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkVerifyStudentsInput) => adminService.bulkVerifyStudents(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.studentsBase() });
      qc.invalidateQueries({ queryKey: adminKeys.interestRegistrationsBase() });
    },
  });
}

// ── Eligibility Rule Hooks ────────────────────────────

export function useAdminEligibilityRules() {
  return useQuery({
    queryKey: adminKeys.eligibilityRules(),
    queryFn: () => adminService.getEligibilityRules(),
    staleTime: 60 * 1000,
  });
}

export function useCreateAdminEligibilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdminEligibilityRuleInput) => adminService.createEligibilityRule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.eligibilityRules() });
    },
  });
}

export function useUpdateAdminEligibilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: string; data: UpdateAdminEligibilityRuleInput }) =>
      adminService.updateEligibilityRule(ruleId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.eligibilityRules() });
    },
  });
}

export function useDeleteAdminEligibilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => adminService.deleteEligibilityRule(ruleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.eligibilityRules() });
    },
  });
}

// ── Portfolio Monitoring Hooks ────────────────────────

export function useAdminPortfolios(params: AdminPortfolioQueryParams = {}) {
  return useQuery({
    queryKey: adminKeys.portfolios(params),
    queryFn: () => adminService.getPortfolios(params),
    staleTime: 60 * 1000,
  });
}

export function useAdminDepartmentOptions() {
  return useQuery({
    queryKey: masterKeys.publicValues('branch'),
    queryFn: async () => {
      const payload = await masterService.getMasters({ category: 'branch' });
      return payload.map((item) => item.value);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Selection Database Hooks ──────────────────────────

export function useAdminSelectionDatabase(params: SelectionDatabaseQueryParams = {}) {
  return useQuery({
    queryKey: adminKeys.selectionDatabase(params),
    queryFn: () => adminService.getSelectionDatabase(params),
    staleTime: 60 * 1000,
  });
}

// ── Interest List Hooks ───────────────────────────────

export function useAdminInterestSummary() {
  return useQuery({
    queryKey: adminKeys.interestSummary(),
    queryFn: () => adminService.getInterestSummary(),
    staleTime: 60 * 1000,
  });
}

export function useAdminRecentInterestRegistrations() {
  return useQuery({
    queryKey: adminKeys.recentInterestRegistrations(),
    queryFn: () => adminService.getRecentInterestRegistrations(),
    staleTime: 60 * 1000,
  });
}

export function useAdminInterestRegistrations(params: InterestRegistrationsQueryParams = {}) {
  return useQuery({
    queryKey: adminKeys.interestRegistrations(params),
    queryFn: () => adminService.getInterestRegistrations(params),
    staleTime: 60 * 1000,
  });
}

function invalidateInterestQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: adminKeys.interestRegistrationsBase() });
  qc.invalidateQueries({ queryKey: adminKeys.interestSummary() });
  qc.invalidateQueries({ queryKey: adminKeys.studentsBase() });
}

export function useApproveInterestRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.approveInterestRegistration(id),
    onSuccess: () => invalidateInterestQueries(qc),
  });
}

export function useWithdrawInterestRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminService.withdrawInterestRegistration(id, reason),
    onSuccess: () => invalidateInterestQueries(qc),
  });
}
