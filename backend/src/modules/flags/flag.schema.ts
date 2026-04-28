import { z } from 'zod';

// ─── Flag CRUD ────────────────────────────────────────────────────────────────

export const CreateFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['boolean', 'percentage', 'user_list', 'attribute_rule']),
  defaultValue: z.boolean().default(false),
});

export const UpdateFlagSchema = CreateFlagSchema.partial();

// ─── Environment Config ───────────────────────────────────────────────────────

const AttributeRuleSchema = z.object({
  attribute: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'gt', 'lt', 'contains']),
  value: z.unknown(),
});

export const SetEnvironmentSchema = z.object({
  enabled: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  allowlist: z.array(z.string()).default([]),
  blocklist: z.array(z.string()).default([]),
  attributeRules: z.array(AttributeRuleSchema).default([]),
});

// ─── Evaluation ───────────────────────────────────────────────────────────────

const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const EvaluateSchema = z.object({
  flagKey: z.string().min(1),
  environment: z.enum(['development', 'staging', 'production']),
  user: UserSchema,
});

export const BulkEvaluateSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']),
  user: UserSchema,
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type CreateFlagDto = z.infer<typeof CreateFlagSchema>;
export type UpdateFlagDto = z.infer<typeof UpdateFlagSchema>;
export type SetEnvironmentDto = z.infer<typeof SetEnvironmentSchema>;
export type EvaluateDto = z.infer<typeof EvaluateSchema>;
export type BulkEvaluateDto = z.infer<typeof BulkEvaluateSchema>;
