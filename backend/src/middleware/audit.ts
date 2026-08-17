import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export function auditLog(action: string, module: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Capture the original json method to hook into successful responses
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Only log on successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const rawIp = req.ip;
        const ipAddr = (Array.isArray(rawIp) ? rawIp[0] : rawIp) || req.socket.remoteAddress || '';

        // Fire and forget - don't block the response
        prisma.auditLog
          .create({
            data: {
              tenant_id: req.user.tenant_id,
              user_id: req.user.id,
              user_name: req.user.name,
              action,
              module,
              target_type: req.params.id ? module : undefined,
              target_id: (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) || undefined,
              details: `${req.method} ${req.originalUrl}`,
              ip_address: ipAddr.slice(0, 50),
            },
          })
          .catch((err) => {
            logger.error({ err }, 'Failed to write audit log');
          });
      }

      return originalJson(body);
    };

    next();
  };
}
