import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type UserRole = 'student' | 'tpo_admin' | 'tpo_employee' | 'faculty_coordinator' | 'recruiter' | 'management' | 'super_admin';

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  isAdmin: boolean;
  isFacultyCoordinator: boolean;
  isRecruiter: boolean;
  isSuperAdmin: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>(user?.role ?? 'student');

  // Sync role when user changes (login/logout)
  useEffect(() => {
    if (user?.role) {
      setCurrentRole(user.role);
    }
  }, [user?.role]);

  return (
    <RoleContext.Provider value={{
      currentRole,
      setCurrentRole,
      isAdmin: currentRole === 'tpo_admin' || currentRole === 'tpo_employee',
      isFacultyCoordinator: currentRole === 'faculty_coordinator',
      isRecruiter: currentRole === 'recruiter',
      isSuperAdmin: currentRole === 'super_admin',
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
