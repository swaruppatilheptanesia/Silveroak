import { Request, Response, NextFunction } from 'express';
import * as service from './faculty.service';

function getParam(req: Request, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getDashboard(req.user!, req.scope));
  } catch (err) {
    next(err);
  }
}

export async function getStudents(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getStudents(req.user!.tenant_id, req.validated!.query as any, req.user!, req.scope));
  } catch (err) {
    next(err);
  }
}

export async function getStudentFilterOptions(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getStudentFilterOptions(req.user!.tenant_id, req.user!, req.scope));
  } catch (err) {
    next(err);
  }
}

export async function getStudentById(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = getParam(req, 'studentId');
    res.json(await service.getStudentById(studentId!, req.user!, req.scope));
  } catch (err) {
    next(err);
  }
}

export async function getPrograms(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getAssignedPrograms(req.user!));
  } catch (err) {
    next(err);
  }
}

export async function getProgramStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.validated!.query as { posting_type: string; search?: string };
    res.json(await service.getProgramStudents(req.user!, query.posting_type, { search: query.search }));
  } catch (err) {
    next(err);
  }
}
