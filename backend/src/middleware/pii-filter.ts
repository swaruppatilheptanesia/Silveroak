import { Request, Response, NextFunction } from 'express';

const PII_FIELDS = new Set([
  'email',
  'mobile',
  'phone',
  'alternate_phone',
  'personal_address',
  'residential_address',
  'permanent_address',
  'date_of_birth',
  'contact_email',
  'contact_phone',
]);

function isStudentLikeObject(path: string[], obj: Record<string, unknown>) {
  const container = path[path.length - 1];

  if (container === 'student' || container === 'students') {
    return true;
  }

  return 'enrollment_number' in obj || 'batch' in obj || 'department' in obj;
}

function stripPii(obj: unknown, path: string[] = []): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => stripPii(item, path));
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const studentLike = isStudentLikeObject(path, record);

  for (const [key, value] of Object.entries(record)) {
    if (studentLike && PII_FIELDS.has(key)) {
      continue; // Strip the field entirely
    }
    result[key] = typeof value === 'object' ? stripPii(value, [...path, key]) : value;
  }
  return result;
}

/**
 * PII protection middleware for recruiter-facing routes.
 * Intercepts res.json() and strips sensitive fields.
 */
export function piiFilter() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only apply to recruiter role
    if (!req.user || req.user.role !== 'recruiter') {
      return next();
    }

    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      return originalJson(stripPii(body));
    };

    next();
  };
}
