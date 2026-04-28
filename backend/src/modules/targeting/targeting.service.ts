import type { AttributeRule } from '../../types';

/**
 * Checks whether a user's id or email appears in the given list.
 *
 * @param userId - The user's unique identifier
 * @param email  - The user's email address (optional)
 * @param list   - Array of user IDs or emails to check against
 */
export function isInList(
  userId: string,
  email: string | undefined,
  list: string[]
): boolean {
  if (list.includes(userId)) return true;
  if (email && list.includes(email)) return true;
  return false;
}

/**
 * Evaluates all attribute rules against a user's attribute map.
 * Uses AND logic — every rule must pass for the function to return true.
 * Returns false immediately if the rules array is empty.
 *
 * Supported operators:
 *   - eq       : strict equality
 *   - neq      : strict inequality
 *   - gt       : numeric greater-than
 *   - lt       : numeric less-than
 *   - contains : string substring or array membership
 *
 * @param attributes - Map of user attribute key→value
 * @param rules      - Targeting rules to evaluate
 */
export function evaluateAttributeRules(
  attributes: Record<string, unknown> = {},
  rules: AttributeRule[]
): boolean {
  if (rules.length === 0) return false;

  return rules.every((rule) => {
    const actual = attributes[rule.attribute];
    const expected = rule.value;

    switch (rule.operator) {
      case 'eq':
        return actual === expected;

      case 'neq':
        return actual !== expected;

      case 'gt':
        return (
          typeof actual === 'number' &&
          typeof expected === 'number' &&
          actual > expected
        );

      case 'lt':
        return (
          typeof actual === 'number' &&
          typeof expected === 'number' &&
          actual < expected
        );

      case 'contains':
        if (Array.isArray(actual)) return actual.includes(expected);
        if (typeof actual === 'string' && typeof expected === 'string') {
          return actual.includes(expected);
        }
        return false;

      default:
        return false;
    }
  });
}
