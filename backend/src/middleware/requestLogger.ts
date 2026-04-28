import type { Request, Response, NextFunction } from 'express';

/**
 * Logs every incoming request with method, path, status code, and duration.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, path } = req;
    const { statusCode } = res;
    console.log(`${method} ${path} ${statusCode} ${duration}ms`);
  });

  next();
}
