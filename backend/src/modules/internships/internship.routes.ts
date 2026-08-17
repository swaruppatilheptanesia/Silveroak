import { Router } from 'express';
import * as ctrl from './internship.controller';
import { requirePermission } from '../../middleware/permission';
import { requireStudentProfileAccess } from '../../middleware/student-access';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { scopeToCompany, scopeToDepartment, scopeToOwn } from '../../middleware/scope';
import { internshipDocumentUpload } from '../../middleware/upload';
import {
  createInternshipSchema,
  updateInternshipSchema,
  createIssueSchema,
  queryInternshipsSchema,
} from './internship.schema';

const router = Router();

// Student routes
router.get('/my', requireRole('student'), requireStudentProfileAccess, ctrl.getMyInternships);
router.post('/documents', requireRole('student'), requireStudentProfileAccess, internshipDocumentUpload.single('file'), ctrl.uploadInternshipDocument);
router.post('/', requireRole('student'), requireStudentProfileAccess, validate(createInternshipSchema), ctrl.createInternship);

// Admin / faculty / recruiter routes
router.get(
  '/',
  requireRole('tpo_admin', 'tpo_employee', 'faculty_coordinator', 'recruiter'),
  requirePermission('internships', 'view'),
  scopeToDepartment(),
  scopeToCompany(),
  validate(queryInternshipsSchema, 'query'),
  ctrl.getInternships
);
router.get(
  '/:internshipId',
  requireRole('tpo_admin', 'tpo_employee', 'student', 'faculty_coordinator', 'recruiter'),
  requirePermission('internships', 'view'),
  scopeToOwn(),
  scopeToDepartment(),
  scopeToCompany(),
  ctrl.getInternshipById
);
router.put('/:internshipId', requireRole('tpo_admin', 'tpo_employee'), requirePermission('internships', 'edit'), validate(updateInternshipSchema), ctrl.updateInternship);

// Issues
router.post(
  '/:internshipId/issues',
  requireRole('student', 'tpo_admin', 'tpo_employee'),
  scopeToOwn(),
  validate(createIssueSchema),
  ctrl.createIssue
);
router.put('/issues/:issueId/resolve', requireRole('tpo_admin', 'tpo_employee'), requirePermission('internships', 'approve'), ctrl.resolveIssue);

export default router;
