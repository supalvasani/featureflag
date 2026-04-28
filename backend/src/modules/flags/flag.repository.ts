import type { Types } from 'mongoose';
import { Flag, FlagEnvironment } from '../../db/schema';
import type { CreateFlagDto, UpdateFlagDto, SetEnvironmentDto } from './flag.schema';
import type { Environment } from '../../db/schema';

/**
 * Finds a flag by its key within a project.
 */
export async function findFlagByKey(projectId: string | Types.ObjectId, key: string) {
  return Flag.findOne({ projectId, key }).lean();
}

/**
 * Finds a flag by its MongoDB ObjectId.
 */
export async function findFlagById(id: string | Types.ObjectId) {
  return Flag.findById(id).lean();
}

/**
 * Lists all flags belonging to a project.
 */
export async function listFlags(projectId: string | Types.ObjectId) {
  return Flag.find({ projectId }).sort({ createdAt: -1 }).lean();
}

/**
 * Creates a new flag document.
 */
export async function createFlag(
  data: CreateFlagDto & { projectId: string | Types.ObjectId }
) {
  const flag = await Flag.create(data);
  return flag.toObject();
}

/**
 * Partially updates a flag by its id.
 */
export async function updateFlag(
  id: string | Types.ObjectId,
  data: UpdateFlagDto & { status?: 'active' | 'inactive' }
) {
  return Flag.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
}

/**
 * Deletes a flag and all its environment configs.
 */
export async function deleteFlag(id: string | Types.ObjectId): Promise<void> {
  await Flag.findByIdAndDelete(id);
  await FlagEnvironment.deleteMany({ flagId: id });
}

/**
 * Finds the environment config for a specific flag + environment pair.
 */
export async function findFlagEnv(
  flagId: string | Types.ObjectId,
  environment: Environment
) {
  return FlagEnvironment.findOne({ flagId, environment }).lean();
}

/**
 * Upserts the environment config for a flag.
 * Creates the document if it doesn't exist; updates it if it does.
 */
export async function upsertFlagEnv(
  flagId: string | Types.ObjectId,
  environment: Environment,
  data: SetEnvironmentDto
) {
  return FlagEnvironment.findOneAndUpdate(
    { flagId, environment },
    { $set: { ...data, flagId, environment } },
    { upsert: true, new: true }
  ).lean();
}

/**
 * Lists all environment configs for a flag (used by kill switch).
 */
export async function listFlagEnvs(flagId: string | Types.ObjectId) {
  return FlagEnvironment.find({ flagId }).lean();
}

/**
 * Disables all environments for a flag (used by kill switch).
 */
export async function disableAllFlagEnvs(flagId: string | Types.ObjectId): Promise<void> {
  await FlagEnvironment.updateMany({ flagId }, { $set: { enabled: false } });
}
