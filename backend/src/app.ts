import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/error-handler';
import { validate } from './middleware/validate';
import { requirePermission } from './middleware/permission';
import { requireRole } from './middleware/role';
import { defaultLimiter } from './middleware/rate-limiter';
import { authenticate } from './middleware/auth';
import { resolveTenant } from './middleware/tenant';
import authRoutes from './modules/auth/auth.routes';
import studentRoutes from './modules/students/student.routes';
import companyRoutes, { recruiterRouter } from './modules/employers/employer.routes';
import postingRoutes from './modules/postings/posting.routes';
import applicationRoutes from './modules/applications/application.routes';
import offerRoutes from './modules/offers/offer.routes';
import eventRoutes from './modules/events/event.routes';
import nocRoutes from './modules/noc/noc.routes';
import * as nocTemplateController from './modules/noc-templates/noc-template.controller';
import nocTemplateRoutes, { adminNocTemplateRouter } from './modules/noc-templates/noc-template.routes';
import { postingTypeParamSchema, upsertNocTemplateSchema } from './modules/noc-templates/noc-template.schema';
import internshipRoutes from './modules/internships/internship.routes';
import announcementRoutes from './modules/announcements/announcement.routes';
import circularRoutes from './modules/circulars/circular.routes';
import noDuesRoutes from './modules/no-dues/no-dues.routes';
import policyRoutes from './modules/policies/policy.routes';
import portfolioRoutes from './modules/portfolio/portfolio.routes';
import adminRoutes from './modules/admin/admin.routes';
import reportRoutes from './modules/reports/report.routes';
import recruiterPortalRoutes from './modules/recruiter-portal/recruiter-portal.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import masterRoutes, { adminMastersRouter } from './modules/masters/masters.routes';
import facultyRoutes from './modules/faculty/faculty.routes';

const app = express();

// Request logging
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/api/health',
    },
    redact: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.confirm_password',
      'req.body.current_password',
      'req.body.new_password',
      'req.body.confirm_new_password',
      'req.body.otp',
      'req.body.token',
      'req.body.signup_token',
      'req.body.verified_token',
      'res.body.reset_token',
    ],
  })
);

// Security
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);

// Rate limiting
app.use(defaultLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger docs (public)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Uploaded files (public). These are public, embeddable assets, so they must be loadable
// cross-origin (e.g. dev frontend on :8080 embedding images from the API on :3000, or a
// separate API subdomain / CDN in prod). helmet()'s default `Cross-Origin-Resource-Policy:
// same-origin` would otherwise make the browser BLOCK the <img> (curl still gets 200, but the
// browser renders nothing). Override CORP to `cross-origin` on these two static mounts only —
// the global helmet() default stays strict for every other route.
const uploadsStatic = express.static(path.resolve(env.uploadDir), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
});
app.use('/uploads', uploadsStatic);
// Also expose uploaded files under the API prefix so they are reachable through the
// same reverse-proxy path as the API (single-origin deploys forward only /api).
// Must stay ABOVE the `/api` auth middleware below so it remains public.
app.use('/api/uploads', uploadsStatic);

// -----------------------------------------------
// Public routes (auth, tenant config) - no auth required
// -----------------------------------------------
app.use('/api/auth', authRoutes);

// -----------------------------------------------
// Auth + Tenant middleware for all protected routes
// -----------------------------------------------
app.use('/api', authenticate, resolveTenant);

// -----------------------------------------------
// Protected routes
// -----------------------------------------------
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/recruiters', recruiterRouter);
app.use('/api/postings', postingRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/noc/templates', nocTemplateRoutes);
app.use('/api/noc', nocRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/circulars', circularRoutes);
app.use('/api/no-dues', noDuesRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/notifications', notificationRoutes);
app.get(
  '/api/admin/masters/noc-templates',
  requireRole('tpo_admin', 'super_admin'),
  requirePermission('masters', 'view'),
  nocTemplateController.getTemplates
);
app.get(
  '/api/admin/masters/noc-templates/:postingTypeMasterId',
  requireRole('tpo_admin', 'super_admin'),
  requirePermission('masters', 'view'),
  validate(postingTypeParamSchema, 'params'),
  nocTemplateController.getTemplateByPostingTypeId
);
app.put(
  '/api/admin/masters/noc-templates/:postingTypeMasterId',
  requireRole('tpo_admin', 'super_admin'),
  requirePermission('masters', 'edit'),
  validate(postingTypeParamSchema, 'params'),
  validate(upsertNocTemplateSchema),
  nocTemplateController.upsertTemplate
);
app.use('/api/admin/masters/noc-templates', adminNocTemplateRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/masters', adminMastersRouter);
app.use('/api/reports', reportRoutes);
app.use('/api/recruiter', recruiterPortalRoutes);
app.use('/api/faculty', facultyRoutes);

// 404 handler for unmatched routes
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
