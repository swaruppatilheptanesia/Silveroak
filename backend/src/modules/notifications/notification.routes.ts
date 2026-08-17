import { Router } from 'express';
import * as ctrl from './notification.controller';
import { validate } from '../../middleware/validate';
import { queryNotificationsSchema, updatePreferencesSchema } from './notification.schema';

const router = Router();

router.get('/me', validate(queryNotificationsSchema, 'query'), ctrl.getMyNotifications);
router.get('/preferences/me', ctrl.getMyPreferences);
router.put('/preferences/me', validate(updatePreferencesSchema), ctrl.updateMyPreferences);
router.put('/read-all', ctrl.markAllAsRead);
router.put('/:notificationId/read', ctrl.markAsRead);
router.delete('/:notificationId', ctrl.dismissNotification);

export default router;
