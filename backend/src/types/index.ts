import type { Request } from 'express';
import type { IProject } from '../db/schema';

/** Operators supported in attribute targeting rules */
export type AttributeOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'contains';

/** A single rule that matches a user attribute against a value */
export interface AttributeRule {
  attribute: string;
  operator: AttributeOperator;
  value: unknown;
}

/** Contextual user info passed into the evaluation engine */
export interface EvaluationUser {
  id: string;
  email?: string;
  attributes?: Record<string, unknown>;
}

/** All possible reasons for an evaluation decision */
export type EvaluationReason =
  | 'kill_switch'
  | 'env_disabled'
  | 'blocklist'
  | 'allowlist_match'
  | 'attribute_rule_match'
  | 'percentage_rollout'
  | 'default';

/** Result returned from a flag evaluation */
export interface EvaluationResult {
  flagKey: string;
  result: boolean;
  reason: EvaluationReason;
}

/** Express Request extended with the authenticated project */
export interface AppRequest extends Request {
  project: IProject;
}
