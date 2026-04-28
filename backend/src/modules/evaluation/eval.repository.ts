import { EvaluationLog } from '../../db/schema';
import type { Types } from 'mongoose';

export interface InsertEvalLogParams {
  flagId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  userId?: string;
  environment: string;
  result: boolean;
  reason: string;
}

/**
 * Inserts an evaluation log entry.
 * Designed to be called fire-and-forget (no await at call site) to avoid
 * adding latency to the evaluation response path.
 */
export async function insertEvalLog(params: InsertEvalLogParams): Promise<void> {
  await EvaluationLog.create({ ...params, evaluatedAt: new Date() });
}

/**
 * Returns aggregated evaluation counts (true vs false) for a flag.
 * Uses a MongoDB aggregation pipeline grouped by result.
 *
 * @param flagId - The flag's ObjectId
 */
export async function getEvalAnalytics(flagId: Types.ObjectId | string) {
  const pipeline = [
    { $match: { flagId } },
    {
      $group: {
        _id: '$result',
        count: { $sum: 1 },
      },
    },
  ];

  const results = await EvaluationLog.aggregate(pipeline);

  let trueCount = 0;
  let falseCount = 0;

  for (const r of results) {
    if (r._id === true) trueCount = r.count;
    if (r._id === false) falseCount = r.count;
  }

  return { flagId, trueCount, falseCount, total: trueCount + falseCount };
}
