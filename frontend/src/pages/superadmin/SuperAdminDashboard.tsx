import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, ScrollText } from 'lucide-react';
import UserManagementTab from '@/components/superadmin/UserManagementTab';
import RolesPermissionsTab from '@/components/superadmin/RolesPermissionsTab';
import AuditLogTab from '@/components/superadmin/AuditLogTab';

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Security & Access Control</h1>
          <p className="text-muted-foreground mt-1">Manage users, roles, and monitor system activity</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              <span className="hidden sm:inline">Audit Log</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UserManagementTab />
          </TabsContent>
          <TabsContent value="roles" className="mt-6">
            <RolesPermissionsTab />
          </TabsContent>
          <TabsContent value="audit" className="mt-6">
            <AuditLogTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
