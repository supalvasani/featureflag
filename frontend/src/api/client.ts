const BASE_URL = 'http://localhost:3000/api';

function getApiKey(): string {
  return localStorage.getItem('ff_api_key') ?? '';
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Flag {
  _id: string;
  projectId: string;
  key: string;
  name: string;
  description?: string;
  type: 'boolean' | 'percentage' | 'user_list' | 'attribute_rule';
  status: 'active' | 'inactive';
  defaultValue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlagEnvironment {
  _id: string;
  flagId: string;
  environment: 'development' | 'staging' | 'production';
  enabled: boolean;
  rolloutPercentage?: number;
  allowlist: string[];
  blocklist: string[];
  attributeRules: AttributeRule[];
  updatedAt: string;
}

export interface AttributeRule {
  attribute: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
  value: unknown;
}

export interface AuditLog {
  _id: string;
  flagId: string;
  projectId: string;
  action: string;
  changedBy: string;
  previousValue?: unknown;
  newValue?: unknown;
  createdAt: string;
}

export interface Analytics {
  flagId: string;
  trueCount: number;
  falseCount: number;
  total: number;
}

export interface EvaluationResult {
  flagKey: string;
  result: boolean;
  reason: string;
}

export interface CreateFlagPayload {
  key: string;
  name: string;
  description?: string;
  type: Flag['type'];
  defaultValue: boolean;
}

export interface SetEnvironmentPayload {
  enabled: boolean;
  rolloutPercentage?: number;
  allowlist?: string[];
  blocklist?: string[];
  attributeRules?: AttributeRule[];
}

export interface EvaluatePayload {
  flagKey: string;
  environment: 'development' | 'staging' | 'production';
  user: { id: string; email?: string; attributes?: Record<string, unknown> };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const api = {
  flags: {
    list:   ()                     => request<Flag[]>('/flags'),
    get:    (key: string)          => request<Flag>(`/flags/${key}`),
    create: (data: CreateFlagPayload) => request<Flag>('/flags', { method: 'POST', body: JSON.stringify(data) }),
    update: (key: string, data: Partial<CreateFlagPayload>) =>
      request<Flag>(`/flags/${key}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (key: string)          => request<void>(`/flags/${key}`, { method: 'DELETE' }),
    kill:   (key: string)          => request<{ message: string; flag: Flag }>(`/flags/${key}/kill`, { method: 'POST' }),
    audit:  (key: string)          => request<AuditLog[]>(`/flags/${key}/audit`),
    analytics: (key: string)       => request<Analytics>(`/flags/${key}/analytics`),
    setEnv: (key: string, env: string, data: SetEnvironmentPayload) =>
      request<FlagEnvironment>(`/flags/${key}/environments/${env}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  evaluate: {
    single: (data: EvaluatePayload) =>
      request<EvaluationResult>('/evaluate', { method: 'POST', body: JSON.stringify(data) }),
    bulk: (data: Omit<EvaluatePayload, 'flagKey'>) =>
      request<EvaluationResult[]>('/evaluate/bulk', { method: 'POST', body: JSON.stringify(data) }),
  },
};
