import { Request, Response, NextFunction } from 'express';
import * as service from './circular.service';

export async function getTemplates(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getTemplates(req.user!.tenant_id, req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function getTemplateById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.templateId) ? req.params.templateId[0] : req.params.templateId;
    res.json(await service.getTemplateById(id!, req.user!.tenant_id));
  } catch (err) { next(err); }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createTemplate(req.user!.tenant_id, req.validated!.body as any, req.user!.id));
  } catch (err) { next(err); }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.templateId) ? req.params.templateId[0] : req.params.templateId;
    res.json(await service.updateTemplate(id!, req.validated!.body as any, req.user!.tenant_id));
  } catch (err) { next(err); }
}

export async function generateCircular(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.generateCircular(req.user!.tenant_id, req.validated!.body as any, req.user!.id));
  } catch (err) { next(err); }
}

export async function getGeneratedCirculars(req: Request, res: Response, next: NextFunction) {
  try { res.json({ circulars: await service.getGeneratedCirculars(req.user!.tenant_id) }); }
  catch (err) { next(err); }
}

export async function getMyGeneratedCirculars(req: Request, res: Response, next: NextFunction) {
  try { res.json({ circulars: await service.getGeneratedCirculars(req.user!.tenant_id) }); }
  catch (err) { next(err); }
}
