import { Router } from 'express';
import * as ctrl from './employer.controller';
import { requirePermission } from '../../middleware/permission';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { spreadsheetUpload } from '../../middleware/upload';
import {
  createCompanySchema,
  updateCompanySchema,
  classifyCompanySchema,
  queryCompaniesSchema,
  queryRecruitersSchema,
  createRecruiterSchema,
  updateRecruiterSchema,
  verifyRecruiterSchema,
  createEngagementSchema,
} from './employer.schema';

const router = Router();

const readOnlyEmployerRoles = requireRole('tpo_admin', 'tpo_employee', 'faculty_coordinator');
const manageEmployerRoles = requireRole('tpo_admin', 'tpo_employee');

// Companies
router.get('/', readOnlyEmployerRoles, requirePermission('companies', 'view'), validate(queryCompaniesSchema, 'query'), ctrl.getCompanies);
router.get('/:companyId', readOnlyEmployerRoles, requirePermission('companies', 'view'), ctrl.getCompanyById);
router.get('/:companyId/engagements', readOnlyEmployerRoles, requirePermission('companies', 'view'), ctrl.getEngagements);

router.post('/', manageEmployerRoles, requirePermission('companies', 'create'), validate(createCompanySchema), ctrl.createCompany);
router.post('/import', manageEmployerRoles, requirePermission('companies', 'create'), spreadsheetUpload.single('file'), ctrl.importCompanies);
router.put('/:companyId', manageEmployerRoles, requirePermission('companies', 'edit'), validate(updateCompanySchema), ctrl.updateCompany);
router.put('/:companyId/classification', manageEmployerRoles, requirePermission('companies', 'edit'), validate(classifyCompanySchema), ctrl.classifyCompany);

// Recruiters (nested under company)
router.get('/:companyId/recruiters', manageEmployerRoles, requirePermission('recruiters', 'view'), ctrl.getRecruitersByCompany);
router.post('/:companyId/recruiters', manageEmployerRoles, requirePermission('recruiters', 'create'), validate(createRecruiterSchema), ctrl.createRecruiter);

// Engagements (nested under company)
router.post('/:companyId/engagements', manageEmployerRoles, requirePermission('companies', 'create'), validate(createEngagementSchema), ctrl.createEngagement);

export default router;

// Separate router for recruiter-level routes (not nested under company)
export const recruiterRouter = Router();
recruiterRouter.use(manageEmployerRoles);
recruiterRouter.get('/', requirePermission('recruiters', 'view'), validate(queryRecruitersSchema, 'query'), ctrl.getRecruiters);
recruiterRouter.put('/:recruiterId', requirePermission('recruiters', 'edit'), validate(updateRecruiterSchema), ctrl.updateRecruiter);
recruiterRouter.put('/:recruiterId/verify', requirePermission('recruiters', 'approve'), validate(verifyRecruiterSchema), ctrl.verifyRecruiter);
recruiterRouter.delete('/:recruiterId', requirePermission('recruiters', 'delete'), ctrl.deleteRecruiter);
