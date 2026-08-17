import { Request, Response, NextFunction } from 'express';
import * as service from './recruiter-portal.service';

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getRecruiterDashboard(req.user!.id)); }
  catch (err) { next(err); }
}

export async function getCompany(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getRecruiterCompany(req.user!.id)); }
  catch (err) { next(err); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updateRecruiterProfile(req.user!.id, req.validated!.body as any)); }
  catch (err) { next(err); }
}

export async function getPostings(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId;
    res.json({ postings: await service.getRecruiterPostings(req.user!.id, companyId!) });
  } catch (err) { next(err); }
}

export async function getApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const postingId = Array.isArray(req.params.postingId) ? req.params.postingId[0] : req.params.postingId;
    res.json({ applications: await service.getRecruiterApplications(req.user!.id, postingId!) });
  } catch (err) { next(err); }
}
