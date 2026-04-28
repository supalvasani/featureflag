import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import { logAction } from '../audit/audit.service';
import {
  invalidateKey,
  invalidatePattern,
  buildFlagCacheKey,
} from '../../cache/redis';
import {
  findFlagByKey,
  listFlags,
  createFlag,
  updateFlag,
  deleteFlag,
  findFlagEnv,
  upsertFlagEnv,
  disableAllFlagEnvs,
} from './flag.repository';
import type { CreateFlagDto, UpdateFlagDto, SetEnvironmentDto } from './flag.schema';
import type { Environment } from '../../db/schema';
import type { Types } from 'mongoose';

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Creates a new feature flag for a project.
 * Throws ConflictError if a flag with the same key already exists.
 *
 * @param projectId - The project's ObjectId
 * @param dto       - Validated flag creation payload
 * @param changedBy - Identity of the caller (for audit log)
 */
export async function createFlagService(
  projectId: string | Types.ObjectId,
  dto: CreateFlagDto,
  changedBy: string
) {
  const existing = await findFlagByKey(projectId, dto.key);
  if (existing) throw ConflictError(`Flag with key "${dto.key}" already exists`);

  const flag = await createFlag({ ...dto, projectId });

  await logAction({
    flagId: flag._id,
    projectId,
    action: 'flag_created',
    changedBy,
    newValue: flag,
  });

  return flag;
}

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Returns all flags for the given project.
 */
export async function listFlagsService(projectId: string | Types.ObjectId) {
  return listFlags(projectId);
}

// ─── Get ──────────────────────────────────────────────────────────────────────

/**
 * Retrieves a single flag by its key.
 * Throws NotFoundError if the flag does not exist.
 */
export async function getFlagService(
  projectId: string | Types.ObjectId,
  key: string
) {
  const flag = await findFlagByKey(projectId, key);
  if (!flag) throw NotFoundError('Flag');
  return flag;
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Updates a feature flag's config and invalidates its cache entries.
 *
 * @param projectId - The project's ObjectId
 * @param key       - The flag key
 * @param dto       - Validated partial update payload
 * @param changedBy - Identity of the caller (for audit log)
 */
export async function updateFlagService(
  projectId: string | Types.ObjectId,
  key: string,
  dto: UpdateFlagDto,
  changedBy: string
) {
  const existing = await findFlagByKey(projectId, key);
  if (!existing) throw NotFoundError('Flag');

  const updated = await updateFlag(existing._id, dto);

  await logAction({
    flagId: existing._id,
    projectId,
    action: 'flag_updated',
    changedBy,
    previousValue: existing,
    newValue: updated,
  });

  // Invalidate all environments for this flag
  await invalidatePattern(`flag:${String(projectId)}:${key}:*`);

  return updated;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Deletes a flag and all associated environment configs.
 * Invalidates cache entries for all environments.
 */
export async function deleteFlagService(
  projectId: string | Types.ObjectId,
  key: string,
  changedBy: string
): Promise<void> {
  const existing = await findFlagByKey(projectId, key);
  if (!existing) throw NotFoundError('Flag');

  await deleteFlag(existing._id);

  await logAction({
    flagId: existing._id,
    projectId,
    action: 'flag_deleted',
    changedBy,
    previousValue: existing,
  });

  await invalidatePattern(`flag:${String(projectId)}:${key}:*`);
}

// ─── Kill Switch ──────────────────────────────────────────────────────────────

/**
 * Instantly disables a flag in all environments.
 * Sets flag.status = "inactive" and enabled = false on every FlagEnvironment.
 * Invalidates all cache keys for the flag across all environments.
 *
 * @param projectId - The project's ObjectId
 * @param key       - The flag key to kill
 * @param changedBy - Identity of the caller (for audit log)
 */
export async function killSwitchService(
  projectId: string | Types.ObjectId,
  key: string,
  changedBy: string
) {
  const existing = await findFlagByKey(projectId, key);
  if (!existing) throw NotFoundError('Flag');

  const updated = await updateFlag(existing._id, { status: 'inactive' });
  await disableAllFlagEnvs(existing._id);

  await logAction({
    flagId: existing._id,
    projectId,
    action: 'kill_switch_triggered',
    changedBy,
    previousValue: { status: existing.status },
    newValue: { status: 'inactive' },
  });

  // Invalidate cache for all environments
  await invalidatePattern(`flag:${String(projectId)}:${key}:*`);

  return updated;
}

// ─── Set Environment ──────────────────────────────────────────────────────────

/**
 * Creates or updates the rollout/targeting config for a specific environment.
 * Invalidates the specific cache key for that flag+environment pair.
 *
 * @param projectId   - The project's ObjectId
 * @param key         - The flag key
 * @param environment - Target environment
 * @param dto         - Validated environment config payload
 * @param changedBy   - Identity of the caller (for audit log)
 */
export async function setEnvironmentService(
  projectId: string | Types.ObjectId,
  key: string,
  environment: Environment,
  dto: SetEnvironmentDto,
  changedBy: string
) {
  const flag = await findFlagByKey(projectId, key);
  if (!flag) throw NotFoundError('Flag');

  const previous = await findFlagEnv(flag._id, environment);
  const updated = await upsertFlagEnv(flag._id, environment, dto);

  await logAction({
    flagId: flag._id,
    projectId,
    action: 'environment_updated',
    changedBy,
    previousValue: previous,
    newValue: updated,
  });

  await invalidateKey(buildFlagCacheKey(String(projectId), key, environment));

  return updated;
}
