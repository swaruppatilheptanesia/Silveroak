import { Router } from 'express';
import * as ctrl from './noc.controller';
import { requirePermission } from '../../middleware/permission';
import { requireStudentProfileAccess } from '../../middleware/student-access';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { scopeToDepartment } from '../../middleware/scope';
import { nocOfferLetterUpload, nocSupportingDocumentUpload, nocCompletionCertificateUpload, nocTerminationLetterUpload } from '../../middleware/upload';
import { createNocSchema, approveNocSchema, rejectNocSchema, rejectCompletionCertificateSchema, queryNocSchema } from './noc.schema';

const router = Router();

// Student routes — gated by the noc_requests permission matrix so a Super Admin can
// revoke a student's View/Create from the Roles tab and have it enforced here.
router.get('/my', requireRole('student'), requirePermission('noc_requests', 'view'), requireStudentProfileAccess, ctrl.getMyNocs);
router.get(
  '/field-suggestions',
  requireRole('student'),
  requirePermission('noc_requests', 'view'),
  requireStudentProfileAccess,
  ctrl.getNocFieldSuggestions,
);
router.post(
  '/offer-letter',
  requireRole('student'),
  requirePermission('noc_requests', 'create'),
  requireStudentProfileAccess,
  nocOfferLetterUpload.single('file'),
  ctrl.uploadOfferLetter,
);
router.post(
  '/supporting-document',
  requireRole('student'),
  requirePermission('noc_requests', 'create'),
  requireStudentProfileAccess,
  nocSupportingDocumentUpload.single('file'),
  ctrl.uploadSupportingDocument,
);
router.post(
  '/termination-letter',
  requireRole('student'),
  requirePermission('noc_requests', 'create'),
  requireStudentProfileAccess,
  nocTerminationLetterUpload.single('file'),
  ctrl.uploadTerminationLetter,
);
router.post(
  '/',
  requireRole('student'),
  requirePermission('noc_requests', 'create'),
  requireStudentProfileAccess,
  validate(createNocSchema),
  ctrl.createNoc,
);
// Student uploads/re-uploads the internship completion certificate for an issued NOC.
router.post(
  '/:nocId/completion-certificate',
  requireRole('student'),
  requirePermission('noc_requests', 'create'),
  requireStudentProfileAccess,
  nocCompletionCertificateUpload.single('file'),
  ctrl.submitCompletionCertificate,
);

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
// Faculty NOC dashboard stat-card counts (department-wide). Must precede `/:nocId`.
router.get(
  '/summary',
  requireRole('faculty_coordinator'),
  requirePermission('noc_requests', 'view'),
  scopeToDepartment(),
  ctrl.getFacultyNocSummary
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

// Completion-certificate review (TPO)
router.put(
  '/:nocId/completion-certificate/approve',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('noc_requests', 'approve'),
  ctrl.approveCompletionCertificate,
);
router.put(
  '/:nocId/completion-certificate/reject',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('noc_requests', 'approve'),
  validate(rejectCompletionCertificateSchema),
  ctrl.rejectCompletionCertificate,
);

export default router;
