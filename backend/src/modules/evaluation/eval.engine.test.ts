import { evaluate } from './eval.engine';
import type { IFlag, IFlagEnvironment } from '../../db/schema';
import type { EvaluationUser } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FlagStub = Pick<IFlag, 'key' | 'status' | 'defaultValue'>;
type EnvStub = Pick<
  IFlagEnvironment,
  'enabled' | 'rolloutPercentage' | 'allowlist' | 'blocklist' | 'attributeRules'
> | null;

const baseFlag: FlagStub = {
  key: 'test_flag',
  status: 'active',
  defaultValue: false,
};

const baseEnv: NonNullable<EnvStub> = {
  enabled: true,
  allowlist: [],
  blocklist: [],
  attributeRules: [],
  rolloutPercentage: undefined,
};

const user: EvaluationUser = {
  id: 'user_123',
  email: 'user@example.com',
  attributes: { country: 'IN', plan: 'pro', age: 25 },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('evaluate — priority 1: kill switch', () => {
  it('returns false with reason kill_switch when flag.status is inactive', () => {
    const result = evaluate({ ...baseFlag, status: 'inactive' }, baseEnv, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: false, reason: 'kill_switch' });
  });
});

describe('evaluate — priority 2: env disabled', () => {
  it('returns false with reason env_disabled when flagEnv.enabled is false', () => {
    const result = evaluate(baseFlag, { ...baseEnv, enabled: false }, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: false, reason: 'env_disabled' });
  });

  it('returns default when flagEnv is null', () => {
    const result = evaluate({ ...baseFlag, defaultValue: true }, null, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: true, reason: 'default' });
  });
});

describe('evaluate — priority 3: blocklist', () => {
  it('returns false when user.id is in blocklist', () => {
    const result = evaluate(baseFlag, { ...baseEnv, blocklist: ['user_123'] }, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: false, reason: 'blocklist' });
  });

  it('returns false when user.email is in blocklist', () => {
    const result = evaluate(baseFlag, { ...baseEnv, blocklist: ['user@example.com'] }, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: false, reason: 'blocklist' });
  });
});

describe('evaluate — priority 4: allowlist', () => {
  it('returns true when user.id is in allowlist', () => {
    const result = evaluate(baseFlag, { ...baseEnv, allowlist: ['user_123'] }, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: true, reason: 'allowlist_match' });
  });

  it('returns true when user.email is in allowlist', () => {
    const result = evaluate(baseFlag, { ...baseEnv, allowlist: ['user@example.com'] }, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: true, reason: 'allowlist_match' });
  });

  it('blocklist takes priority over allowlist', () => {
    const env = { ...baseEnv, blocklist: ['user_123'], allowlist: ['user_123'] };
    const result = evaluate(baseFlag, env, user);
    expect(result.reason).toBe('blocklist');
  });
});

describe('evaluate — priority 5: attribute rules', () => {
  it('returns true when all attribute rules match', () => {
    const env = {
      ...baseEnv,
      attributeRules: [
        { attribute: 'country', operator: 'eq' as const, value: 'IN' },
        { attribute: 'plan', operator: 'eq' as const, value: 'pro' },
      ],
    };
    const result = evaluate(baseFlag, env, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: true, reason: 'attribute_rule_match' });
  });

  it('does not trigger when any rule fails', () => {
    const env = {
      ...baseEnv,
      attributeRules: [
        { attribute: 'country', operator: 'eq' as const, value: 'IN' },
        { attribute: 'plan', operator: 'eq' as const, value: 'free' }, // fails
      ],
    };
    const result = evaluate(baseFlag, env, user);
    // Falls through to default since rolloutPercentage is undefined
    expect(result.reason).toBe('default');
  });
});

describe('evaluate — priority 6: percentage rollout', () => {
  it('produces a deterministic result for the same user+flag', () => {
    const env = { ...baseEnv, rolloutPercentage: 50 };
    const r1 = evaluate(baseFlag, env, user);
    const r2 = evaluate(baseFlag, env, user);
    expect(r1.result).toBe(r2.result);
    expect(r1.reason).toBe('percentage_rollout');
  });

  it('returns false for 0% rollout', () => {
    const env = { ...baseEnv, rolloutPercentage: 0 };
    const result = evaluate(baseFlag, env, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: false, reason: 'percentage_rollout' });
  });

  it('returns true for 100% rollout', () => {
    const env = { ...baseEnv, rolloutPercentage: 100 };
    const result = evaluate(baseFlag, env, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: true, reason: 'percentage_rollout' });
  });
});

describe('evaluate — priority 7: default', () => {
  it('returns flag.defaultValue=false when no rules apply', () => {
    const result = evaluate(baseFlag, baseEnv, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: false, reason: 'default' });
  });

  it('returns flag.defaultValue=true when no rules apply', () => {
    const result = evaluate({ ...baseFlag, defaultValue: true }, baseEnv, user);
    expect(result).toEqual({ flagKey: 'test_flag', result: true, reason: 'default' });
  });
});
