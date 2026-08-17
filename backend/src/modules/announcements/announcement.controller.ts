import { Request, Response, NextFunction } from 'express';
import * as service from './announcement.service';

export async function getAnnouncements(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getAnnouncements(req.user!.tenant_id, req.validated!.query as any, req.user!, req.scope));
  }
  catch (err) { next(err); }
}

export async function getAnnouncementById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.announcementId) ? req.params.announcementId[0] : req.params.announcementId;
    res.json(await service.getAnnouncementById(id!, req.user!, req.scope));
  } catch (err) { next(err); }
}

export async function uploadAnnouncementAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Attachment file is required' } });
      return;
    }

    res.status(201).json({
      attachment_url: `/uploads/announcement-attachments/${req.file.filename}`,
      attachment_name: req.file.originalname,
      attachment_mime_type: req.file.mimetype,
      attachment_size: req.file.size,
    });
  } catch (err) { next(err); }
}

export async function getAudienceSemesterOptions(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getAudienceSemesterOptions(req.user!.tenant_id, req.validated!.query as any));
  } catch (err) { next(err); }
}

export async function createAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const announcement = await service.createAnnouncement(req.user!.tenant_id, req.validated!.body as any, req.user!.id);
    res.status(201).json(announcement);
  } catch (err) { next(err); }
}

export async function updateAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.announcementId) ? req.params.announcementId[0] : req.params.announcementId;
    res.json(await service.updateAnnouncement(id!, req.validated!.body as any, req.user!.tenant_id));
  } catch (err) { next(err); }
}

export async function publishAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.announcementId) ? req.params.announcementId[0] : req.params.announcementId;
    res.json(await service.publishAnnouncement(id!, req.user!.tenant_id));
  } catch (err) { next(err); }
}

export async function archiveAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.announcementId) ? req.params.announcementId[0] : req.params.announcementId;
    res.json(await service.archiveAnnouncement(id!, req.user!.tenant_id));
  } catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.announcementId) ? req.params.announcementId[0] : req.params.announcementId;
    res.json(await service.markRead(id!, req.user!, req.scope));
  } catch (err) { next(err); }
}

export async function giveConsent(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.announcementId) ? req.params.announcementId[0] : req.params.announcementId;
    res.json(await service.giveConsent(id!, req.user!, req.scope));
  } catch (err) { next(err); }
}
