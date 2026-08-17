import { Request, Response, NextFunction } from 'express';
import * as service from './employer.service';

// Companies
export async function getCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getCompanies(req.user!.tenant_id, req.validated!.query as any);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getCompanyById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId;
    const company = await service.getCompanyById(id!);
    res.json(company);
  } catch (err) { next(err); }
}

export async function createCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const company = await service.createCompany(req.user!.tenant_id, req.validated!.body as any, req.user!.id);
    res.status(201).json(company);
  } catch (err) { next(err); }
}

export async function importCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.importCompanies(req.user!.tenant_id, req.user!, req.file));
  } catch (err) { next(err); }
}

export async function updateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId;
    const company = await service.updateCompany(id!, req.validated!.body as any, req.user!.id);
    res.json(company);
  } catch (err) { next(err); }
}

export async function classifyCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId;
    const company = await service.classifyCompany(id!, req.validated!.body as any, req.user!.id);
    res.json(company);
  } catch (err) { next(err); }
}

// Recruiters
export async function getRecruiters(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getRecruiters(req.user!.tenant_id, req.validated!.query as any);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getRecruitersByCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId;
    const recruiters = await service.getRecruitersByCompany(id!);
    res.json({ recruiters });
  } catch (err) { next(err); }
}

export async function createRecruiter(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId;
    const result = await service.createRecruiter(id!, req.user!.tenant_id, req.validated!.body as any, req.user!.id);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function updateRecruiter(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.recruiterId) ? req.params.recruiterId[0] : req.params.recruiterId;
    const recruiter = await service.updateRecruiter(id!, req.validated!.body as any);
    res.json(recruiter);
  } catch (err) { next(err); }
}

export async function verifyRecruiter(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.recruiterId) ? req.params.recruiterId[0] : req.params.recruiterId;
    const recruiter = await service.verifyRecruiter(id!, req.validated!.body as any, req.user!.id);
    res.json(recruiter);
  } catch (err) { next(err); }
}

export async function deleteRecruiter(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.recruiterId) ? req.params.recruiterId[0] : req.params.recruiterId;
    await service.deleteRecruiter(id!, req.user!.id);
    res.json({ message: 'Recruiter deleted' });
  } catch (err) { next(err); }
}

// Engagements
export async function getEngagements(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId;
    const engagements = await service.getEngagementsByCompany(id!);
    res.json({ engagements });
  } catch (err) { next(err); }
}

export async function createEngagement(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId;
    const engagement = await service.createEngagement(id!, req.user!.tenant_id, req.validated!.body as any, req.user!.id);
    res.status(201).json(engagement);
  } catch (err) { next(err); }
}
