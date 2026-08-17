import { Router } from 'express';
import * as ctrl from './masters.controller';
import { validate } from '../../middleware/validate';
import { requirePermission } from '../../middleware/permission';
import { requireRole } from '../../middleware/role';
import {
  createMasterSchema,
  queryAdminMastersSchema,
  queryMastersSchema,
  updateMasterSchema,
} from './masters.schema';

const router = Router();

router.get('/', validate(queryMastersSchema, 'query'), ctrl.getMasters);

export const adminMastersRouter = Router();

adminMastersRouter.use(requireRole('tpo_admin', 'super_admin'));
adminMastersRouter.get('/', requirePermission('masters', 'view'), validate(queryAdminMastersSchema, 'query'), ctrl.getAdminMasters);
adminMastersRouter.post('/', requirePermission('masters', 'create'), validate(createMasterSchema), ctrl.createMaster);
adminMastersRouter.put('/:masterId', requirePermission('masters', 'edit'), validate(updateMasterSchema), ctrl.updateMaster);
adminMastersRouter.delete('/:masterId', requirePermission('masters', 'delete'), ctrl.deleteMaster);

export default router;
