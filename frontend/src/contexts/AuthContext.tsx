import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  authService,
  AuthUser,
  LoginRequest,
  AuthApiError,
  StudentSignupCompleteRequest,
} from '@/services/authService';
import { tokenManager } from '@/services/apiClient';

// ── Types ──────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<AuthUser>;
  completeStudentSignup: (data: StudentSignupCompleteRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function serializePermissions(user: AuthUser | null) {
  if (!user) {
    return '';
  }

  return user.permissions
    .map((permission) =>
      [
        permission.module,
        permission.can_view,
        permission.can_create,
        permission.can_edit,
        permission.can_delete,
        permission.can_export,
        permission.can_approve,
      ].join(':'),
    )
    .sort()
    .join('|');
}

// ── Provider ───────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true, // true initially to check stored tokens
  });
  const initRef = useRef(false);
  const userRef = useRef<AuthUser | null>(null);

  const applyUserState = useCallback((user: AuthUser | null, isLoading = false) => {
    const previousUser = userRef.current;
    const permissionsChanged =
      previousUser?.role !== user?.role || serializePermissions(previousUser) !== serializePermissions(user);

    userRef.current = user;

    setState({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
    });

    if (previousUser && permissionsChanged) {
      queryClient.clear();
    }
  }, [queryClient]);

  // On mount, check if we have a valid token and fetch user
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const token = tokenManager.getAccessToken();
    if (!token) {
      applyUserState(null, false);
      return;
    }

    authService
      .getMe()
      .then((user) => {
        applyUserState(user, false);
      })
      .catch(() => {
        // Token invalid or expired — try refresh
        const refreshToken = tokenManager.getRefreshToken();
        if (!refreshToken) {
          tokenManager.clear();
          applyUserState(null, false);
          return;
        }

        authService
          .refresh(refreshToken)
          .then((tokens) => {
            tokenManager.setTokens(tokens.token, tokens.refresh_token);
            return authService.getMe();
          })
          .then((user) => {
            applyUserState(user, false);
          })
          .catch(() => {
            tokenManager.clear();
            applyUserState(null, false);
          });
      });
  }, [applyUserState]);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authService.login(data);
    tokenManager.setTokens(response.token, response.refresh_token);
    applyUserState(response.user, false);
    return response.user;
  }, [applyUserState]);

  const completeStudentSignup = useCallback(async (data: StudentSignupCompleteRequest) => {
    const response = await authService.completeStudentSignup(data);
    tokenManager.setTokens(response.token, response.refresh_token);
    applyUserState(response.user, false);
    return response.user;
  }, [applyUserState]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      await authService.logout(refreshToken ?? undefined);
    } catch {
      // Logout API failure shouldn't block client-side cleanup
    } finally {
      tokenManager.clear();
      applyUserState(null, false);
    }
  }, [applyUserState]);

  // Listen for session-expired events from apiClient (refresh failed)
  useEffect(() => {
    const handleSessionExpired = () => {
      tokenManager.clear();
      applyUserState(null, false);
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [applyUserState]);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authService.getMe();
      applyUserState(user, false);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 401) {
        tokenManager.clear();
        applyUserState(null, false);
      }
    }
  }, [applyUserState]);

  useEffect(() => {
    const handleWindowFocus = () => {
      if (tokenManager.getAccessToken()) {
        void refreshUser();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
    };
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ ...state, login, completeStudentSignup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
