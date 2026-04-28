import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Returns an Express middleware that parses and validates `req.body`
 * against the given Zod schema. On failure, passes the ZodError to
 * the global error handler (which maps it to 400 VALIDATION_ERROR).
 *
 * @param schema - Zod schema to validate the request body against
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err); // ZodError is handled by errorHandler middleware
    }
  };
}
