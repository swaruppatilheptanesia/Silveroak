import { Router } from 'express';
import * as ctrl from './policy.controller';
import { requirePermission } from '../../middleware/permission';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { policyDocumentUpload } from '../../middleware/upload';
import {
  createPolicySchema,
  queryBranchesByCourseSchema,
  queryCoursesByInstituteSchema,
  updatePolicySchema,
  queryPoliciesSchema,
} from './policy.schema';

const router = Router();

router.get('/', requireRole('tpo_admin', 'student'), requirePermission('policies', 'view'), validate(queryPoliciesSchema, 'query'), ctrl.getPolicies);
router.get('/audience/institutes', requireRole('tpo_admin', 'tpo_employee', 'super_admin', 'faculty_coordinator'), ctrl.getInstituteOptions);
router.get('/audience/branches', requireRole('tpo_admin', 'tpo_employee', 'super_admin', 'faculty_coordinator'), validate(queryBranchesByCourseSchema, 'query'), ctrl.getBranchOptions);
router.get('/audience/courses', requireRole('tpo_admin', 'tpo_employee', 'super_admin', 'faculty_coordinator'), validate(queryCoursesByInstituteSchema, 'query'), ctrl.getCourseOptions);
router.post('/documents', requireRole('tpo_admin'), requirePermission('policies', 'edit'), policyDocumentUpload.single('file'), ctrl.uploadPolicyDocument);
router.post('/', requireRole('tpo_admin'), requirePermission('policies', 'create'), validate(createPolicySchema), ctrl.createPolicy);
router.get('/:id', requireRole('tpo_admin', 'student'), requirePermission('policies', 'view'), ctrl.getPolicyById);
router.put('/:id', requireRole('tpo_admin'), requirePermission('policies', 'edit'), validate(updatePolicySchema), ctrl.updatePolicy);
router.delete('/:id', requireRole('tpo_admin'), requirePermission('policies', 'delete'), ctrl.deletePolicy);

export default router;
