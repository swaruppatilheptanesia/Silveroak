import { Request, Response, NextFunction } from 'express';
import * as service from './policy.service';

export async function getPolicies(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getPolicies(req.user!.tenant_id, req.validated!.query as any, req.user!)); }
  catch (err) { next(err); }
}

export async function getPolicyById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await service.getPolicyById(id!, req.user!.tenant_id, req.user!));
  } catch (err) { next(err); }
}

export async function getInstituteOptions(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getInstituteOptions()); }
  catch (err) { next(err); }
}

export async function getBranchOptions(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getBranchOptions(req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function getCourseOptions(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getCourseOptions(req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function uploadPolicyDocument(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Policy document file is required' } });
      return;
    }

    res.status(201).json({
      document_url: `/uploads/policy-documents/${req.file.filename}`,
      document_name: req.file.originalname,
      document_mime_type: req.file.mimetype,
      document_size: req.file.size,
    });
  } catch (err) { next(err); }
}

export async function createPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createPolicy(req.user!.tenant_id, req.validated!.body as any, req.user!.name));
  } catch (err) { next(err); }
}

export async function updatePolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await service.updatePolicy(id!, req.user!.tenant_id, req.validated!.body as any, req.user!.name));
  } catch (err) { next(err); }
}

export async function deletePolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await service.deletePolicy(id!, req.user!.tenant_id);
    res.json({ message: 'Policy deleted' });
  } catch (err) { next(err); }
}
