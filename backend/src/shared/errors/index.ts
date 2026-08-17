import { AppError, ErrorDetail } from './app-error';

export { AppError, ErrorDetail };

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details: ErrorDetail[] = []) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: string = 'TOKEN_INVALID') {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', code: string = 'INSUFFICIENT_PERMISSIONS') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', code: string = 'RESOURCE_NOT_FOUND') {
    super(`${resource} not found`, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, code: string) {
    super(message, 422, code);
  }
}
