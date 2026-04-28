import { AuditLog } from '../../db/schema';
import type { Types } from 'mongoose';

export interface InsertAuditLogParams {
  flagId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  action: string;
  changedBy: string;
  previousValue?: unknown;
  newValue?: unknown;
}

/**
 * Inserts a new audit log entry into the database.
 */
export async function insertAuditLog(params: InsertAuditLogParams): Promise<void> {
  await AuditLog.create(params);
}

/**
 * Retrieves audit logs for a specific flag, sorted newest-first.
 *
 * @param flagId - The flag's ObjectId
 * @param limit  - Max number of records to return (default: 50)
 */
export async function getAuditLogsForFlag(
  flagId: Types.ObjectId | string,
  limit = 50
) {
  return AuditLog.find({ flagId }).sort({ createdAt: -1 }).limit(limit).lean();
}
