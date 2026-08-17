import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../shared/schemas/common';

const stringArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value == null) return undefined;
    const arr = Array.isArray(value) ? value : value.split(',');
    const cleaned = arr.map((v) => v.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
  });

const intArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value == null) return undefined;
    const arr = Array.isArray(value) ? value : value.split(',');
    const cleaned = arr
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));
    return cleaned.length > 0 ? cleaned : undefined;
  });

export const queryFacultyStudentsSchema = paginationSchema.merge(sortSchema).extend({
  batch: z.string().max(20).optional(),
  verification_status: z.enum(['pending', 'verified', 'rejected']).optional(),
  eligibility_status: z.enum(['eligible', 'conditional', 'not_eligible']).optional(),
  search: z.string().max(200).optional(),
  min_cgpa: z.coerce.number().min(0).max(10).optional(),
  max_cgpa: z.coerce.number().min(0).max(10).optional(),
  institute: stringArray,
  branch: stringArray,
  semester: intArray,
  // FILTER COUNTER EXPORT (Faculty Student Directory) — Course + created_at date range
  course: z.string().max(200).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type QueryFacultyStudentsInput = z.infer<typeof queryFacultyStudentsSchema>;

export const queryProgramStudentsSchema = z.object({
  posting_type: z.string().min(1).max(200),
  search: z.string().max(200).optional(),
});

export type QueryProgramStudentsInput = z.infer<typeof queryProgramStudentsSchema>;
