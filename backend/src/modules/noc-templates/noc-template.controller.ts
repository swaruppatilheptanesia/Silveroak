import { NextFunction, Request, Response } from 'express';
import * as service from './noc-template.service';
import type { UpsertNocTemplateInput } from './noc-template.schema';

function getParam(req: Request, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function getTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getNocTemplates(req.user!.tenant_id));
  } catch (err) {
    next(err);
  }
}

export async function getTemplateByPostingTypeId(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'postingTypeMasterId');
    const template = await service.getNocTemplateByPostingTypeId(req.user!.tenant_id, id!);
    if (!template) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'NOC Template',
        },
      });
      return;
    }

    res.json(template);
  } catch (err) {
    next(err);
  }
}

export async function upsertTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'postingTypeMasterId');
    const template = await service.upsertNocTemplate(req.user!.tenant_id, req.user!, id!, req.validated!.body as UpsertNocTemplateInput);
    res.status(200).json(template);
  } catch (err) {
    next(err);
  }
}
