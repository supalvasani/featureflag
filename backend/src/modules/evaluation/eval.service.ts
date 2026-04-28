import { NotFoundError } from '../../middleware/errorHandler';
import { getCached, setCached, buildFlagCacheKey, FLAG_CACHE_TTL } from '../../cache/redis';
import { findFlagByKey, findFlagEnv, listFlags } from '../flags/flag.repository';
import { evaluate } from './eval.engine';
import { insertEvalLog } from './eval.repository';
import type { Environment } from '../../db/schema';
import type { EvaluationUser, EvaluationResult } from '../../types';
import type { Types } from 'mongoose';

interface CachedFlagData {
  flag: Awaited<ReturnType<typeof findFlagByKey>>;
  flagEnv: Awaited<ReturnType<typeof findFlagEnv>>;
}

/**
 * Evaluates a single feature flag for a given user in a specific environment.
 *
 * Uses a cache-aside pattern:
 *  - Check Redis for cached { flag, flagEnv }
 *  - On miss, fetch from MongoDB and populate the cache (TTL: 30s)
 *
 * Evaluation logs are written fire-and-forget (no await) so they never
 * add latency to the response.
 *
 * @param projectId   - The project's ObjectId
 * @param flagKey     - The flag key to evaluate
 * @param environment - The target environment
 * @param user        - The user context
 */
export async function evaluateFlag(
  projectId: string | Types.ObjectId,
  flagKey: string,
  environment: Environment,
  user: EvaluationUser
): Promise<EvaluationResult> {
  const projectIdStr = String(projectId);
  const cacheKey = buildFlagCacheKey(projectIdStr, flagKey, environment);

  // 1. Try cache
  let cached = await getCached<CachedFlagData>(cacheKey);

  // 2. Cache miss → fetch from DB
  if (!cached) {
    const flag = await findFlagByKey(projectId, flagKey);
    if (!flag) throw NotFoundError('Flag');

    const flagEnv = await findFlagEnv(flag._id, environment);
    cached = { flag, flagEnv };
    await setCached(cacheKey, cached, FLAG_CACHE_TTL);
  }

  const { flag, flagEnv } = cached;
  if (!flag) throw NotFoundError('Flag');

  // 3. Run evaluation engine (pure function)
  const result = evaluate(flag, flagEnv, user);

  // 4. Fire-and-forget evaluation log (never await)
  insertEvalLog({
    flagId: flag._id,
    projectId,
    userId: user.id,
    environment,
    result: result.result,
    reason: result.reason,
  }).catch((err) => console.error('Failed to write eval log:', err));

  return result;
}

/**
 * Evaluates ALL active flags for a user in one call.
 * Runs each flag evaluation concurrently via Promise.all.
 *
 * @param projectId   - The project's ObjectId
 * @param environment - The target environment
 * @param user        - The user context
 */
export async function evaluateBulk(
  projectId: string | Types.ObjectId,
  environment: Environment,
  user: EvaluationUser
): Promise<EvaluationResult[]> {
  const flags = await listFlags(projectId);
  const activeFlags = flags.filter((f) => f.status === 'active');

  const results = await Promise.all(
    activeFlags.map((f) => evaluateFlag(projectId, f.key, environment, user))
  );

  return results;
}
