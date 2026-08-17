import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRecruiters } from '@/hooks/use-employer-api';
import { hasAnyPermission, hasPermission } from '@/lib/permissionModule';

// Import tab content components
import CompanyListTab from '@/components/admin/CompanyListTab';
import RecruiterListTab from '@/components/admin/RecruiterListTab';

export default function EmployerHub() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const permissions = user?.permissions ?? [];
  const canViewCompanies = hasPermission(permissions, { module: 'companies', action: 'view' }, user?.role);
  const canViewRecruiters = hasPermission(permissions, { module: 'recruiters', action: 'view' }, user?.role);
  const canReviewRecruiters = hasAnyPermission(
    permissions,
    [
      { module: 'recruiters', action: 'view' },
      { module: 'recruiters', action: 'approve' },
    ],
    user?.role,
  );
  const accessibleTabs = useMemo(() => {
    return [
      canViewCompanies ? 'companies' : null,
      canViewRecruiters ? 'recruiters' : null,
    ].filter((tab): tab is string => Boolean(tab));
  }, [canViewCompanies, canViewRecruiters]);
  const requestedTab = searchParams.get('tab');
  const activeTab = accessibleTabs.includes(requestedTab ?? '') ? (requestedTab ?? '') : (accessibleTabs[0] ?? '');
  const pendingRecruitersQuery = useRecruiters({
    page: 1,
    limit: 1,
    verification_status: 'pending',
  }, canReviewRecruiters);
  const pendingRecruiters = pendingRecruitersQuery.data?.pagination.total ?? 0;

  useEffect(() => {
    if (accessibleTabs.length > 0 && requestedTab !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [accessibleTabs, activeTab, requestedTab, setSearchParams]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (accessibleTabs.length === 0) {
    return (
      <DashboardLayout 
        title="Employer Management" 
        subtitle="Manage companies and recruiter accounts"
      >
        <EmptyState
          icon={Building}
          title="No employer access assigned"
          description="Ask the super admin to grant company or recruiter permissions for your role."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Employer Management" 
      subtitle="Manage companies and recruiter accounts"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          {canViewCompanies ? (
            <TabsTrigger value="companies" className="gap-2">
              <Building className="h-4 w-4" />
              Companies
            </TabsTrigger>
          ) : null}
          {canViewRecruiters ? (
            <TabsTrigger value="recruiters" className="gap-2">
              <Users className="h-4 w-4" />
              Recruiters
              {pendingRecruiters > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                  {pendingRecruiters}
                </Badge>
              )}
            </TabsTrigger>
          ) : null}
        </TabsList>

        {canViewCompanies ? (
          <TabsContent value="companies" className="space-y-6">
            <CompanyListTab />
          </TabsContent>
        ) : null}

        {canViewRecruiters ? (
          <TabsContent value="recruiters" className="space-y-6">
            <RecruiterListTab />
          </TabsContent>
        ) : null}
      </Tabs>
    </DashboardLayout>
  );
}
