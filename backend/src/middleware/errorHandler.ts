import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

/** Custom operational error with HTTP status code and machine-readable code */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Error Factories ──────────────────────────────────────────────────────────

export const NotFoundError = (resource: string): AppError =>
  new AppError(`${resource} not found`, 404, 'NOT_FOUND');

export const UnauthorizedError = (message = 'Unauthorized'): AppError =>
  new AppError(message, 401, 'UNAUTHORIZED');

export const ConflictError = (message: string): AppError =>
  new AppError(message, 409, 'CONFLICT');

// ─── Global Error Handler ─────────────────────────────────────────────────────

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    const message = err.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    res.status(400).json({ error: true, message, code: 'VALIDATION_ERROR' });
    return;
  }

  // Operational errors (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: true,
      message: err.message,
      code: err.code,
    });
    return;
  }

  // Mongoose duplicate key error
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: number }).code === 11000
  ) {
    res.status(409).json({ error: true, message: 'Resource already exists', code: 'CONFLICT' });
    return;
  }

  // Unknown / unexpected
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: true,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};
