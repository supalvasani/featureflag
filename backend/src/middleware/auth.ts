import type { Request, Response, NextFunction } from 'express';
import { Project } from '../db/schema';
import { AppError } from './errorHandler';
import type { AppRequest } from '../types';

/**
 * Validates the `x-api-key` header against the projects collection.
 * On success, attaches the matched project to `req.project`.
 * Returns 401 if the key is missing or does not match any project.
 */
export async function auth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new AppError('Missing x-api-key header', 401, 'UNAUTHORIZED');
    }

    const project = await Project.findOne({ apiKey }).lean();
    if (!project) {
      throw new AppError('Invalid API key', 401, 'UNAUTHORIZED');
    }

    // Attach project to request for downstream use
    (req as AppRequest).project = project as AppRequest['project'];
    next();
  } catch (err) {
    next(err);
  }
}
