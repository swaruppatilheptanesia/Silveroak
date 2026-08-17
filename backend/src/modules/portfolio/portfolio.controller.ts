import { Request, Response, NextFunction } from 'express';
import * as service from './portfolio.service';

export async function getMyPortfolio(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getMyPortfolio(req.user!.id)); }
  catch (err) { next(err); }
}

export async function getStudentPortfolio(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;
    res.json(await service.getStudentPortfolio(id!, req.user!));
  } catch (err) { next(err); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updatePortfolioStatus(req.user!.id, req.validated!.body as any)); }
  catch (err) { next(err); }
}

export async function addProject(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.addProject(req.user!.id, req.validated!.body as any)); }
  catch (err) { next(err); }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    res.json(await service.updateProject(req.user!.id, id!, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    await service.deleteProject(req.user!.id, id!);
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
}

export async function addShowcase(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.addShowcase(req.user!.id, req.validated!.body as any)); }
  catch (err) { next(err); }
}

export async function deleteShowcase(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.showcaseId) ? req.params.showcaseId[0] : req.params.showcaseId;
    await service.deleteShowcase(req.user!.id, id!);
    res.json({ message: 'Showcase deleted' });
  } catch (err) { next(err); }
}

export async function uploadShowcaseProof(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Internship completion certificate is required' } });
      return;
    }

    res.status(201).json({
      proof_url: `/uploads/portfolio-showcase-proofs/${req.file.filename}`,
    });
  } catch (err) { next(err); }
}
