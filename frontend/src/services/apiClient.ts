/**
 * Central API client with JWT token management and automatic refresh.
 */

export interface ApiResponse<T> {
  data: T;
  error: string | null;
  status: number;
}

// ── Token Manager (in-memory + sessionStorage) ────────

class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Restore tokens from sessionStorage on page reload
    this.accessToken = sessionStorage.getItem('access_token');
    this.refreshToken = sessionStorage.getItem('refresh_token');
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    sessionStorage.setItem('access_token', accessToken);
    sessionStorage.setItem('refresh_token', refreshToken);
  }

  clear() {
    this.accessToken = null;
    this.refreshToken = null;
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
  }
}

export const tokenManager = new TokenManager();

// ── API Client ────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Refresh lock to prevent concurrent refresh calls
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  const rt = tokenManager.getRefreshToken();
  if (!rt) return false;

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    });

    if (!response.ok) {
      tokenManager.clear();
      return false;
    }

    const data = await response.json();
    tokenManager.setTokens(data.token, data.refresh_token);
    return true;
  } catch {
    tokenManager.clear();
    return false;
  }
}

function refreshWithLock(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = attemptRefresh().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

class ApiClient {
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    isRetry = false,
  ): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${path}`;
    const token = tokenManager.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const isPublicAuthEndpoint =
        path.startsWith('/auth/login') ||
        path.startsWith('/auth/refresh') ||
        path.startsWith('/auth/student-signup');

      // Auto-refresh on 401 (but not for auth endpoints or retries)
      if (
        response.status === 401 &&
        !isRetry &&
        !isPublicAuthEndpoint
      ) {
        const refreshed = await refreshWithLock();
        if (refreshed) {
          return this.request<T>(method, path, body, true);
        }
        // Refresh failed — redirect to login
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return { data: null as T, error: 'Session expired', status: 401 };
      }

      // Safely parse JSON — handle empty or non-JSON responses
      const text = await response.text();
      let data: T;
      try {
        data = text ? JSON.parse(text) : (null as T);
      } catch {
        // Response body was not valid JSON
        return {
          data: null as T,
          error: `Server returned non-JSON response (status ${response.status})`,
          status: response.status,
        };
      }
      return { data, error: null, status: response.status };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown API error';
      return { data: null as T, error: message, status: 0 };
    }
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

/** Singleton API client instance */
export const apiClient = new ApiClient();
export default ApiClient;
