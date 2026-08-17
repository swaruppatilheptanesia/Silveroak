import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../shared/schemas/common';

export const createEventSchema = z.object({
  company_id: z.string().uuid(),
  posting_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(300),
  type: z.enum(['campus_drive', 'ppt', 'test_assessment', 'internship_drive', 'workshop']),
  date: z.coerce.date(),
  start_time: z.string().max(10),
  end_time: z.string().max(10),
  venue: z.string().min(1).max(300),
  reporting_time: z.string().max(10).optional().nullable(),
  dress_code: z.string().max(200).optional().nullable(),
  instructions: z.string().max(5000).optional().nullable(),
  documents_required: z.array(z.string()).default([]),
  faculty_coordinators: z.array(z.string()).default([]),
});

export const updateEventSchema = createEventSchema.partial();

export const queryEventsSchema = paginationSchema.merge(sortSchema).extend({
  status: z.enum(['draft', 'published', 'ongoing', 'completed', 'cancelled']).optional(),
  type: z.enum(['campus_drive', 'ppt', 'test_assessment', 'internship_drive', 'workshop']).optional(),
  posting_type: z.enum(['job', 'internship', 'stipend_internship']).optional(),
  company_id: z.string().uuid().optional(),
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
