import { useRole, UserRole } from '@/contexts/RoleContext';
import { GraduationCap, Shield, UserCog, Briefcase, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const roles: { value: UserRole; label: string; icon: React.ElementType; dashboard: string }[] = [
  { value: 'student', label: 'Student', icon: GraduationCap, dashboard: '/' },
  { value: 'tpo_admin', label: 'TPO Admin', icon: Shield, dashboard: '/admin' },
  { value: 'faculty_coordinator', label: 'Faculty', icon: UserCog, dashboard: '/faculty' },
  { value: 'recruiter', label: 'Recruiter', icon: Briefcase, dashboard: '/recruiter' },
  { value: 'super_admin', label: 'Super Admin', icon: Lock, dashboard: '/super-admin' },
];

export function RoleSwitcher() {
  const { currentRole, setCurrentRole } = useRole();
  const navigate = useNavigate();

  const handleRoleSwitch = (role: typeof roles[0]) => {
    setCurrentRole(role.value);
    navigate(role.dashboard);
  };

  return (
    <div className="flex items-center gap-0.5 md:gap-1 bg-muted/50 rounded-lg p-0.5 md:p-1 overflow-x-auto">
      {roles.map((role) => {
        const Icon = role.icon;
        const isActive = currentRole === role.value;
        return (
          <button
            key={role.value}
            onClick={() => handleRoleSwitch(role)}
            className={cn(
              'flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all whitespace-nowrap shrink-0',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>{role.label}</span>
          </button>
        );
      })}
    </div>
  );
}
