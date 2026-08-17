import { Request, Response, NextFunction } from 'express';
import * as service from './event.service';

export async function getEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getEvents(
      req.user!.tenant_id,
      req.validated!.query as any,
      req.user!,
      req.scope
    );
    res.json(result);
  } catch (err) { next(err); }
}

export async function getMyEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getEvents(
      req.user!.tenant_id,
      { page: 1, limit: 100, sort_by: 'date', sort_order: 'asc' } as any,
      req.user!,
      req.scope,
    );
    res.json(result);
  } catch (err) { next(err); }
}

export async function getMyEventById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
    const event = await service.getEventById(id!, req.user!, req.scope);
    res.json(event);
  } catch (err) { next(err); }
}

export async function getEventById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
    const event = await service.getEventById(id!, req.user!, req.scope);
    res.json(event);
  } catch (err) { next(err); }
}

export async function createEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const event = await service.createEvent(req.user!.tenant_id, req.validated!.body as any, req.user!.id);
    res.status(201).json(event);
  } catch (err) { next(err); }
}

export async function updateEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
    const event = await service.updateEvent(id!, req.validated!.body as any);
    res.json(event);
  } catch (err) { next(err); }
}

export async function updateEventStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
    const event = await service.updateEventStatus(id!, req.validated!.body as any, req.user!.id);
    res.json(event);
  } catch (err) { next(err); }
}

export async function createPanel(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
    const panel = await service.createPanel(id!, req.validated!.body as any);
    res.status(201).json(panel);
  } catch (err) { next(err); }
}

export async function assignStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
    const results = await service.assignStudents(id!, req.validated!.body as any);
    res.json({ results });
  } catch (err) { next(err); }
}

export async function markAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
    const result = await service.markAttendance(id!, req.validated!.body as any, req.user!);
    res.json(result);
  } catch (err) { next(err); }
}
