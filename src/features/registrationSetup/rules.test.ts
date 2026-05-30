import { describe, expect, it } from 'vitest';
import { deriveAutomatedFlag, isIsoDateValue } from './rules';

describe('BA04 registrationSetup rules', () => {
  it('derives automated flag per requirement check type', () => {
    expect(deriveAutomatedFlag('payment')).toBe(true);
    expect(deriveAutomatedFlag('guardian_approval')).toBe(false);
    expect(deriveAutomatedFlag('designated_org_review')).toBe(false);
    expect(deriveAutomatedFlag('event_approval')).toBe(false);
  });

  it('validates ISO date strings', () => {
    expect(isIsoDateValue('2026-05-01')).toBe(true);
    expect(isIsoDateValue('2026-13-01')).toBe(false);
    expect(isIsoDateValue('01-05-2026')).toBe(false);
    expect(isIsoDateValue('')).toBe(false);
  });
});
