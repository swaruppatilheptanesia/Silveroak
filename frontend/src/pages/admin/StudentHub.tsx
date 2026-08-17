import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users, UserCheck, ListFilter, FolderKanban, Database } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminStudents } from '@/hooks/use-admin-api';
import { hasAnyPermission, hasPermission } from '@/lib/permissionModule';

// Import tab content components
import StudentListTab from '@/components/admin/StudentListTab';
import VerificationTab from '@/components/admin/VerificationTab';
import EligibilityRulesTab from '@/components/admin/EligibilityRulesTab';
import PortfolioMonitoringTab from '@/components/admin/PortfolioMonitoringTab';
import SelectionDatabaseTab from '@/components/admin/SelectionDatabaseTab';

export default function StudentHub() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const permissions = user?.permissions ?? [];
  const canViewStudents = hasPermission(permissions, { module: 'students', action: 'view' }, user?.role);
  const canViewVerification = hasAnyPermission(
    permissions,
    [
      { module: 'student_verification', action: 'view' },
      { module: 'student_verification', action: 'approve' },
    ],
    user?.role,
  );
  const canViewRules = hasPermission(permissions, { module: 'eligibility_rules', action: 'view' }, user?.role);
  const canViewPortfolios = hasPermission(permissions, { module: 'portfolios', action: 'view' }, user?.role);
  const canViewSelectionDatabase = hasPermission(permissions, { module: 'selection_database', action: 'view' }, user?.role);

  const accessibleTabs = useMemo(() => {
    return [
      canViewStudents ? 'all' : null,
      canViewVerification ? 'verification' : null,
      canViewRules ? 'rules' : null,
      canViewPortfolios ? 'portfolio' : null,
      canViewSelectionDatabase ? 'selections' : null,
    ].filter((tab): tab is string => Boolean(tab));
  }, [canViewPortfolios, canViewRules, canViewSelectionDatabase, canViewStudents, canViewVerification]);

  const requestedTab = searchParams.get('tab');
  const activeTab = accessibleTabs.includes(requestedTab ?? '') ? (requestedTab ?? '') : (accessibleTabs[0] ?? '');

  useEffect(() => {
    if (accessibleTabs.length > 0 && requestedTab !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [accessibleTabs, activeTab, requestedTab, setSearchParams]);

  const pendingStudentsQuery = useAdminStudents({
    verification_status: 'pending',
    page: 1,
    limit: 1,
  }, canViewVerification);
  const pendingCount = pendingStudentsQuery.data?.pagination.total ?? 0;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (accessibleTabs.length === 0) {
    return (
      <DashboardLayout
        title="Student Management"
        subtitle="Manage students, verifications, and eligibility rules"
      >
        <EmptyState
          icon={Users}
          title="No student access assigned"
          description="Ask the super admin to grant at least one student-management permission for your role."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Student Management" 
      subtitle="Manage students, verifications, and eligibility rules"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto lg:w-auto lg:inline-grid lg:grid-cols-5">
          {canViewStudents ? (
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">All Students</span>
              <span className="sm:hidden">All</span>
            </TabsTrigger>
          ) : null}
          {canViewVerification ? (
            <TabsTrigger value="verification" className="gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Verification</span>
              <span className="sm:hidden">Verify</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          ) : null}
          {canViewRules ? (
            <TabsTrigger value="rules" className="gap-2">
              <ListFilter className="h-4 w-4" />
              <span className="hidden sm:inline">Eligibility Rules</span>
              <span className="sm:hidden">Rules</span>
            </TabsTrigger>
          ) : null}
          {canViewPortfolios ? (
            <TabsTrigger value="portfolio" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              <span className="hidden sm:inline">Portfolios</span>
              <span className="sm:hidden">Portfolio</span>
            </TabsTrigger>
          ) : null}
          {canViewSelectionDatabase ? (
            <TabsTrigger value="selections" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Selection Database</span>
              <span className="sm:hidden">Selections</span>
            </TabsTrigger>
          ) : null}
        </TabsList>

        {canViewStudents ? (
          <TabsContent value="all" className="space-y-6">
            <StudentListTab />
          </TabsContent>
        ) : null}

        {canViewVerification ? (
          <TabsContent value="verification" className="space-y-6">
            <VerificationTab />
          </TabsContent>
        ) : null}

        {canViewRules ? (
          <TabsContent value="rules" className="space-y-6">
            <EligibilityRulesTab />
          </TabsContent>
        ) : null}

        {canViewPortfolios ? (
          <TabsContent value="portfolio" className="space-y-6">
            <PortfolioMonitoringTab />
          </TabsContent>
        ) : null}

        {canViewSelectionDatabase ? (
          <TabsContent value="selections" className="space-y-6">
            <SelectionDatabaseTab />
          </TabsContent>
        ) : null}
      </Tabs>
    </DashboardLayout>
  );
}
