import { Router } from 'express';
import * as ctrl from './announcement.controller';
import { requirePermission } from '../../middleware/permission';
import { requireStudentProfileAccess } from '../../middleware/student-access';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { scopeToDepartment, scopeToOwn } from '../../middleware/scope';
import { announcementAttachmentUpload } from '../../middleware/upload';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  queryAnnouncementsSchema,
  queryAudienceSemestersSchema,
} from './announcement.schema';

const router = Router();

// Admin routes
router.get(
  '/',
  requireRole('tpo_admin', 'tpo_employee', 'student', 'faculty_coordinator'),
  requirePermission('announcements', 'view'),
  scopeToDepartment(),
  scopeToOwn(),
  validate(queryAnnouncementsSchema, 'query'),
  ctrl.getAnnouncements
);
router.post(
  '/attachments',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('announcements', 'create'),
  announcementAttachmentUpload.single('file'),
  ctrl.uploadAnnouncementAttachment,
);
// Semester options for the create/edit audience picker, derived from students in the selected
// Institute/Course/Branch scope. MUST stay above `GET /:announcementId` (else "audience" is parsed
// as an id) and above the `router.use(requireRole('student'))` line further down.
router.get(
  '/audience/semesters',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('announcements', 'create'),
  validate(queryAudienceSemestersSchema, 'query'),
  ctrl.getAudienceSemesterOptions,
);
router.post('/', requireRole('tpo_admin', 'tpo_employee'), requirePermission('announcements', 'create'), validate(createAnnouncementSchema), ctrl.createAnnouncement);
router.get(
  '/:announcementId',
  requireRole('tpo_admin', 'tpo_employee', 'student', 'faculty_coordinator'),
  requirePermission('announcements', 'view'),
  scopeToDepartment(),
  scopeToOwn(),
  ctrl.getAnnouncementById
);
router.put('/:announcementId', requireRole('tpo_admin', 'tpo_employee'), requirePermission('announcements', 'edit'), validate(updateAnnouncementSchema), ctrl.updateAnnouncement);
router.put('/:announcementId/publish', requireRole('tpo_admin', 'tpo_employee'), requirePermission('announcements', 'approve'), ctrl.publishAnnouncement);
router.put('/:announcementId/archive', requireRole('tpo_admin', 'tpo_employee'), requirePermission('announcements', 'approve'), ctrl.archiveAnnouncement);

// Student receipts
router.use(requireRole('student'));
router.use(requireStudentProfileAccess);

router.put('/:announcementId/read', scopeToOwn(), ctrl.markRead);
router.put('/:announcementId/consent', scopeToOwn(), ctrl.giveConsent);

export default router;
