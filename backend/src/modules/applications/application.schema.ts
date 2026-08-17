import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../shared/schemas/common';

export const applySchema = z.object({
  posting_id: z.string().uuid(),
  resume_id: z.string().uuid().optional(),
});

export const moveStageSchema = z.object({
  stage: z.enum([
    'applied', 'mock_round', 'shortlisted', 'test_scheduled',
    'interview', 'hr_round', 'offer_released', 'rejected',
  ]),
  remarks: z.string().max(1000).optional().nullable(),
});

export const bulkMoveStageSchema = z.object({
  application_ids: z.array(z.string().uuid()).min(1).max(100),
  stage: z.enum([
    'applied', 'mock_round', 'shortlisted', 'test_scheduled',
    'interview', 'hr_round', 'offer_released', 'rejected',
  ]),
  remarks: z.string().max(1000).optional().nullable(),
});

export const mockRoundResultSchema = z.object({
  result: z.enum(['passed', 'failed']),
});

export const queryApplicationsSchema = paginationSchema.merge(sortSchema).extend({
  posting_id: z.string().uuid().optional(),
  posting_type_master_id: z.string().uuid().optional(),
  stage: z.enum([
    'applied', 'mock_round', 'shortlisted', 'test_scheduled',
    'interview', 'hr_round', 'offer_released', 'rejected',
  ]).optional(),
  // FILTER COUNTER EXPORT — student-scope + date-range filters
  institute: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  semester: z.string().max(50).optional(),
  academic_year: z.string().max(50).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type ApplyInput = z.infer<typeof applySchema>;
export type MoveStageInput = z.infer<typeof moveStageSchema>;
export type BulkMoveStageInput = z.infer<typeof bulkMoveStageSchema>;
export type MockRoundResultInput = z.infer<typeof mockRoundResultSchema>;
export type QueryApplicationsInput = z.infer<typeof queryApplicationsSchema>;
