import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../shared/schemas/common';

export const createEventSchema = z.object({
  company_id: z.string().uuid(),
  // All linked postings (roles) for this event. `posting_id` kept for legacy callers.
  posting_ids: z.array(z.string().uuid()).default([]),
  posting_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(300),
  type: z.string().min(1).max(150),
  date: z.coerce.date(),
  start_time: z.string().max(10),
  end_time: z.string().max(10),
  venue: z.string().min(1).max(300),
  reporting_time: z.string().max(10).optional().nullable(),
  dress_code: z.string().max(200).optional().nullable(),
  instructions: z.string().max(5000).optional().nullable(),
  documents_required: z.array(z.string()).default([]),
  faculty_coordinators: z.array(z.string()).default([]),
  faculty_coordinator_ids: z.array(z.string()).default([]),
  // "Pipeline" audience scope (institute/course/branch). Matching students are
  // auto-assigned to the event. Empty = manual assignment only.
  target_institutes: z.array(z.string().max(200)).default([]),
  target_courses: z.array(z.string().max(200)).default([]),
  target_branches: z.array(z.string().max(200)).default([]),
  // Application-pipeline-stage eligibility. When set, only students whose current application
  // stage on a linked posting matches are auto-assigned. Omit/null = all applicants ("All").
  application_stage: z
    .enum([
      'applied',
      'mock_round',
      'shortlisted',
      'test_scheduled',
      'interview',
      'hr_round',
      'offer_released',
      'rejected',
    ])
    .optional()
    .nullable(),
});

export const updateEventSchema = createEventSchema.partial();

export const queryEventsSchema = paginationSchema.merge(sortSchema).extend({
  status: z.enum(['draft', 'published', 'ongoing', 'completed', 'cancelled']).optional(),
  type: z.string().min(1).max(150).optional(),
  posting_type_master_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
  // FILTER COUNTER EXPORT — pipeline-target scope (institute/course/branch arrays) + event-date range
  institute: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export const createPanelSchema = z.object({
  panel_name: z.string().min(1).max(100),
  room: z.string().min(1).max(100),
  start_time: z.string().max(10).optional().nullable(),
  end_time: z.string().max(10).optional().nullable(),
  recruiters: z.array(z.string()).default([]),
});

export const assignStudentsSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1).max(200),
  panel_id: z.string().uuid().optional().nullable(),
});

export const markAttendanceSchema = z.object({
  student_id: z.string().uuid(),
  attendance: z.enum(['present', 'absent', 'late']),
});

export const updateEventStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'ongoing', 'completed', 'cancelled']),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type QueryEventsInput = z.infer<typeof queryEventsSchema>;
export type CreatePanelInput = z.infer<typeof createPanelSchema>;
export type AssignStudentsInput = z.infer<typeof assignStudentsSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type UpdateEventStatusInput = z.infer<typeof updateEventStatusSchema>;
