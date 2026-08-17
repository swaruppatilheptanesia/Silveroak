import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let tenantSlug: string;

beforeAll(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'silver-oak-university' } });
  if (!tenant) throw new Error('Seed data not found');
  tenantSlug = tenant.slug;
});

afterAll(async () => {
  // Clean up refresh tokens created during tests
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refresh_token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe('tpoadmin@silveroak.ac.in');
    expect(res.body.user.role).toBe('tpo_admin');
    expect(Array.isArray(res.body.user.permissions)).toBe(true);
    expect(res.body.user.permissions.length).toBeGreaterThan(0);
  });

  it('should login with tenant_slug', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@silveroak.ac.in', password: 'Password@123', tenant_slug: tenantSlug });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('student');
  });

  it('should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tpoadmin@silveroak.ac.in', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'Password@123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'Password@123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject empty password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tpoadmin@silveroak.ac.in', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject invalid tenant slug', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123', tenant_slug: 'nonexistent' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
    refreshToken = res.body.refresh_token;
  });

  it('should refresh tokens with valid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refresh_token');
    // New refresh token should be different (rotation)
    expect(res.body.refresh_token).not.toBe(refreshToken);
  });

  it('should reject reused (revoked) refresh token', async () => {
    // The original refreshToken was revoked after the previous test
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });

  it('should reject invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: 'completely.invalid.token' });

    expect(res.status).toBe(401);
  });

  it('should reject empty refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/logout', () => {
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@silveroak.ac.in', password: 'Password@123' });
    accessToken = res.body.token;
    refreshToken = res.body.refresh_token;
  });

  it('should reject logout without auth token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  it('should logout successfully', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });

  it('should invalidate refresh token after logout', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
    accessToken = res.body.token;
  });

  it('should return current user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('tpoadmin@silveroak.ac.in');
    expect(res.body.role).toBe('tpo_admin');
    expect(res.body.name).toBe('Dr. Rajesh Patel');
    expect(res.body.tenant).toHaveProperty('slug');
    expect(res.body.tenant).toHaveProperty('name');
    expect(Array.isArray(res.body.permissions)).toBe(true);
    expect(res.body.permissions.length).toBeGreaterThan(0);
    // Should not expose password_hash
    expect(res.body.password_hash).toBeUndefined();
  });

  it('should reject without auth', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/forgot-password and /api/auth/reset-password', () => {
  it('should issue a reset token for an active user', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'student@silveroak.ac.in', tenant_slug: tenantSlug });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Reset link sent');
    expect(typeof res.body.reset_token).toBe('string');
    expect(res.body.reset_token.length).toBeGreaterThan(10);
  });

  it('should reset the password using the reset token', async () => {
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'student@silveroak.ac.in', tenant_slug: tenantSlug });

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: forgotRes.body.reset_token,
        new_password: 'Password@123',
        confirm_new_password: 'Password@123',
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toBe('Password reset successful');
  });
});

describe('Auth Edge Cases', () => {
  it('should allow all roles to login', async () => {
    const emails = [
      'superadmin@silveroak.ac.in',
      'tpoadmin@silveroak.ac.in',
      'tpoemployee@silveroak.ac.in',
      'faculty@silveroak.ac.in',
      'student@silveroak.ac.in',
      'recruiter@techcorp.com',
      'management@silveroak.ac.in',
    ];

    for (const email of emails) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    }
  });
});
