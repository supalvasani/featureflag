import { insertAuditLog, type InsertAuditLogParams } from './audit.repository';

/**
 * Records an audit action for a flag change.
 * Thin wrapper that keeps business-level callers decoupled from the repository.
 *
 * @param params - Audit log entry data
 */
export async function logAction(params: InsertAuditLogParams): Promise<void> {
  await insertAuditLog(params);
}
