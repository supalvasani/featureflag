import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Project ──────────────────────────────────────────────────────────────────

export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    apiKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>('Project', ProjectSchema);

// ─── Flag ─────────────────────────────────────────────────────────────────────

export type FlagType = 'boolean' | 'percentage' | 'user_list' | 'attribute_rule';
export type FlagStatus = 'active' | 'inactive';

export interface IFlag extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  key: string;
  name: string;
  description?: string;
  type: FlagType;
  status: FlagStatus;
  defaultValue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FlagSchema = new Schema<IFlag>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['boolean', 'percentage', 'user_list', 'attribute_rule'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    defaultValue: { type: Boolean, default: false },
  },
  { timestamps: true }
);

FlagSchema.index({ projectId: 1, key: 1 }, { unique: true });
export const Flag = mongoose.model<IFlag>('Flag', FlagSchema);

// ─── FlagEnvironment ──────────────────────────────────────────────────────────

export type Environment = 'development' | 'staging' | 'production';

export interface IAttributeRule {
  attribute: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
  value: unknown;
}

export interface IFlagEnvironment extends Document {
  _id: Types.ObjectId;
  flagId: Types.ObjectId;
  environment: Environment;
  enabled: boolean;
  rolloutPercentage?: number;
  allowlist: string[];
  blocklist: string[];
  attributeRules: IAttributeRule[];
  updatedAt: Date;
}

const AttributeRuleSchema = new Schema(
  {
    attribute: { type: String, required: true },
    operator: { type: String, enum: ['eq', 'neq', 'gt', 'lt', 'contains'], required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const FlagEnvironmentSchema = new Schema<IFlagEnvironment>(
  {
    flagId: { type: Schema.Types.ObjectId, ref: 'Flag', required: true, index: true },
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      required: true,
    },
    enabled: { type: Boolean, default: true },
    rolloutPercentage: { type: Number, min: 0, max: 100 },
    allowlist: { type: [String], default: [] },
    blocklist: { type: [String], default: [] },
    attributeRules: { type: [AttributeRuleSchema], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

FlagEnvironmentSchema.index({ flagId: 1, environment: 1 }, { unique: true });
export const FlagEnvironment = mongoose.model<IFlagEnvironment>(
  'FlagEnvironment',
  FlagEnvironmentSchema
);

// ─── EvaluationLog ────────────────────────────────────────────────────────────

export interface IEvaluationLog extends Document {
  _id: Types.ObjectId;
  flagId: Types.ObjectId;
  projectId: Types.ObjectId;
  userId?: string;
  environment: string;
  result: boolean;
  reason: string;
  evaluatedAt: Date;
}

const EvaluationLogSchema = new Schema<IEvaluationLog>({
  flagId: { type: Schema.Types.ObjectId, ref: 'Flag', required: true, index: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: String },
  environment: { type: String, required: true },
  result: { type: Boolean, required: true },
  reason: { type: String, required: true },
  evaluatedAt: { type: Date, default: Date.now },
});

// Auto-expire evaluation logs after 90 days
EvaluationLogSchema.index({ evaluatedAt: 1 }, { expireAfterSeconds: 7_776_000 });
export const EvaluationLog = mongoose.model<IEvaluationLog>('EvaluationLog', EvaluationLogSchema);

// ─── AuditLog ─────────────────────────────────────────────────────────────────

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  flagId: Types.ObjectId;
  projectId: Types.ObjectId;
  action: string;
  changedBy: string;
  previousValue?: unknown;
  newValue?: unknown;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    flagId: { type: Schema.Types.ObjectId, ref: 'Flag', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    action: { type: String, required: true },
    changedBy: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
