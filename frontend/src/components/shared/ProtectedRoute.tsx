import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultRouteForUser, hasAnyPermission, hasPermission, type PermissionRequirement } from '@/lib/permissionModule';
import { useStudentProfile } from '@/hooks/use-student-api';
import { PageLoader } from './PageLoader';
import type { UserRole } from '@/contexts/RoleContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Allowed roles. If empty/undefined, any authenticated user can access. */
  allowedRoles?: UserRole[];
  requiredPermission?: PermissionRequirement;
  requiredAnyPermissions?: PermissionRequirement[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermission,
  requiredAnyPermissions,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, refreshUser } = useAuth();
  const location = useLocation();
  const [isPermissionSyncing, setIsPermissionSyncing] = React.useState(false);
  const syncAttemptedRef = React.useRef(false);
  const isStudentGateRoute = location.pathname === '/student/access' || location.pathname === '/student/policy-gate';
  const studentProfileQuery = useStudentProfile(Boolean(isAuthenticated && user?.role === 'student' && !isStudentGateRoute));
  const requiresPermissionSync = Boolean(requiredPermission || requiredAnyPermissions)
    && (user?.role === 'tpo_admin' || user?.role === 'tpo_employee' || user?.role === 'super_admin');

  React.useEffect(() => {
    if (!requiresPermissionSync || syncAttemptedRef.current) {
      return;
    }

    syncAttemptedRef.current = true;
    let isActive = true;
    setIsPermissionSyncing(true);

    void refreshUser().finally(() => {
      if (isActive) {
        setIsPermissionSyncing(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [refreshUser, requiresPermissionSync]);

  if (isLoading || isPermissionSyncing) {
    return <PageLoader />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const studentProfile = studentProfileQuery.data?.student;
  if (user.role === 'student' && !isStudentGateRoute) {
    if (studentProfileQuery.isLoading && !studentProfileQuery.data) {
      return <PageLoader />;
    }

    // Mandatory global-policy acceptance gate (registration + any newly published global policy).
    if ((studentProfileQuery.data?.pending_policy_count ?? 0) > 0) {
      return <Navigate to="/student/policy-gate" state={{ from: `${location.pathname}${location.search}${location.hash}` }} replace />;
    }

    if (studentProfile && (studentProfile.profile_blocked || !studentProfile.profile_photo_url)) {
      return <Navigate to="/student/access" state={{ from: `${location.pathname}${location.search}${location.hash}` }} replace />;
    }
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  if (requiredPermission && !hasPermission(user.permissions, requiredPermission, user.role)) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  if (requiredAnyPermissions && !hasAnyPermission(user.permissions, requiredAnyPermissions, user.role)) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  return <>{children}</>;
}
