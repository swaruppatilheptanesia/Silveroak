import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../shared/schemas/common';

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['placement', 'internship', 'campus_drive', 'general']),
  sections: z.any().default([]),
});

export const updateTemplateSchema = createTemplateSchema.partial().extend({
  status: z.enum(['draft', 'active', 'archived']).optional(),
  version: z.string().max(20).optional(),
});

export const generateCircularSchema = z.object({
  template_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid(),
  company_name: z.string().min(1).max(300),
  role_name: z.string().min(1).max(200),
  type: z.string().max(30),
  field_values: z.record(z.any()).default({}),
});

export const queryTemplatesSchema = paginationSchema.merge(sortSchema).extend({
  status: z.enum(['draft', 'active', 'archived']).optional(),
  type: z.enum(['placement', 'internship', 'campus_drive', 'general']).optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type GenerateCircularInput = z.infer<typeof generateCircularSchema>;
export type QueryTemplatesInput = z.infer<typeof queryTemplatesSchema>;
