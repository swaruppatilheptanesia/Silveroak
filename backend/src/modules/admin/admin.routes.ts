import { Router } from 'express';
import * as ctrl from './admin.controller';
import { validate } from '../../middleware/validate';
import { requirePermission } from '../../middleware/permission';
import { requireRole } from '../../middleware/role';
import { adminNocTemplateRouter } from '../noc-templates/noc-template.routes';
import {
  bulkVerifyStudentsSchema,
  createEligibilityRuleSchema,
  createUserSchema,
  crmEmployeeParamSchema,
  linkRecruiterToCompanySchema,
  queryCrmDepartmentsSchema,
  queryCrmEmployeesSchema,
  queryInterestRegistrationsSchema,
  withdrawInterestRegistrationSchema,
  queryPortfoliosSchema,
  querySelectionDatabaseSchema,
  queryStudentsSchema,
  updatePermissionSchema,
  updateEligibilityRuleSchema,
  updateUserSchema,
  queryUsersSchema,
  queryAuditLogsSchema,
  verifyStudentSchema,
  updateStudentProfileBlockSchema,
  reopenPlacementSchema,
} from './admin.schema';

const router = Router();
router.use(requireRole('tpo_admin', 'super_admin'));

router.use('/masters/noc-templates', adminNocTemplateRouter);

// Student management
router.get('/students', requirePermission('students', 'view'), validate(queryStudentsSchema, 'query'), ctrl.getStudents);
router.get('/students/:studentId', requirePermission('students', 'view'), ctrl.getStudentById);
router.put(
  '/students/:studentId/verification',
  requirePermission('student_verification', 'approve'),
  validate(verifyStudentSchema),
  ctrl.verifyStudent
);
router.put(
  '/students/:studentId/profile-block',
  requirePermission('students', 'edit'),
  validate(updateStudentProfileBlockSchema),
  ctrl.updateStudentProfileBlock
);
router.put(
  '/students/:studentId/placement/reopen',
  requirePermission('students', 'edit'),
  validate(reopenPlacementSchema),
  ctrl.reopenStudentPlacement
);
router.post(
  '/students/verification/bulk',
  requirePermission('student_verification', 'approve'),
  validate(bulkVerifyStudentsSchema),
  ctrl.bulkVerifyStudents
);

// Eligibility rules
router.get('/eligibility-rules', requirePermission('eligibility_rules', 'view'), ctrl.getEligibilityRules);
router.post(
  '/eligibility-rules',
  requirePermission('eligibility_rules', 'create'),
  validate(createEligibilityRuleSchema),
  ctrl.createEligibilityRule
);
router.put(
  '/eligibility-rules/:ruleId',
  requirePermission('eligibility_rules', 'edit'),
  validate(updateEligibilityRuleSchema),
  ctrl.updateEligibilityRule
);
router.delete('/eligibility-rules/:ruleId', requirePermission('eligibility_rules', 'delete'), ctrl.deleteEligibilityRule);

// Portfolio monitoring and selection database
router.get('/portfolios', requirePermission('portfolios', 'view'), validate(queryPortfoliosSchema, 'query'), ctrl.getPortfolios);
router.get(
  '/selection-database',
  requirePermission('selection_database', 'view'),
  validate(querySelectionDatabaseSchema, 'query'),
  ctrl.getSelectionDatabase
);

// Interest lists
router.get('/interests/summary', requirePermission('interest_lists', 'view'), ctrl.getInterestSummary);
// 10 most recent registration records for the TPO dashboard (literal path — above /:id routes).
router.get(
  '/interests/registrations/recent',
  requirePermission('interest_lists', 'view'),
  ctrl.getRecentInterestRegistrations
);
router.get(
  '/interests/registrations',
  requirePermission('interest_lists', 'view'),
  validate(queryInterestRegistrationsSchema, 'query'),
  ctrl.getInterestRegistrations
);
router.put(
  '/interests/registrations/:id/approve',
  requirePermission('interest_lists', 'approve'),
  ctrl.approveInterestRegistration
);
router.put(
  '/interests/registrations/:id/withdraw',
  requirePermission('interest_lists', 'approve'),
  validate(withdrawInterestRegistrationSchema),
  ctrl.withdrawInterestRegistration
);

// Users
router.get('/crm/departments', requirePermission('users', 'view'), validate(queryCrmDepartmentsSchema, 'query'), ctrl.getCrmDepartments);
router.get('/crm/employees', requirePermission('users', 'view'), validate(queryCrmEmployeesSchema, 'query'), ctrl.getCrmEmployees);
router.get('/crm/employees/:empId', requirePermission('users', 'view'), validate(crmEmployeeParamSchema, 'params'), ctrl.getCrmEmployeeDetail);
router.get('/users', requirePermission('users', 'view'), validate(queryUsersSchema, 'query'), ctrl.getUsers);
router.post('/users', requirePermission('users', 'create'), validate(createUserSchema), ctrl.createUser);
router.get('/users/:userId', requirePermission('users', 'view'), ctrl.getUserById);
router.put('/users/:userId', requirePermission('users', 'edit'), validate(updateUserSchema), ctrl.updateUser);
router.put(
  '/users/:userId/recruiter',
  requirePermission('users', 'edit'),
  validate(linkRecruiterToCompanySchema),
  ctrl.linkRecruiterToCompany,
);
router.post(
  '/users/:userId/regenerate-password',
  requireRole('super_admin'),
  requirePermission('users', 'edit'),
  ctrl.regenerateUserPassword,
);

// Audit logs
router.get('/audit-logs', requirePermission('audit_logs', 'view'), validate(queryAuditLogsSchema, 'query'), ctrl.getAuditLogs);

// Permissions
router.get('/permissions', requireRole('super_admin'), ctrl.getPermissions);
router.put('/permissions/:permissionId', requireRole('super_admin'), validate(updatePermissionSchema), ctrl.updatePermission);

export default router;
