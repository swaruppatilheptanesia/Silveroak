import { NextFunction, Request, Response } from 'express';
import * as service from './masters.service';

function getParam(req: Request, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function getMasters(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getMasters(req.user!.tenant_id, req.validated!.query as any, req.user!.id, req.user!.role));
  } catch (err) {
    next(err);
  }
}

export async function getAdminMasters(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getAdminMasters(req.user!.tenant_id, req.validated!.query as any));
  } catch (err) {
    next(err);
  }
}

export async function createMaster(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createMaster(req.user!.tenant_id, req.user!, req.validated!.body as any));
  } catch (err) {
    next(err);
  }
}

export async function updateMaster(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'masterId');
    res.json(await service.updateMaster(id!, req.user!.tenant_id, req.user!, req.validated!.body as any));
  } catch (err) {
    next(err);
  }
}

export async function deleteMaster(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'masterId');
    res.json(await service.deleteMaster(id!, req.user!.tenant_id, req.user!));
  } catch (err) {
    next(err);
  }
}
