import { Router } from 'express';
import * as ctrl from './circular.controller';
import { requirePermission } from '../../middleware/permission';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { createTemplateSchema, updateTemplateSchema, generateCircularSchema, queryTemplatesSchema } from './circular.schema';

const router = Router();

router.get('/templates', requireRole('tpo_admin', 'tpo_employee'), requirePermission('circulars', 'view'), validate(queryTemplatesSchema, 'query'), ctrl.getTemplates);
router.post('/templates', requireRole('tpo_admin', 'tpo_employee'), requirePermission('circulars', 'create'), validate(createTemplateSchema), ctrl.createTemplate);
router.get('/templates/:templateId', requireRole('tpo_admin', 'tpo_employee'), requirePermission('circulars', 'view'), ctrl.getTemplateById);
router.put('/templates/:templateId', requireRole('tpo_admin', 'tpo_employee'), requirePermission('circulars', 'edit'), validate(updateTemplateSchema), ctrl.updateTemplate);

router.get('/generated', requireRole('tpo_admin', 'tpo_employee', 'faculty_coordinator'), requirePermission('circulars', 'view'), ctrl.getGeneratedCirculars);
router.get('/generated/my', requireRole('student'), ctrl.getMyGeneratedCirculars);
router.post('/generate', requireRole('tpo_admin', 'tpo_employee'), requirePermission('circulars', 'create'), validate(generateCircularSchema), ctrl.generateCircular);

export default router;
