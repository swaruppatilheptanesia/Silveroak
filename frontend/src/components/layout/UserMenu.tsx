import { useState } from 'react';
import { ChevronDown, KeyRound, Loader2, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from '@/components/shared/ChangePasswordDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useStudentProfile } from '@/hooks/use-student-api';
import { getRoleLabel } from '@/lib/permissionModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { getInitials } from '@/lib/formatters';

/**
 * Top-bar user chip: avatar + role badge + name, opening a dropdown with Change Password and Logout.
 * Logout flow is owned by the parent (DashboardLayout) and passed in unchanged.
 */
export function UserMenu({
  onLogout,
  isLoggingOut = false,
}: {
  onLogout: () => void | Promise<void>;
  isLoggingOut?: boolean;
}) {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const studentProfileQuery = useStudentProfile(currentRole === 'student');
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const name = user?.name?.trim() || user?.email || 'User';
  const roleLabel = getRoleLabel(user?.role);
  const photoUrl =
    currentRole === 'student' && studentProfileQuery.data?.student?.profile_photo_url
      ? resolveBackendAssetUrl(studentProfileQuery.data.student.profile_photo_url)
      : undefined;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2 px-1.5 sm:px-2"
            disabled={isLoggingOut}
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={photoUrl} alt={name} />
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <Badge variant="secondary" className="hidden sm:inline-flex">{roleLabel}</Badge>
            <span className="hidden max-w-[10rem] truncate text-sm font-medium md:inline">{name}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate font-medium">{name}</span>
            <span className="text-xs font-normal text-muted-foreground">{roleLabel}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setChangePasswordOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Change Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isLoggingOut}
            onSelect={(event) => {
              event.preventDefault();
              void onLogout();
            }}
            className="text-destructive focus:text-destructive"
          >
            {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </>
  );
}
