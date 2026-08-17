import { Router } from 'express';
import * as ctrl from './noc-template.controller';
import { validate } from '../../middleware/validate';
import { requirePermission } from '../../middleware/permission';
import { requireRole } from '../../middleware/role';
import { postingTypeParamSchema, upsertNocTemplateSchema } from './noc-template.schema';

const router = Router();

router.use(requireRole('tpo_admin', 'tpo_employee', 'faculty_coordinator'));
router.get('/', requirePermission('noc_requests', 'view'), ctrl.getTemplates);
router.get('/:postingTypeMasterId', requirePermission('noc_requests', 'view'), validate(postingTypeParamSchema, 'params'), ctrl.getTemplateByPostingTypeId);

export const adminNocTemplateRouter = Router();

adminNocTemplateRouter.use(requireRole('tpo_admin', 'super_admin'));
adminNocTemplateRouter.get('/', requirePermission('masters', 'view'), ctrl.getTemplates);
adminNocTemplateRouter.get('/:postingTypeMasterId', requirePermission('masters', 'view'), validate(postingTypeParamSchema, 'params'), ctrl.getTemplateByPostingTypeId);
adminNocTemplateRouter.put(
  '/:postingTypeMasterId',
  requirePermission('masters', 'edit'),
  validate(postingTypeParamSchema, 'params'),
  validate(upsertNocTemplateSchema),
  ctrl.upsertTemplate
);

export default router;
