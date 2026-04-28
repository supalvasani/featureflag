import { isInList, evaluateAttributeRules } from './targeting.service';

describe('isInList', () => {
  it('returns true when userId is in list', () => {
    expect(isInList('user_123', undefined, ['user_123', 'other'])).toBe(true);
  });

  it('returns true when email is in list', () => {
    expect(isInList('user_abc', 'hello@example.com', ['hello@example.com'])).toBe(true);
  });

  it('returns false when neither id nor email match', () => {
    expect(isInList('user_abc', 'no@example.com', ['user_123', 'other@example.com'])).toBe(false);
  });

  it('returns false for empty list', () => {
    expect(isInList('user_123', 'test@test.com', [])).toBe(false);
  });

  it('returns false when email is undefined and id does not match', () => {
    expect(isInList('user_999', undefined, ['user_123'])).toBe(false);
  });
});

describe('evaluateAttributeRules', () => {
  const attrs = { country: 'IN', plan: 'pro', age: 25 };

  it('returns false for empty rules array', () => {
    expect(evaluateAttributeRules(attrs, [])).toBe(false);
  });

  describe('eq operator', () => {
    it('returns true when attribute equals value', () => {
      expect(evaluateAttributeRules(attrs, [{ attribute: 'country', operator: 'eq', value: 'IN' }])).toBe(true);
    });
    it('returns false when attribute does not equal value', () => {
      expect(evaluateAttributeRules(attrs, [{ attribute: 'country', operator: 'eq', value: 'US' }])).toBe(false);
    });
  });

  describe('neq operator', () => {
    it('returns true when attribute differs from value', () => {
      expect(evaluateAttributeRules(attrs, [{ attribute: 'country', operator: 'neq', value: 'US' }])).toBe(true);
    });
    it('returns false when attribute equals value', () => {
      expect(evaluateAttributeRules(attrs, [{ attribute: 'country', operator: 'neq', value: 'IN' }])).toBe(false);
    });
  });

  describe('gt operator', () => {
    it('returns true when numeric attribute is greater', () => {
      expect(evaluateAttributeRules(attrs, [{ attribute: 'age', operator: 'gt', value: 18 }])).toBe(true);
    });
    it('returns false when attribute is not greater', () => {
      expect(evaluateAttributeRules(attrs, [{ attribute: 'age', operator: 'gt', value: 30 }])).toBe(false);
    });
    it('returns false for non-numeric comparison', () => {
      expect(evaluateAttributeRules(attrs, [{ attribute: 'country', operator: 'gt', value: 'A' }])).toBe(false);
    });
  });

  describe('lt operator', () => {
    it('returns true when numeric attribute is less', () => {
      expect(evaluateAttributeRules(attrs, [{ attribute: 'age', operator: 'lt', value: 30 }])).toBe(true);
    });
    it('returns false when attribute is not less', () => {
      expect(evaluateAttributeRules(attrs, [{ attribute: 'age', operator: 'lt', value: 18 }])).toBe(false);
    });
  });

  describe('contains operator', () => {
    it('returns true for string substring match', () => {
      expect(evaluateAttributeRules({ tag: 'super-admin' }, [{ attribute: 'tag', operator: 'contains', value: 'admin' }])).toBe(true);
    });
    it('returns false for string non-match', () => {
      expect(evaluateAttributeRules({ tag: 'super-admin' }, [{ attribute: 'tag', operator: 'contains', value: 'user' }])).toBe(false);
    });
    it('returns true for array membership', () => {
      expect(evaluateAttributeRules({ roles: ['admin', 'viewer'] }, [{ attribute: 'roles', operator: 'contains', value: 'admin' }])).toBe(true);
    });
    it('returns false for array non-membership', () => {
      expect(evaluateAttributeRules({ roles: ['viewer'] }, [{ attribute: 'roles', operator: 'contains', value: 'admin' }])).toBe(false);
    });
  });

  describe('AND logic', () => {
    it('returns true when all rules pass', () => {
      const rules = [
        { attribute: 'country', operator: 'eq' as const, value: 'IN' },
        { attribute: 'plan', operator: 'eq' as const, value: 'pro' },
      ];
      expect(evaluateAttributeRules(attrs, rules)).toBe(true);
    });

    it('returns false when any rule fails', () => {
      const rules = [
        { attribute: 'country', operator: 'eq' as const, value: 'IN' },
        { attribute: 'plan', operator: 'eq' as const, value: 'free' },
      ];
      expect(evaluateAttributeRules(attrs, rules)).toBe(false);
    });
  });
});
