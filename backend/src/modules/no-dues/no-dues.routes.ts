import { Router } from 'express';
import * as ctrl from './no-dues.controller';
import { requirePermission } from '../../middleware/permission';
import { requireStudentProfileAccess } from '../../middleware/student-access';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { noDuesProofUpload, spreadsheetUpload } from '../../middleware/upload';
import {
  createNoDuesSchema,
  reviewNoDuesSchema,
  queryNoDuesSchema,
  updateNoDuesSchema,
  enableNoDuesEligibilitySchema,
} from './no-dues.schema';

const router = Router();

router.get('/my', requireRole('student'), requireStudentProfileAccess, ctrl.getMyNoDues);
router.get('/eligibility/my', requireRole('student'), requireStudentProfileAccess, ctrl.getMyNoDuesEligibility);
router.post('/proof', requireRole('student'), requireStudentProfileAccess, noDuesProofUpload.single('file'), ctrl.uploadNoDuesProof);
router.post('/', requireRole('student'), requireStudentProfileAccess, validate(createNoDuesSchema), ctrl.createNoDues);
router.put('/:id/resubmit', requireRole('student'), requireStudentProfileAccess, validate(updateNoDuesSchema), ctrl.resubmitNoDues);

router.get('/', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'view'), validate(queryNoDuesSchema, 'query'), ctrl.getNoDuesRequests);
router.post('/eligibility/import', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'edit'), spreadsheetUpload.single('file'), ctrl.importNoDuesEligibility);
router.post('/eligibility/enable', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'edit'), validate(enableNoDuesEligibilitySchema), ctrl.enableNoDuesEligibility);
router.get('/:id', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'view'), ctrl.getNoDuesById);
router.put('/:id', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'edit'), validate(updateNoDuesSchema), ctrl.updateNoDues);
router.put('/:id/review', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'approve'), validate(reviewNoDuesSchema), ctrl.reviewNoDues);
router.put('/:id/issue', requireRole('tpo_admin'), requirePermission('no_dues', 'approve'), ctrl.issueNoDues);

export default router;
