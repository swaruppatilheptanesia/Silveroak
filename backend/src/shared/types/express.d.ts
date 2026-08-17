import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      tenant_id: string;
      role: UserRole;
      email: string;
      name: string;
      department?: string | null;
      institutes?: string[];
      courses?: string[];
      branches?: string[];
    }

    interface TenantConfig {
      id: string;
      slug: string;
      name: string;
      config: Record<string, unknown>;
    }

    interface ScopeFilters {
      department?: string;
      company_id?: string;
      student_id?: string;
      user_id?: string;
    }

    interface Request {
      user?: AuthUser;
      tenant?: TenantConfig;
      scope?: ScopeFilters;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
