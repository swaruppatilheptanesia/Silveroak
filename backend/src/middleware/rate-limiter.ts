import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { env } from '../config/env';

// Skip rate limiting in test environment
const skipInTest = (_req: Request) => env.isTest;
const developmentLimit = 10000;
// Keep local development generous so repeated manual/API testing does not trip limits.
const resolveLimit = (productionLimit: number) =>
  env.isDevelopment ? developmentLimit : productionLimit;

// Default: 100 requests per 15 minutes per IP in production, 10k in development.
export const defaultLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: resolveLimit(env.rateLimitMaxRequests),
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});

// Auth endpoints: 10 requests per 15 minutes per IP in production, 10k in development.
export const authLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: resolveLimit(5000),
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

// Export endpoints: 5 requests per minute per IP in production, 10k in development.
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: resolveLimit(500),
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many export requests, please try again later',
    },
  },
});
