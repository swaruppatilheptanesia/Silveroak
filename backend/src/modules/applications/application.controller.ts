import { Request, Response, NextFunction } from 'express';
import * as service from './application.service';

export async function apply(req: Request, res: Response, next: NextFunction) {
  try {
    const application = await service.apply(req.user!.id, req.user!.tenant_id, req.validated!.body as any);
    res.status(201).json(application);
  } catch (err) { next(err); }
}

export async function getMyApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const applications = await service.getMyApplications(req.user!.id);
    res.json({ applications });
  } catch (err) { next(err); }
}

export async function getApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getApplicationsByPosting(req.user!.tenant_id, req.validated!.query as any);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getApplicationById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.applicationId) ? req.params.applicationId[0] : req.params.applicationId;
    const application = await service.getApplicationById(id!);
    res.json(application);
  } catch (err) { next(err); }
}

export async function moveStage(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.applicationId) ? req.params.applicationId[0] : req.params.applicationId;
    const application = await service.moveStage(id!, req.validated!.body as any, req.user!.id);
    res.json(application);
  } catch (err) { next(err); }
}

export async function bulkMoveStage(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await service.bulkMoveStage(req.validated!.body as any, req.user!.id);
    res.json({ results });
  } catch (err) { next(err); }
}

export async function setMockRoundResult(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.applicationId) ? req.params.applicationId[0] : req.params.applicationId;
    const application = await service.setMockRoundResult(id!, req.validated!.body as any, req.user!.id);
    res.json(application);
  } catch (err) { next(err); }
}

export async function withdrawApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.applicationId) ? req.params.applicationId[0] : req.params.applicationId;
    const result = await service.withdrawApplication(req.user!.id, id!);
    res.json(result);
  } catch (err) { next(err); }
}
