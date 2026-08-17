import { useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { NotificationsDropdown } from './NotificationsDropdown';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen w-full min-w-0">
        <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center gap-2 md:gap-4 border-b border-border bg-card px-3 md:px-6">
          <SidebarTrigger className="shrink-0" />
          <div className="flex-1 min-w-0">
            {title && (
              <div>
                <h1 className="text-base md:text-lg font-semibold text-foreground truncate">{title}</h1>
                {subtitle && <p className="text-xs md:text-sm text-muted hidden sm:block truncate">{subtitle}</p>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <ThemeToggle />
            <NotificationsDropdown />
            <UserMenu onLogout={handleLogout} isLoggingOut={isLoggingOut} />
          </div>
        </header>
        <main className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden animate-page-fade-in">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
