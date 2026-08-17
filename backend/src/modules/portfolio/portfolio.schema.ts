import { z } from 'zod';

export const createPortfolioProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  role: z.string().max(200).optional().nullable(),
  technologies: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  github_url: z.string().url().optional().nullable(),
  live_url: z.string().url().optional().nullable(),
  start_date: z.coerce.date().optional().nullable(),
  end_date: z.coerce.date().optional().nullable(),
  is_ongoing: z.boolean().default(false),
  display_order: z.number().int().min(0).default(0),
});

export const updatePortfolioProjectSchema = createPortfolioProjectSchema.partial();

export const createShowcaseSchema = z.object({
  company_name: z.string().min(1).max(300),
  role: z.string().min(1).max(200),
  duration_months: z.number().int().min(0).optional().nullable(),
  start_date: z.coerce.date().optional().nullable(),
  end_date: z.coerce.date().optional().nullable(),
  key_outcomes: z.array(z.string()).default([]),
  proof_url: z.string().url().optional().nullable(),
  linked_internship_id: z.string().uuid().optional().nullable(),
});

export const updatePortfolioStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
});

export type CreatePortfolioProjectInput = z.infer<typeof createPortfolioProjectSchema>;
export type UpdatePortfolioProjectInput = z.infer<typeof updatePortfolioProjectSchema>;
export type CreateShowcaseInput = z.infer<typeof createShowcaseSchema>;
export type UpdatePortfolioStatusInput = z.infer<typeof updatePortfolioStatusSchema>;
