import { Router } from 'express';
import * as ctrl from './posting.controller';
import { requirePermission } from '../../middleware/permission';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { postingJobDescriptionUpload } from '../../middleware/upload';
import {
  createPostingSchema,
  updatePostingSchema,
  queryPostingsSchema,
  publishPostingSchema,
} from './posting.schema';

const router = Router();

// Read access for students, TPO admin, and TPO employee
router.get(
  '/',
  requireRole('student', 'tpo_admin', 'tpo_employee'),
  requirePermission('postings', 'view'),
  validate(queryPostingsSchema, 'query'),
  ctrl.getPostings
);
router.get(
  '/:postingId',
  requireRole('student', 'tpo_admin', 'tpo_employee'),
  requirePermission('postings', 'view'),
  ctrl.getPostingById
);

// Write access for TPO admin/employee only
router.post(
  '/job-description',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('postings', 'create'),
  postingJobDescriptionUpload.single('file'),
  ctrl.uploadJobDescription
);
router.post(
  '/',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('postings', 'create'),
  validate(createPostingSchema),
  ctrl.createPosting
);
router.put(
  '/:postingId',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('postings', 'edit'),
  validate(updatePostingSchema),
  ctrl.updatePosting
);
router.put(
  '/:postingId/publish',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('postings', 'approve'),
  validate(publishPostingSchema),
  ctrl.publishPosting
);
router.put(
  '/:postingId/close',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('postings', 'approve'),
  ctrl.closePosting
);

export default router;
