import murmurhash from 'murmurhash';
import { isInList, evaluateAttributeRules } from '../targeting/targeting.service';
import type { IFlag, IFlagEnvironment } from '../../db/schema';
import type { EvaluationResult, EvaluationUser } from '../../types';

/**
 * Core evaluation engine. Determines the value of a feature flag for a given user.
 *
 * Priority order:
 *  1. Kill switch  — flag.status === "inactive"
 *  2. Env disabled — flagEnv.enabled === false
 *  3. Blocklist    — user.id is in blocklist
 *  4. Allowlist    — user.id or user.email is in allowlist
 *  5. Attr rules   — all attributeRules match (AND logic)
 *  6. % rollout    — murmurhash(userId + flagKey) % 100 < rolloutPercentage
 *  7. Default      — flag.defaultValue
 *
 * This function is intentionally pure (no I/O) for easy unit testing.
 *
 * @param flag    - The flag document from the database
 * @param flagEnv - The environment config document (may be null if not configured)
 * @param user    - The user context for this evaluation
 */
export function evaluate(
  flag: Pick<IFlag, 'key' | 'status' | 'defaultValue'>,
  flagEnv: Pick<
    IFlagEnvironment,
    'enabled' | 'rolloutPercentage' | 'allowlist' | 'blocklist' | 'attributeRules'
  > | null,
  user: EvaluationUser
): EvaluationResult {
  // 1. Kill switch
  if (flag.status === 'inactive') {
    return { flagKey: flag.key, result: false, reason: 'kill_switch' };
  }

  // If no environment config exists, fall back to default
  if (!flagEnv) {
    return { flagKey: flag.key, result: flag.defaultValue, reason: 'default' };
  }

  // 2. Environment disabled
  if (!flagEnv.enabled) {
    return { flagKey: flag.key, result: false, reason: 'env_disabled' };
  }

  // 3. Blocklist check
  if (isInList(user.id, user.email, flagEnv.blocklist ?? [])) {
    return { flagKey: flag.key, result: false, reason: 'blocklist' };
  }

  // 4. Allowlist check
  if (isInList(user.id, user.email, flagEnv.allowlist ?? [])) {
    return { flagKey: flag.key, result: true, reason: 'allowlist_match' };
  }

  // 5. Attribute rules (all must match)
  const rules = flagEnv.attributeRules ?? [];
  if (rules.length > 0 && evaluateAttributeRules(user.attributes, rules)) {
    return { flagKey: flag.key, result: true, reason: 'attribute_rule_match' };
  }

  // 6. Percentage rollout — consistent hash so the same user always gets the same result
  if (
    flagEnv.rolloutPercentage !== undefined &&
    flagEnv.rolloutPercentage !== null
  ) {
    const hash = murmurhash.v3(user.id + flag.key) % 100;
    const inRollout = hash < flagEnv.rolloutPercentage;
    return {
      flagKey: flag.key,
      result: inRollout,
      reason: 'percentage_rollout',
    };
  }

  // 7. Default value
  return { flagKey: flag.key, result: flag.defaultValue, reason: 'default' };
}
