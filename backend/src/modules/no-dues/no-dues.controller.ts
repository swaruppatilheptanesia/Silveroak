import { Request, Response, NextFunction } from 'express';
import * as service from './no-dues.service';

export async function getMyNoDues(req: Request, res: Response, next: NextFunction) {
  try { res.json({ requests: await service.getMyNoDues(req.user!.id) }); }
  catch (err) { next(err); }
}

export async function getMyNoDuesEligibility(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getMyNoDuesEligibility(req.user!.id)); }
  catch (err) { next(err); }
}

export async function getNoDuesRequests(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getNoDuesRequests(req.user!.tenant_id, req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function getNoDuesById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await service.getNoDuesById(id!, req.user!.tenant_id));
  } catch (err) { next(err); }
}

export async function createNoDues(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createNoDues(req.user!.id, req.user!.tenant_id, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function uploadNoDuesProof(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Proof attachment file is required' } });
      return;
    }

    res.status(201).json({
      proof_url: `/uploads/no-dues-documents/${req.file.filename}`,
      proof_name: req.file.originalname,
      proof_mime_type: req.file.mimetype,
      proof_size: req.file.size,
    });
  } catch (err) { next(err); }
}

export async function resubmitNoDues(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await service.resubmitNoDues(id!, req.user!.id, req.user!.tenant_id, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function updateNoDues(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await service.updateNoDues(id!, req.user!.tenant_id, req.validated!.body as any, req.user!.id));
  } catch (err) { next(err); }
}

export async function reviewNoDues(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await service.reviewNoDues(id!, req.user!.tenant_id, req.validated!.body as any, req.user!.id));
  } catch (err) { next(err); }
}

export async function importNoDuesEligibility(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.importNoDuesEligibility(req.user!.tenant_id, req.user!, req.file));
  } catch (err) { next(err); }
}

export async function enableNoDuesEligibility(req: Request, res: Response, next: NextFunction) {
  try {
    const enrollmentNumber = (req.validated!.body as { enrollment_number: string }).enrollment_number;
    res.json(await service.enableNoDuesEligibility(req.user!.tenant_id, req.user!, enrollmentNumber));
  } catch (err) { next(err); }
}

export async function issueNoDues(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await service.issueNoDues(id!, req.user!.tenant_id, req.user!.id));
  } catch (err) { next(err); }
}
