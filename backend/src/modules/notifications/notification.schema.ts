import { z } from 'zod';
import { paginationSchema } from '../../shared/schemas/common';

export const queryNotificationsSchema = paginationSchema;

export type QueryNotificationsInput = z.infer<typeof queryNotificationsSchema>;

export const NOTIFICATION_CATEGORIES = [
  'profile',
  'policy',
  'readiness',
  'placement',
  'offer',
  'application',
  'interest',
  'noc',
  'event',
  'announcement',
  'circular',
  'no_dues',
  'recruiter',
] as const;

export const notificationCategoryEnum = z.enum(NOTIFICATION_CATEGORIES);

export const updatePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        category: notificationCategoryEnum,
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(NOTIFICATION_CATEGORIES.length),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
