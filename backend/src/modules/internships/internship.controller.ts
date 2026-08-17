import { Request, Response, NextFunction } from 'express';
import * as service from './internship.service';

export async function getInternships(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getInternships(
      req.user!.tenant_id,
      req.validated!.query as any,
      req.user!,
      req.scope
    );
    res.json(result);
  } catch (err) { next(err); }
}

export async function getMyInternships(req: Request, res: Response, next: NextFunction) {
  try {
    const internships = await service.getMyInternships(req.user!.id);
    res.json({ internships });
  } catch (err) { next(err); }
}

export async function getInternshipById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.internshipId) ? req.params.internshipId[0] : req.params.internshipId;
    const internship = await service.getInternshipById(id!, req.user!, req.scope);
    res.json(internship);
  } catch (err) { next(err); }
}

export async function createInternship(req: Request, res: Response, next: NextFunction) {
  try {
    const internship = await service.createInternship(req.user!.id, req.user!.tenant_id, req.validated!.body as any);
    res.status(201).json(internship);
  } catch (err) { next(err); }
}

export async function uploadInternshipDocument(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Offer letter / internship certificate is required' } });
      return;
    }

    res.status(201).json({
      certificate_url: `/uploads/internship-documents/${req.file.filename}`,
      document_name: req.file.originalname,
      document_mime_type: req.file.mimetype,
      document_size: req.file.size,
    });
  } catch (err) { next(err); }
}

export async function updateInternship(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.internshipId) ? req.params.internshipId[0] : req.params.internshipId;
    const internship = await service.updateInternship(id!, req.validated!.body as any);
    res.json(internship);
  } catch (err) { next(err); }
}

export async function createIssue(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.internshipId) ? req.params.internshipId[0] : req.params.internshipId;
    const issue = await service.createIssue(id!, req.validated!.body as any, req.user!, req.scope);
    res.status(201).json(issue);
  } catch (err) { next(err); }
}

export async function resolveIssue(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.issueId) ? req.params.issueId[0] : req.params.issueId;
    const issue = await service.resolveIssue(id!);
    res.json(issue);
  } catch (err) { next(err); }
}
