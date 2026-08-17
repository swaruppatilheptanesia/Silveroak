import { Router } from 'express';
import * as ctrl from './noc.controller';
import { requirePermission } from '../../middleware/permission';
import { requireStudentProfileAccess } from '../../middleware/student-access';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { scopeToDepartment } from '../../middleware/scope';
import { nocOfferLetterUpload } from '../../middleware/upload';
import { createNocSchema, approveNocSchema, rejectNocSchema, queryNocSchema } from './noc.schema';

const router = Router();

// Student routes
router.use(requireRole('student'));
router.use(requireStudentProfileAccess);

router.get('/my', ctrl.getMyNocs);
router.post('/offer-letter', nocOfferLetterUpload.single('file'), ctrl.uploadOfferLetter);
router.post('/', validate(createNocSchema), ctrl.createNoc);

// Faculty routes
router.put(
  '/:nocId/faculty-approve',
  requireRole('faculty_coordinator'),
  requirePermission('noc_requests', 'approve'),
  scopeToDepartment(),
  validate(approveNocSchema),
  ctrl.facultyApprove
);

// Admin routes
router.get(
  '/',
  requireRole('tpo_admin', 'tpo_employee', 'faculty_coordinator'),
  requirePermission('noc_requests', 'view'),
  scopeToDepartment(),
  validate(queryNocSchema, 'query'),
  ctrl.getNocs
);
router.get(
  '/:nocId',
  requireRole('tpo_admin', 'tpo_employee', 'faculty_coordinator'),
  requirePermission('noc_requests', 'view'),
  scopeToDepartment(),
  ctrl.getNocById
);
router.put(
  '/:nocId/tpo-approve',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('noc_requests', 'approve'),
  validate(approveNocSchema),
  ctrl.tpoApprove
);
router.put(
  '/:nocId/reject',
  requireRole('tpo_admin', 'tpo_employee', 'faculty_coordinator'),
  requirePermission('noc_requests', 'approve'),
  scopeToDepartment(),
  validate(rejectNocSchema),
  ctrl.rejectNoc
);
router.put(
  '/:nocId/issue',
  requireRole('tpo_admin'),
  requirePermission('noc_requests', 'approve'),
  ctrl.issueNoc
);

export default router;
