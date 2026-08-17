import { 
  User, 
  LayoutDashboard, 
  Building2, 
  Briefcase,
  Calendar,
  FileCheck,
  Settings,
  Users,
  FileSpreadsheet,
  FileStack,
  Building,
  ClipboardList,
  ScrollText,
  Send,
  FileText,
  Gift,
  GraduationCap,
  FolderKanban,
  Megaphone,
  Shield,
  Lock,
  Layers
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRole, type UserRole } from '@/contexts/RoleContext';
import { useTenant } from '@/config/tenant';
import { useAdminStudents } from '@/hooks/use-admin-api';
import { useStudentNewIndicators } from '@/hooks/use-student-new-indicators';
import { useRecruiters } from '@/hooks/use-employer-api';
import { useStudentProfile } from '@/hooks/use-student-api';
import { getInitials } from '@/lib/formatters';
import {
  getDefaultRouteForUser,
  hasAnyPermission,
  hasPermission,
  type PermissionRequirement,
} from '@/lib/permissionModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';

interface SidebarNavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  badge?: string;
  disabled?: boolean;
  roles?: UserRole[];
  requiredPermission?: PermissionRequirement;
  requiredAnyPermissions?: PermissionRequirement[];
}

// Student Navigation
const studentMainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: User, label: 'My Profile', href: '/profile' },
  { icon: FolderKanban, label: 'My Portfolio', href: '/portfolio' },
];

const studentPlacementNavItems = [
  { icon: Briefcase, label: 'Opportunities', href: '/opportunities' },
  { icon: Send, label: 'My Applications', href: '/applications' },
  { icon: FileText, label: 'NOC Requests', href: '/noc' },
  { icon: Building2, label: 'Companies', href: '/companies', disabled: true },
  { icon: Calendar, label: 'My Events & Drives', href: '/drives' },
  { icon: Megaphone, label: 'Announcements', href: '/announcements' },
  { icon: FileStack, label: 'Circulars', href: '/circulars' },
  { icon: FileCheck, label: 'No Dues Certificate', href: '/no-dues' },
];

// Admin Navigation - Simplified structure
const adminOverviewItems: SidebarNavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin', roles: ['tpo_admin'] },
  { icon: User, label: 'My Profile', href: '/admin/profile', roles: ['tpo_admin'] },
];

const employeeOverviewItems: SidebarNavItem[] = [
  { icon: User, label: 'My Profile', href: '/admin/profile', roles: ['tpo_employee'] },
  {
    icon: Building,
    label: 'Employer Hub',
    href: '/admin/employers',
    roles: ['tpo_employee'],
    requiredAnyPermissions: [
      { module: 'companies', action: 'view' },
      { module: 'recruiters', action: 'view' },
    ],
  },
];

const adminStudentItems: SidebarNavItem[] = [
  {
    icon: Users,
    label: 'Students',
    href: '/admin/students',
    roles: ['tpo_admin'],
    requiredAnyPermissions: [
      { module: 'students', action: 'view' },
      { module: 'student_verification', action: 'view' },
      { module: 'eligibility_rules', action: 'view' },
      { module: 'portfolios', action: 'view' },
      { module: 'selection_database', action: 'view' },
    ],
  },
];

const adminEmployerItems: SidebarNavItem[] = [
  {
    icon: Building,
    label: 'Companies',
    href: '/admin/employers',
    roles: ['tpo_admin', 'tpo_employee'],
    requiredAnyPermissions: [
      { module: 'companies', action: 'view' },
      { module: 'recruiters', action: 'view' },
    ],
  },
];

const adminPlacementNavItems: SidebarNavItem[] = [
  { icon: Briefcase, label: 'Postings', href: '/admin/postings', roles: ['tpo_admin', 'tpo_employee'], requiredPermission: { module: 'postings', action: 'view' } },
  { icon: ClipboardList, label: 'Applications', href: '/admin/applications', roles: ['tpo_admin', 'tpo_employee'], requiredPermission: { module: 'applications', action: 'view' } },
  { icon: Gift, label: 'Offers & Joining', href: '/admin/offers', roles: ['tpo_admin', 'tpo_employee'], requiredPermission: { module: 'offers', action: 'view' } },
  // { icon: GraduationCap, label: 'Placement Cell Programs', href: '/admin/internships', roles: ['tpo_admin', 'tpo_employee'], requiredPermission: { module: 'internships', action: 'view' } }, // Hidden from sidebar per request — route left intact.
  { icon: FileText, label: 'NOC Management', href: '/admin/noc', roles: ['tpo_admin', 'tpo_employee'], requiredPermission: { module: 'noc_requests', action: 'view' } },
  { icon: Calendar, label: 'Events & Drives', href: '/admin/drives', roles: ['tpo_admin', 'tpo_employee'], requiredPermission: { module: 'events', action: 'view' } },
  { icon: Megaphone, label: 'Announcements', href: '/admin/announcements', roles: ['tpo_admin', 'tpo_employee'], requiredPermission: { module: 'announcements', action: 'view' } },
  { icon: FileStack, label: 'Circulars & Templates', href: '/admin/circulars', roles: ['tpo_admin', 'tpo_employee'], requiredPermission: { module: 'circulars', action: 'view' } },
  { icon: FileCheck, label: 'No Dues Certificates', href: '/admin/no-dues', roles: ['tpo_admin', 'tpo_employee'], requiredPermission: { module: 'no_dues', action: 'view' } },
];

const adminAnalyticsItems: SidebarNavItem[] = [
  { icon: Settings, label: 'Masters', href: '/admin/masters', roles: ['tpo_admin'], requiredPermission: { module: 'masters', action: 'view' } },
  { icon: FileSpreadsheet, label: 'Reports', href: '/admin/reports', roles: ['tpo_admin', 'tpo_employee'], requiredPermission: { module: 'reports', action: 'view' } },
  { icon: ScrollText, label: 'Policies', href: '/admin/policies', roles: ['tpo_admin'], requiredPermission: { module: 'policies', action: 'view' } },
];

// Faculty Coordinator Navigation
const facultyMainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/faculty' },
  { icon: User, label: 'My Profile', href: '/faculty/profile' },
  { icon: Users, label: 'Department Students', href: '/faculty/students' },
  { icon: Layers, label: 'My Programs', href: '/faculty/programs' },
];

const facultyPlacementNavItems = [
  { icon: Briefcase, label: 'Job Postings', href: '/faculty/jobs', disabled: true },
  { icon: FileText, label: 'NOC Approvals', href: '/faculty/noc-approvals' },
  { icon: Gift, label: 'Offers & Joining', href: '/faculty/offers' },
  // { icon: GraduationCap, label: 'Internships', href: '/faculty/internships' }, // Hidden from faculty sidebar per request — route left intact.
  { icon: Calendar, label: 'Department Events', href: '/faculty/drives' },
  { icon: Megaphone, label: 'Announcements', href: '/faculty/announcements' },
  { icon: FileStack, label: 'Circulars', href: '/faculty/circulars' },
];

// Recruiter Navigation
const recruiterMainNavItems: SidebarNavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/recruiter' },
  { icon: Building2, label: 'Company Profile', href: '/recruiter/company' },
  { icon: User, label: 'My Profile', href: '/recruiter/profile' },
];

const recruiterPlacementNavItems: SidebarNavItem[] = [
  { icon: Briefcase, label: 'Recruitment Pipeline', href: '/recruiter/pipeline' },
  { icon: GraduationCap, label: 'Internships', href: '/recruiter/internships', requiredPermission: { module: 'internships', action: 'view' } },
  { icon: Calendar, label: 'My Events', href: '/recruiter/drives', requiredPermission: { module: 'events', action: 'view' } },
];

// Super Admin Navigation
const superAdminMainItems = [
  { icon: LayoutDashboard, label: 'Security & Access', href: '/super-admin' },
  { icon: User, label: 'My Profile', href: '/super-admin/profile' },
];

// Management Navigation
const managementMainItems: SidebarNavItem[] = [
  { icon: User, label: 'My Profile', href: '/management/profile', roles: ['management'] },
];

export function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { currentRole, isAdmin, isFacultyCoordinator, isRecruiter, isSuperAdmin } = useRole();
  const tenant = useTenant();
  const isTpoAdmin = currentRole === 'tpo_admin';
  const isTpoEmployee = currentRole === 'tpo_employee';
  const isManagement = currentRole === 'management';
  const hasAdminPortal = isTpoAdmin || isTpoEmployee;
  const userPermissions = user?.permissions ?? [];
  const actualUserRole = user?.role;
  const studentProfileQuery = useStudentProfile(currentRole === 'student');
  const canViewStudentHub = hasAnyPermission(
    userPermissions,
    [
      { module: 'students', action: 'view' },
      { module: 'student_verification', action: 'view' },
      { module: 'student_verification', action: 'approve' },
    ],
    actualUserRole,
  );
  const canViewRecruiters = hasAnyPermission(
    userPermissions,
    [
      { module: 'recruiters', action: 'view' },
      { module: 'recruiters', action: 'approve' },
    ],
    actualUserRole,
  );
  const pendingStudentsQuery = useAdminStudents(
    {
      page: 1,
      limit: 1,
      verification_status: 'pending',
    },
    isTpoAdmin && canViewStudentHub,
  );
  const pendingRecruitersQuery = useRecruiters(
    {
      page: 1,
      limit: 1,
      verification_status: 'pending',
    },
    hasAdminPortal && canViewRecruiters,
  );

  const canAccessNavItem = (item: SidebarNavItem) => {
    if (item.roles && !item.roles.includes(currentRole)) {
      return false;
    }

    if (item.requiredPermission && !hasPermission(userPermissions, item.requiredPermission, actualUserRole)) {
      return false;
    }

    if (item.requiredAnyPermissions && !hasAnyPermission(userPermissions, item.requiredAnyPermissions, actualUserRole)) {
      return false;
    }

    return true;
  };

  const mainNavItems = isSuperAdmin
    ? superAdminMainItems
    : isManagement
      ? managementMainItems.filter(canAccessNavItem)
      : isTpoAdmin
        ? adminOverviewItems.filter(canAccessNavItem)
        : isTpoEmployee
          ? employeeOverviewItems.filter(canAccessNavItem)
        : isFacultyCoordinator
          ? facultyMainNavItems
          : isRecruiter
            ? recruiterMainNavItems.filter(canAccessNavItem)
            : studentMainNavItems;

  const placementNavItems = isSuperAdmin
    ? []
    : isManagement
      ? []
      : isTpoAdmin
        ? adminPlacementNavItems.filter(canAccessNavItem)
        : isTpoEmployee
          ? adminPlacementNavItems.filter(canAccessNavItem)
        : isFacultyCoordinator
          ? facultyPlacementNavItems
          : isRecruiter
            ? recruiterPlacementNavItems.filter(canAccessNavItem)
            : studentPlacementNavItems;

  const isStudent = currentRole === 'student';
  const newIndicators = useStudentNewIndicators(isStudent);
  const hasNewForHref = (href: string): boolean => {
    if (href === '/announcements') return newIndicators.announcements;
    if (href === '/circulars') return newIndicators.circulars;
    if (href === '/drives') return newIndicators.drives;
    return false;
  };

  const pendingStudents = pendingStudentsQuery.data?.pagination.total ?? 0;
  const pendingRecruiters = pendingRecruitersQuery.data?.pagination.total ?? 0;

  const studentManagementItems = isTpoAdmin
    ? adminStudentItems.filter(canAccessNavItem).map((item) => ({
        ...item,
        badge: pendingStudents > 0 ? String(pendingStudents) : undefined,
      }))
    : null;
  const employerManagementItems = hasAdminPortal
    ? adminEmployerItems.filter(canAccessNavItem).map((item) => ({
        ...item,
        badge: pendingRecruiters > 0 ? String(pendingRecruiters) : undefined,
      }))
    : null;
  const analyticsItems = isTpoAdmin
    ? adminAnalyticsItems.filter(canAccessNavItem)
    : isTpoEmployee
      ? adminAnalyticsItems.filter(canAccessNavItem)
      : null;

  const studentProfile = currentRole === 'student' ? studentProfileQuery.data?.student : null;
  const accountName = user?.name?.trim() || studentProfile?.full_name?.trim() || 'Account';

  const portalName = isSuperAdmin
    ? 'Super Admin'
    : isTpoAdmin
      ? 'TPO Admin Portal'
      : isTpoEmployee
        ? 'TPO Employee Portal'
        : isFacultyCoordinator
          ? 'Faculty Portal'
          : isRecruiter
            ? 'Recruiter Portal'
            : 'T&P Cell Portal';

  const userInfo = {
    name: accountName,
    subtitle: isSuperAdmin
      ? user?.email || portalName
      : hasAdminPortal
        ? user?.designation || user?.email || portalName
        : isFacultyCoordinator
          ? user?.department || user?.designation || user?.email || portalName
          : isRecruiter
            ? user?.designation || user?.email || portalName
            : studentProfile?.roll_number || studentProfile?.enrollment_number || user?.email || portalName,
    initials: getInitials(accountName),
    imageUrl: currentRole === 'student' && studentProfile?.profile_photo_url
      ? resolveBackendAssetUrl(studentProfile.profile_photo_url)
      : undefined,
  };
  
  const homeRoute = isSuperAdmin
    ? '/super-admin'
    : hasAdminPortal && user
      ? getDefaultRouteForUser({
          role: currentRole as typeof user.role,
          permissions: userPermissions,
        } as typeof user)
      : isFacultyCoordinator
        ? '/faculty'
      : isRecruiter
          ? '/recruiter'
          : '/';
  const menuLabel = isSuperAdmin
    ? 'System'
    : hasAdminPortal
      ? 'Administration'
      : isFacultyCoordinator
        ? 'Department'
        : 'Main Menu';

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to={homeRoute} className="flex items-center justify-center">
          <img
            src={tenant.branding.logoUrl}
            alt={tenant.branding.universityName}
            className="h-14 w-auto max-w-full object-contain"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Overview / Main Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>{hasAdminPortal ? 'Overview' : menuLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.href}
                    className={cn('disabled' in item && item.disabled && 'opacity-50 cursor-not-allowed')}
                  >
                    {'disabled' in item && item.disabled ? (
                      <span className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">Soon</span>
                      </span>
                    ) : (
                      <Link to={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {'badge' in item && (item as { badge?: string }).badge && (
                          <Badge variant="destructive" className="ml-auto text-[10px] h-5 px-1.5">
                            {(item as { badge?: string }).badge}
                          </Badge>
                        )}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Student Management - Admin only */}
        {studentManagementItems && (
          <SidebarGroup>
            <SidebarGroupLabel>Student Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {studentManagementItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.href || location.pathname.startsWith(item.href + '?')}
                    >
                      <Link to={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {'badge' in item && item.badge && (
                          <Badge variant="destructive" className="ml-auto text-[10px] h-5 px-1.5">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Employer Management - Admin only */}
        {employerManagementItems && (
          <SidebarGroup>
            <SidebarGroupLabel>Employer Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {employerManagementItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.href || location.pathname.startsWith(item.href + '?')}
                    >
                      <Link to={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {'badge' in item && item.badge && (
                          <Badge variant="destructive" className="ml-auto text-[10px] h-5 px-1.5">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Employer Directory intentionally hidden for faculty login. */}

        {/* Placement Operations */}
        {placementNavItems.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>{hasAdminPortal ? 'Placement Operations' : 'Placements'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {placementNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.href || location.pathname.startsWith(item.href + '/')}
                    className={cn('disabled' in item && item.disabled && 'opacity-50 cursor-not-allowed')}
                  >
                    {'disabled' in item && item.disabled ? (
                      <span className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">Soon</span>
                      </span>
                    ) : (
                      <Link to={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {hasNewForHref(item.href) && (
                          <span
                            className="ml-auto h-2 w-2 rounded-full bg-primary"
                            aria-label="New"
                          />
                        )}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* Analytics - Admin only */}
        {analyticsItems && (
          <SidebarGroup>
            <SidebarGroupLabel>Analytics</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {analyticsItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.href}
                    >
                      <Link to={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={userInfo.imageUrl} alt={userInfo.name} />
            <AvatarFallback className="text-sm bg-primary text-primary-foreground">
              {userInfo.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{userInfo.name}</p>
            <p className="text-xs text-muted-foreground truncate">{userInfo.subtitle}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
