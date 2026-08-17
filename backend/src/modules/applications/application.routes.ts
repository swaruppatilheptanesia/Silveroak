import { Router } from 'express';
import * as ctrl from './application.controller';
import { requirePermission } from '../../middleware/permission';
import { requireStudentProfileAccess } from '../../middleware/student-access';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import {
  applySchema,
  moveStageSchema,
  bulkMoveStageSchema,
  mockRoundResultSchema,
  queryApplicationsSchema,
} from './application.schema';

const router = Router();

// Student routes
router.post(
  '/apply',
  requireRole('student'),
  requireStudentProfileAccess,
  validate(applySchema),
  ctrl.apply
);
router.get(
  '/my',
  requireRole('student'),
  requireStudentProfileAccess,
  ctrl.getMyApplications
);
router.delete(
  '/:applicationId/withdraw',
  requireRole('student'),
  requireStudentProfileAccess,
  ctrl.withdrawApplication
);

// Admin routes
router.get(
  '/',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('applications', 'view'),
  validate(queryApplicationsSchema, 'query'),
  ctrl.getApplications
);
router.put(
  '/bulk/stage',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('applications', 'edit'),
  validate(bulkMoveStageSchema),
  ctrl.bulkMoveStage
);
router.get(
  '/:applicationId',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('applications', 'view'),
  ctrl.getApplicationById
);
router.put(
  '/:applicationId/stage',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('applications', 'edit'),
  validate(moveStageSchema),
  ctrl.moveStage
);
router.put(
  '/:applicationId/mock-result',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('applications', 'edit'),
  validate(mockRoundResultSchema),
  ctrl.setMockRoundResult
);

export default router;
