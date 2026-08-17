import { Router } from 'express';
import * as ctrl from './offer.controller';
import { requirePermission } from '../../middleware/permission';
import { requireStudentProfileAccess } from '../../middleware/student-access';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { scopeToDepartment } from '../../middleware/scope';
import {
  createOfferSchema,
  rejectOfferSchema,
  studentRejectOfferSchema,
  joiningStatusSchema,
  complianceSchema,
  queryOffersSchema,
} from './offer.schema';

const router = Router();

// Student routes
router.get('/my', requireRole('student'), requireStudentProfileAccess, ctrl.getMyOffers);
router.put('/:offerId/accept', requireRole('student'), requireStudentProfileAccess, ctrl.acceptOffer);
router.put(
  '/:offerId/student-reject',
  requireRole('student'),
  requireStudentProfileAccess,
  validate(studentRejectOfferSchema),
  ctrl.studentRejectOffer,
);

// Admin routes
router.get(
  '/',
  requireRole('tpo_admin', 'tpo_employee', 'faculty_coordinator'),
  requirePermission('offers', 'view'),
  scopeToDepartment(),
  validate(queryOffersSchema, 'query'),
  ctrl.getOffers
);
router.post(
  '/',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('offers', 'create'),
  validate(createOfferSchema),
  ctrl.createOffer
);
router.get(
  '/:offerId',
  requireRole('tpo_admin', 'tpo_employee', 'faculty_coordinator'),
  requirePermission('offers', 'view'),
  scopeToDepartment(),
  ctrl.getOfferById
);
router.put(
  '/:offerId/reject',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('offers', 'edit'),
  validate(rejectOfferSchema),
  ctrl.rejectOffer
);
router.put(
  '/:offerId/joining',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('offers', 'edit'),
  validate(joiningStatusSchema),
  ctrl.updateJoiningStatus
);
router.put(
  '/:offerId/compliance',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('offers', 'edit'),
  validate(complianceSchema),
  ctrl.updateCompliance
);

export default router;
