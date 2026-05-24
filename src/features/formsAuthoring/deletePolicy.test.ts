import { describe, expect, it } from 'vitest';
import { isFormDeleteBlocked } from './deletePolicy';

describe('formsAuthoring deletePolicy', () => {
  it('blocks delete when responses or bindings exist', () => {
    expect(isFormDeleteBlocked({ responseCount: 1, registrationBindingCount: 0 })).toBe(true);
    expect(isFormDeleteBlocked({ responseCount: 0, registrationBindingCount: 1 })).toBe(true);
    expect(isFormDeleteBlocked({ responseCount: 0, registrationBindingCount: 0 })).toBe(false);
  });
});
