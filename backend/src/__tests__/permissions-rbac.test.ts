import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let superAdminToken: string;
let adminToken: string;
let postingsPermissionId: string;
let originalCanView = true;

beforeAll(async () => {
  const superAdminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'superadmin@silveroak.ac.in', password: 'Password@123' });
  superAdminToken = superAdminLogin.body.token;

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  adminToken = adminLogin.body.token;

  const permissionsRes = await request(app)
    .get('/api/admin/permissions')
    .set('Authorization', `Bearer ${superAdminToken}`);

  const postingsPermission = permissionsRes.body.permissions.find(
    (permission: { role: string; module: string; id: string; can_view: boolean }) =>
      permission.role === 'tpo_admin' && permission.module === 'postings',
  );

  if (!postingsPermission) {
    throw new Error('TPO admin postings permission not found');
  }

  postingsPermissionId = postingsPermission.id;
  originalCanView = postingsPermission.can_view;
});

afterAll(async () => {
  if (postingsPermissionId) {
    await prisma.rolePermission.update({
      where: { id: postingsPermissionId },
      data: { can_view: originalCanView },
    });
  }

  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

describe('Permission-managed RBAC', () => {
  it('should restrict permission management to super admin', async () => {
    const res = await request(app)
      .get('/api/admin/permissions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });

  it('should enforce updated permissions on auth profile and protected routes', async () => {
    const disableRes = await request(app)
      .put(`/api/admin/permissions/${postingsPermissionId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ can_view: false });

    expect(disableRes.status).toBe(200);
    expect(disableRes.body.can_view).toBe(false);

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(meRes.status).toBe(200);
    const postingsPermission = meRes.body.permissions.find(
      (permission: { module: string; can_view: boolean }) => permission.module === 'postings',
    );
    expect(postingsPermission?.can_view).toBe(false);

    const postingsRes = await request(app)
      .get('/api/postings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(postingsRes.status).toBe(403);
    expect(postingsRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

    const restoreRes = await request(app)
      .put(`/api/admin/permissions/${postingsPermissionId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ can_view: originalCanView });

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.can_view).toBe(originalCanView);
  });
});
