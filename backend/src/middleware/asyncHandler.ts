import type { RequestHandler, Request, Response, NextFunction } from 'express';
import type { AppRequest } from '../types';

/**
 * Wraps an async route handler that uses AppRequest.
 * Casts the handler to Express's RequestHandler to satisfy TypeScript's
 * overload resolution while keeping full type safety inside the handler.
 *
 * @param fn - Async handler that receives AppRequest
 */
export function asyncHandler(
  fn: (req: AppRequest, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req as AppRequest, res, next).catch(next);
  };
}
