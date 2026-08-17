import { Request, Response, NextFunction } from 'express';
import * as service from './notification.service';

function getParam(req: Request, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function getMyNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getMyNotifications(req.user!.id, req.user!.tenant_id, req.validated!.query as any));
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const notificationId = getParam(req, 'notificationId');
    res.json(await service.markNotificationAsRead(notificationId!, req.user!.id, req.user!.tenant_id));
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.markAllNotificationsAsRead(req.user!.id, req.user!.tenant_id));
  } catch (err) {
    next(err);
  }
}

export async function dismissNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const notificationId = getParam(req, 'notificationId');
    res.json(await service.dismissNotification(notificationId!, req.user!.id, req.user!.tenant_id));
  } catch (err) {
    next(err);
  }
}

export async function getMyPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getMyPreferences(req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function updateMyPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const { preferences } = req.validated!.body as { preferences: { category: any; enabled: boolean }[] };
    res.json(await service.upsertMyPreferences(req.user!.id, preferences));
  } catch (err) {
    next(err);
  }
}
