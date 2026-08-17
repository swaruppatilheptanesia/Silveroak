import { Request, Response, NextFunction } from 'express';
import * as service from './noc.service';

export async function getMyNocs(req: Request, res: Response, next: NextFunction) {
  try {
    const nocs = await service.getMyNocs(req.user!.id);
    res.json({ nocs });
  } catch (err) { next(err); }
}

export async function getNocs(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getNocs(req.user!.tenant_id, req.validated!.query as any, req.user!, req.scope);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getNocById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.nocId) ? req.params.nocId[0] : req.params.nocId;
    const noc = await service.getNocById(id!, req.user!, req.scope);
    res.json(noc);
  } catch (err) { next(err); }
}

export async function createNoc(req: Request, res: Response, next: NextFunction) {
  try {
    const noc = await service.createNoc(req.user!.id, req.user!.tenant_id, req.validated!.body as any);
    res.status(201).json(noc);
  } catch (err) { next(err); }
}

export async function uploadOfferLetter(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Offer letter file is required' } });
      return;
    }

    res.status(201).json({
      offer_letter_url: `/uploads/noc-offer-letters/${req.file.filename}`,
      document_name: req.file.originalname,
      document_mime_type: req.file.mimetype,
      document_size: req.file.size,
    });
  } catch (err) { next(err); }
}

export async function uploadSupportingDocument(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Supporting document file is required' } });
      return;
    }

    res.status(201).json({
      supporting_document_url: `/uploads/noc-supporting-documents/${req.file.filename}`,
      supporting_document_name: req.file.originalname,
      document_mime_type: req.file.mimetype,
      document_size: req.file.size,
    });
  } catch (err) { next(err); }
}

export async function getNocFieldSuggestions(req: Request, res: Response, next: NextFunction) {
  try {
    const suggestions = await service.getNocFieldSuggestions(req.user!.tenant_id);
    res.json(suggestions);
  } catch (err) { next(err); }
}

export async function facultyApprove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.nocId) ? req.params.nocId[0] : req.params.nocId;
    const noc = await service.facultyApprove(id!, (req.validated!.body as any) || {}, req.user!, req.scope);
    res.json(noc);
  } catch (err) { next(err); }
}

export async function tpoApprove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.nocId) ? req.params.nocId[0] : req.params.nocId;
    const noc = await service.tpoApprove(id!, req.validated!.body as any || {}, req.user!.id);
    res.json(noc);
  } catch (err) { next(err); }
}

export async function rejectNoc(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.nocId) ? req.params.nocId[0] : req.params.nocId;
    const noc = await service.rejectNoc(id!, req.validated!.body as any, req.user!, req.scope);
    res.json(noc);
  } catch (err) { next(err); }
}

export async function issueNoc(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.nocId) ? req.params.nocId[0] : req.params.nocId;
    const noc = await service.issueNoc(id!, req.user!.id);
    res.json(noc);
  } catch (err) { next(err); }
}

export async function submitCompletionCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Completion certificate file is required' } });
      return;
    }
    const id = Array.isArray(req.params.nocId) ? req.params.nocId[0] : req.params.nocId;
    const noc = await service.submitCompletionCertificate(req.user!.id, id!, {
      url: `/uploads/noc-completion-certificates/${req.file.filename}`,
      name: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
    res.status(201).json(noc);
  } catch (err) { next(err); }
}

export async function approveCompletionCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.nocId) ? req.params.nocId[0] : req.params.nocId;
    const noc = await service.approveCompletionCertificate(id!, req.user!.id, req.user!.name);
    res.json(noc);
  } catch (err) { next(err); }
}

export async function rejectCompletionCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.nocId) ? req.params.nocId[0] : req.params.nocId;
    const { remarks } = req.validated!.body as { remarks: string };
    const noc = await service.rejectCompletionCertificate(id!, req.user!.id, req.user!.name, remarks);
    res.json(noc);
  } catch (err) { next(err); }
}
