import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../shared/errors';
import { logger } from '../config/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // AppError (our custom errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details.length > 0 ? err.details : undefined,
      },
    });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: 'INVALID_FORMAT',
    }));

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more fields have validation errors',
        details,
      },
    });
    return;
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'field';
        res.status(409).json({
          error: {
            code: 'DUPLICATE_ENTRY',
            message: `A record with this ${target} already exists`,
          },
        });
        return;
      }
      case 'P2025':
        res.status(404).json({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'The requested resource was not found',
          },
        });
        return;
      case 'P2003':
        res.status(400).json({
          error: {
            code: 'FOREIGN_KEY_VIOLATION',
            // Covers both directions of a P2003: a create/update pointing at a missing record, and
            // a delete blocked because other records still reference this one (onDelete: Restrict).
            message: 'This record is still linked to other records, or a referenced record no longer exists',
          },
        });
        return;
      default:
        break;
    }
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: {
        code: 'DATABASE_VALIDATION_ERROR',
        message: 'Invalid data provided',
      },
    });
    return;
  }

  // Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds ${env.maxFileSizeMb} MB limit`,
        },
      });
      return;
    }

    res.status(400).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Unexpected errors
  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
}
