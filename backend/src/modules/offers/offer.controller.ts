import { Request, Response, NextFunction } from 'express';
import * as service from './offer.service';

export async function getOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getOffers(req.user!.tenant_id, req.validated!.query as any, req.user!, req.scope);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getOfferById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
    const offer = await service.getOfferById(id!, req.user!, req.scope);
    res.json(offer);
  } catch (err) { next(err); }
}

export async function getMyOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const offers = await service.getMyOffers(req.user!.id);
    res.json({ offers });
  } catch (err) { next(err); }
}

export async function createOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const offer = await service.createOffer(req.user!.tenant_id, req.validated!.body as any, req.user!.id);
    res.status(201).json(offer);
  } catch (err) { next(err); }
}

export async function acceptOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
    const offer = await service.acceptOffer(req.user!.id, id!);
    res.json(offer);
  } catch (err) { next(err); }
}

export async function rejectOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
    const offer = await service.rejectOffer(id!, req.validated!.body as any, req.user!.id);
    res.json(offer);
  } catch (err) { next(err); }
}

export async function studentRejectOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
    const offer = await service.rejectOfferByStudent(req.user!.id, id!, req.validated!.body as any);
    res.json(offer);
  } catch (err) { next(err); }
}

export async function updateJoiningStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
    const offer = await service.updateJoiningStatus(id!, req.validated!.body as any, req.user!.id);
    res.json(offer);
  } catch (err) { next(err); }
}

export async function updateCompliance(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
    const offer = await service.updateCompliance(id!, req.validated!.body as any, req.user!.id);
    res.json(offer);
  } catch (err) { next(err); }
}
