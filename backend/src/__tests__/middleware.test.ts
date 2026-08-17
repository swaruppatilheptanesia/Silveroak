import request from 'supertest';
import express from 'express';
import app from '../app';
import { prisma } from '../config/database';
import { generateAccessToken } from '../shared/utils/jwt';
import { hashPassword, comparePassword } from '../shared/utils/password';
import { paginate, buildPrismaQuery } from '../shared/utils/pagination';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/role';
import { piiFilter } from '../middleware/pii-filter';
import { validate } from '../middleware/validate';
import { errorHandler } from '../middleware/error-handler';
import { z } from 'zod';

// Get seed data for tests
let tenantId: string;
let adminUserId: string;
let studentUserId: string;
let recruiterUserId: string;

beforeAll(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'silver-oak-university' } });
  if (!tenant) throw new Error('Seed data not found - run npm run db:seed first');
  tenantId = tenant.id;

  const admin = await prisma.user.findFirst({ where: { tenant_id: tenantId, role: 'tpo_admin' } });
  const student = await prisma.user.findFirst({ where: { tenant_id: tenantId, role: 'student' } });
  const recruiter = await prisma.user.findFirst({ where: { tenant_id: tenantId, role: 'recruiter' } });
  adminUserId = admin!.id;
  studentUserId = student!.id;
  recruiterUserId = recruiter!.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

// =========================================================
// Health Check
// =========================================================
describe('GET /api/health', () => {
  it('should return health status without auth', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });
});

// =========================================================
// Authentication Middleware
// =========================================================
describe('Authentication Middleware', () => {
  it('should reject requests without token', async () => {
    const res = await request(app).get('/api/anything');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('should reject requests with invalid token', async () => {
    const res = await request(app)
      .get('/api/anything')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('should reject requests with malformed auth header', async () => {
    const res = await request(app)
      .get('/api/anything')
      .set('Authorization', 'NotBearer sometoken');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('should accept valid token and resolve tenant', async () => {
    const token = generateAccessToken({
      user_id: adminUserId,
      tenant_id: tenantId,
      role: 'tpo_admin',
      email: 'tpoadmin@silveroak.ac.in',
    });

    // Should get 404 (route not found) instead of 401 - meaning auth passed
    const res = await request(app)
      .get('/api/some-nonexistent-route')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('should reject token for inactive user', async () => {
    // Generate token with a fake user_id
    const token = generateAccessToken({
      user_id: '00000000-0000-0000-0000-000000000000',
      tenant_id: tenantId,
      role: 'student',
      email: 'fake@test.com',
    });

    const res = await request(app)
      .get('/api/anything')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

// =========================================================
// JWT Utilities
// =========================================================
describe('JWT Utilities', () => {
  it('should generate and verify access token', async () => {
    const payload = {
      user_id: adminUserId,
      tenant_id: tenantId,
      role: 'tpo_admin' as const,
      email: 'test@test.com',
    };
    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const jwt = require('../shared/utils/jwt');
    const decoded = jwt.verifyToken(token);
    expect(decoded.user_id).toBe(payload.user_id);
    expect(decoded.tenant_id).toBe(payload.tenant_id);
    expect(decoded.role).toBe(payload.role);
  });

  it('should throw on expired/invalid token verification', () => {
    const jwt = require('../shared/utils/jwt');
    expect(() => jwt.verifyToken('invalid.token')).toThrow();
  });
});

// =========================================================
// Password Utilities
// =========================================================
describe('Password Utilities', () => {
  it('should hash and compare passwords correctly', async () => {
    const password = 'TestPassword@123';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(await comparePassword(password, hash)).toBe(true);
    expect(await comparePassword('WrongPassword', hash)).toBe(false);
  });

  it('should generate different hashes for same password', async () => {
    const password = 'SamePassword';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2); // Different salts
  });
});

// =========================================================
// Pagination Utilities
// =========================================================
describe('Pagination Utilities', () => {
  it('should calculate pagination metadata correctly', () => {
    const meta = paginate(1, 20, 55);
    expect(meta).toEqual({
      page: 1,
      limit: 20,
      total: 55,
      total_pages: 3,
      has_next: true,
      has_prev: false,
    });
  });

  it('should handle last page correctly', () => {
    const meta = paginate(3, 20, 55);
    expect(meta.has_next).toBe(false);
    expect(meta.has_prev).toBe(true);
  });

  it('should handle empty results', () => {
    const meta = paginate(1, 20, 0);
    expect(meta.total_pages).toBe(0);
    expect(meta.has_next).toBe(false);
    expect(meta.has_prev).toBe(false);
  });

  it('should build correct Prisma query params', () => {
    expect(buildPrismaQuery(1, 20)).toEqual({ skip: 0, take: 20 });
    expect(buildPrismaQuery(3, 10)).toEqual({ skip: 20, take: 10 });
  });
});

// =========================================================
// PII Filter
// =========================================================
describe('PII Filter', () => {
  it('should strip PII fields for recruiter role', async () => {
    const token = generateAccessToken({
      user_id: recruiterUserId,
      tenant_id: tenantId,
      role: 'recruiter',
      email: 'recruiter@techcorp.com',
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/test', authenticate, resolveTenant, piiFilter(), (_req: any, res: any) => {
      res.json({
        data: {
          name: 'Rahul Sharma',
          email: 'student@test.com',
          mobile: '+91-9876543210',
          department: 'CS',
          residential_address: '123 Street',
          date_of_birth: '2002-01-01',
        },
      });
    });

    const res = await request(testApp)
      .get('/api/test')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Rahul Sharma');
    expect(res.body.data.department).toBe('CS');
    // PII fields should be stripped
    expect(res.body.data.email).toBeUndefined();
    expect(res.body.data.mobile).toBeUndefined();
    expect(res.body.data.residential_address).toBeUndefined();
    expect(res.body.data.date_of_birth).toBeUndefined();
  });

  it('should NOT strip PII for admin role', async () => {
    const token = generateAccessToken({
      user_id: adminUserId,
      tenant_id: tenantId,
      role: 'tpo_admin',
      email: 'admin@test.com',
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/test', authenticate, resolveTenant, piiFilter(), (_req: any, res: any) => {
      res.json({ data: { name: 'Test', email: 'visible@test.com', mobile: '123' } });
    });

    const res = await request(testApp)
      .get('/api/test')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('visible@test.com');
    expect(res.body.data.mobile).toBe('123');
  });
});

// =========================================================
// Validation Middleware
// =========================================================
describe('Validation Middleware', () => {
  it('should validate request body and reject invalid data', async () => {
    const testApp = express();
    testApp.use(express.json());

    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    });

    testApp.post('/test', validate(schema, 'body'), (_req: any, res: any) => {
      res.json({ ok: true });
    });
    testApp.use(errorHandler);

    // Invalid data
    const res = await request(testApp)
      .post('/test')
      .send({ email: 'not-an-email', name: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('should pass valid data through', async () => {
    const testApp = express();
    testApp.use(express.json());

    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    });

    testApp.post('/test', validate(schema, 'body'), (req: any, res: any) => {
      res.json({ validated: req.validated.body });
    });

    const res = await request(testApp)
      .post('/test')
      .send({ email: 'test@test.com', name: 'Valid Name' });

    expect(res.status).toBe(200);
    expect(res.body.validated.email).toBe('test@test.com');
  });
});

// =========================================================
// Role Middleware
// =========================================================
describe('Role Middleware', () => {
  it('should allow correct role', async () => {
    const token = generateAccessToken({
      user_id: adminUserId,
      tenant_id: tenantId,
      role: 'tpo_admin',
      email: 'admin@test.com',
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.get('/api/test', authenticate, resolveTenant, requireRole('tpo_admin', 'super_admin'), (_req: any, res: any) => {
      res.json({ ok: true });
    });

    const res = await request(testApp)
      .get('/api/test')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('should reject incorrect role', async () => {
    const token = generateAccessToken({
      user_id: studentUserId,
      tenant_id: tenantId,
      role: 'student',
      email: 'student@test.com',
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.get('/api/test', authenticate, resolveTenant, requireRole('tpo_admin'), (_req: any, res: any) => {
      res.json({ ok: true });
    });
    testApp.use(errorHandler);

    const res = await request(testApp)
      .get('/api/test')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROLE_NOT_ALLOWED');
  });
});

// =========================================================
// Error Handler
// =========================================================
describe('Error Handler', () => {
  it('should handle unknown errors with 500', async () => {
    const testApp = express();
    testApp.get('/test', () => { throw new Error('Unexpected!'); });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should return 404 for unmatched routes on main app', async () => {
    const token = generateAccessToken({
      user_id: adminUserId,
      tenant_id: tenantId,
      role: 'tpo_admin',
      email: 'admin@test.com',
    });

    const res = await request(app)
      .get('/api/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
