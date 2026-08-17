import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidationSource = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Let the global error handler format the ZodError
      next(result.error);
      return;
    }

    // Attach validated data to request
    if (!req.validated) req.validated = {};
    req.validated[source] = result.data;

    next();
  };
}
