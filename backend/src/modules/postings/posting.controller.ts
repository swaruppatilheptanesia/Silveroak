import { Request, Response, NextFunction } from 'express';
import * as service from './posting.service';

export async function getPostings(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getPostings(
      req.user!.tenant_id,
      req.validated!.query as any,
      req.user!.role,
      req.user!.id
    );
    res.json(result);
  } catch (err) { next(err); }
}

export async function getPostingById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.postingId) ? req.params.postingId[0] : req.params.postingId;
    const posting = await service.getPostingById(id!, req.user!.tenant_id, req.user!.role, req.user!.id);
    res.json(posting);
  } catch (err) { next(err); }
}

export async function createPosting(req: Request, res: Response, next: NextFunction) {
  try {
    const posting = await service.createPosting(req.user!.tenant_id, req.validated!.body as any, req.user!.id);
    res.status(201).json(posting);
  } catch (err) { next(err); }
}

export async function updatePosting(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.postingId) ? req.params.postingId[0] : req.params.postingId;
    const posting = await service.updatePosting(id!, req.validated!.body as any, req.user!.id);
    res.json(posting);
  } catch (err) { next(err); }
}

export async function publishPosting(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.postingId) ? req.params.postingId[0] : req.params.postingId;
    const posting = await service.publishPosting(id!, req.validated!.body as any || {}, req.user!.id);
    res.json(posting);
  } catch (err) { next(err); }
}

export async function republishPosting(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.postingId) ? req.params.postingId[0] : req.params.postingId;
    const posting = await service.republishPosting(id!, req.validated!.body as any, req.user!.id);
    res.json(posting);
  } catch (err) { next(err); }
}

export async function closePosting(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.postingId) ? req.params.postingId[0] : req.params.postingId;
    const posting = await service.closePosting(id!, req.user!.id);
    res.json(posting);
  } catch (err) { next(err); }
}

export async function uploadJobDescription(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Job description PDF is required' } });
      return;
    }

    res.status(201).json({
      job_description_pdf_url: `/uploads/posting-job-descriptions/${req.file.filename}`,
    });
  } catch (err) { next(err); }
}
