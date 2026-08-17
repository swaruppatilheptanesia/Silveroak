import { Router } from 'express';
import * as ctrl from './event.controller';
import { requirePermission } from '../../middleware/permission';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { scopeToCompany, scopeToOwn } from '../../middleware/scope';
import {
  createEventSchema,
  updateEventSchema,
  queryEventsSchema,
  createPanelSchema,
  assignStudentsSchema,
  markAttendanceSchema,
  updateEventStatusSchema,
} from './event.schema';

const router = Router();

// Student-scoped feed: skip the generic events:view permission matrix and rely
// on per-student scoping via EventStudent. Matches the existing applyVisibilityScope
// branch for role='student' in event.service.ts.
router.get(
  '/my',
  requireRole('student'),
  scopeToOwn(),
  ctrl.getMyEvents,
);

// Student-scoped event detail — service-level applyVisibilityScope keeps the
// student bound to events they're assigned to, so no requirePermission needed.
router.get(
  '/my/:eventId',
  requireRole('student'),
  scopeToOwn(),
  ctrl.getMyEventById,
);

router.get(
  '/',
  requireRole('tpo_admin', 'tpo_employee', 'student', 'faculty_coordinator', 'recruiter'),
  requirePermission('events', 'view'),
  scopeToOwn(),
  scopeToCompany(),
  validate(queryEventsSchema, 'query'),
  ctrl.getEvents
);
router.get(
  '/:eventId',
  requireRole('tpo_admin', 'tpo_employee', 'student', 'faculty_coordinator', 'recruiter'),
  requirePermission('events', 'view'),
  scopeToOwn(),
  scopeToCompany(),
  ctrl.getEventById
);

router.post('/', requireRole('tpo_admin', 'tpo_employee'), requirePermission('events', 'create'), validate(createEventSchema), ctrl.createEvent);
router.put('/:eventId', requireRole('tpo_admin', 'tpo_employee'), requirePermission('events', 'edit'), validate(updateEventSchema), ctrl.updateEvent);
router.put(
  '/:eventId/status',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('events', 'edit'),
  validate(updateEventStatusSchema),
  ctrl.updateEventStatus
);

// Panels
router.post(
  '/:eventId/panels',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('events', 'edit'),
  validate(createPanelSchema),
  ctrl.createPanel
);

// Student assignment & attendance
router.post(
  '/:eventId/students',
  requireRole('tpo_admin', 'tpo_employee'),
  requirePermission('events', 'edit'),
  validate(assignStudentsSchema),
  ctrl.assignStudents
);
router.put(
  '/:eventId/attendance',
  requireRole('tpo_admin', 'tpo_employee', 'faculty_coordinator'),
  requirePermission('events', 'approve'),
  validate(markAttendanceSchema),
  ctrl.markAttendance
);

export default router;
