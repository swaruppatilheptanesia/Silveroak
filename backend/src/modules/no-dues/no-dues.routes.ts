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

// Student routes — gated by the no_dues permission matrix so a Super Admin can revoke
// a student's View/Create from the Roles tab and have it enforced here.
router.get('/my', requireRole('student'), requirePermission('no_dues', 'view'), requireStudentProfileAccess, ctrl.getMyNoDues);
router.get('/eligibility/my', requireRole('student'), requirePermission('no_dues', 'view'), requireStudentProfileAccess, ctrl.getMyNoDuesEligibility);
router.post('/proof', requireRole('student'), requirePermission('no_dues', 'create'), requireStudentProfileAccess, noDuesProofUpload.single('file'), ctrl.uploadNoDuesProof);
router.post('/', requireRole('student'), requirePermission('no_dues', 'create'), requireStudentProfileAccess, validate(createNoDuesSchema), ctrl.createNoDues);
router.put('/:id/resubmit', requireRole('student'), requirePermission('no_dues', 'create'), requireStudentProfileAccess, validate(updateNoDuesSchema), ctrl.resubmitNoDues);

router.get('/', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'view'), validate(queryNoDuesSchema, 'query'), ctrl.getNoDuesRequests);
router.get('/passing-years', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'view'), ctrl.getPassingYears);
router.post('/eligibility/import', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'edit'), spreadsheetUpload.single('file'), ctrl.importNoDuesEligibility);
router.post('/eligibility/enable', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'edit'), validate(enableNoDuesEligibilitySchema), ctrl.enableNoDuesEligibility);
router.get('/:id', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'view'), ctrl.getNoDuesById);
router.put('/:id', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'edit'), validate(updateNoDuesSchema), ctrl.updateNoDues);
router.put('/:id/review', requireRole('tpo_admin', 'tpo_employee'), requirePermission('no_dues', 'approve'), validate(reviewNoDuesSchema), ctrl.reviewNoDues);
router.put('/:id/issue', requireRole('tpo_admin'), requirePermission('no_dues', 'approve'), ctrl.issueNoDues);

export default router;
