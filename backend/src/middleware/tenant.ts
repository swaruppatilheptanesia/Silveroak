import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticationError } from '../shared/errors';

// Simple in-memory cache for tenant configs (TTL: 5 minutes)
const tenantCache = new Map<string, { data: Express.TenantConfig; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function resolveTenant(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required before tenant resolution');
    }

    const tenantId = req.user.tenant_id;
    const cached = tenantCache.get(tenantId);

    if (cached && cached.expiresAt > Date.now()) {
      req.tenant = cached.data;
      return next();
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        name: true,
        config: true,
        is_active: true,
      },
    });

    if (!tenant || !tenant.is_active) {
      throw new AuthenticationError('Tenant not found or inactive', 'TENANT_INVALID');
    }

    const tenantConfig: Express.TenantConfig = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      config: tenant.config as Record<string, unknown>,
    };

    tenantCache.set(tenantId, {
      data: tenantConfig,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    req.tenant = tenantConfig;
    next();
  } catch (err) {
    next(err);
  }
}

export function clearTenantCache(tenantId?: string): void {
  if (tenantId) {
    tenantCache.delete(tenantId);
  } else {
    tenantCache.clear();
  }
}
