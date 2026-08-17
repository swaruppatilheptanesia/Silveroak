import { Request, Response, NextFunction } from 'express';
import * as service from './admin.service';

function getParam(req: Request, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getUsers(req.user!.tenant_id, req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'userId');
    res.json(await service.getUserById(id!, req.user!.tenant_id));
  } catch (err) { next(err); }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createUser(req.user!.tenant_id, req.validated!.body as any, req.user!.id)); }
  catch (err) { next(err); }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'userId');
    res.json(await service.updateUser(id!, req.user!.tenant_id, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function linkRecruiterToCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'userId');
    res.json(await service.linkRecruiterToCompany(id!, req.user!.tenant_id, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function regenerateUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'userId');
    res.json(await service.regenerateUserPassword(id!, req.user!.tenant_id, req.user!.id));
  } catch (err) { next(err); }
}

export async function getCrmDepartments(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getCrmDepartments(req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function getCrmEmployees(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getCrmEmployees(req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function getCrmEmployeeDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const empId = getParam(req, 'empId');
    res.json(await service.getCrmEmployeeDetail({ empId: Number(empId) }));
  } catch (err) { next(err); }
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getAuditLogs(req.user!.tenant_id, req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function getPermissions(req: Request, res: Response, next: NextFunction) {
  try { res.json({ permissions: await service.getPermissions(req.user!.tenant_id) }); }
  catch (err) { next(err); }
}

export async function updatePermission(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'permissionId');
    res.json(await service.updatePermission(id!, req.user!.tenant_id, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function getStudents(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getStudents(req.user!.tenant_id, req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function getStudentById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'studentId');
    res.json(await service.getStudentById(id!, req.user!.tenant_id));
  } catch (err) { next(err); }
}

export async function verifyStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'studentId');
    res.json(await service.verifyStudent(id!, req.user!.tenant_id, req.user!, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function updateStudentProfileBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'studentId');
    res.json(await service.updateStudentProfileBlock(id!, req.user!.tenant_id, req.user!, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function bulkVerifyStudents(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.bulkVerifyStudents(req.user!.tenant_id, req.user!, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function reopenStudentPlacement(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'studentId');
    res.json(await service.reopenStudentPlacement(id!, req.user!.tenant_id, req.user!, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function getEligibilityRules(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getEligibilityRules(req.user!.tenant_id)); }
  catch (err) { next(err); }
}

export async function createEligibilityRule(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createEligibilityRule(req.user!.tenant_id, req.user!, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function updateEligibilityRule(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'ruleId');
    res.json(await service.updateEligibilityRule(id!, req.user!.tenant_id, req.user!, req.validated!.body as any));
  } catch (err) { next(err); }
}

export async function deleteEligibilityRule(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'ruleId');
    res.json(await service.deleteEligibilityRule(id!, req.user!.tenant_id, req.user!));
  } catch (err) { next(err); }
}

export async function getPortfolios(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getPortfolios(req.user!.tenant_id, req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function getSelectionDatabase(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getSelectionDatabase(req.user!.tenant_id, req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function getInterestSummary(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getInterestSummary(req.user!.tenant_id)); }
  catch (err) { next(err); }
}

export async function getInterestRegistrations(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getInterestRegistrations(req.user!.tenant_id, req.validated!.query as any)); }
  catch (err) { next(err); }
}

export async function getRecentInterestRegistrations(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getRecentInterestRegistrations(req.user!.tenant_id)); }
  catch (err) { next(err); }
}

export async function approveInterestRegistration(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.approveInterestRegistration(getParam(req, 'id'), req.user!.tenant_id, req.user!.id, req.user!.name)); }
  catch (err) { next(err); }
}

export async function withdrawInterestRegistration(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.withdrawInterestRegistration(getParam(req, 'id'), req.user!.tenant_id, req.user!.id, req.user!.name, req.validated!.body as any)); }
  catch (err) { next(err); }
}
