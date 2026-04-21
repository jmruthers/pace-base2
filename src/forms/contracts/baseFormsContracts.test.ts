import { describe, expect, it } from 'vitest';
import {
  BASE_ACCESS_MODES,
  BASE_WORKFLOW_TYPES,
  hasLegacyFieldIdentity,
  hasLegacyResponseTargeting,
  validateFieldKey,
} from './baseFormsContracts';

describe('BA02 base forms contracts', () => {
  it('supports only approved workflow and access-mode enums', () => {
    expect(BASE_WORKFLOW_TYPES).toEqual(['base_registration']);
    expect(BASE_ACCESS_MODES).toEqual([
      'authenticated_member',
      'public',
      'organiser_only',
    ]);
  });

  it('accepts semantic field_key values and rejects invalid keys', () => {
    expect(validateFieldKey('guardian_email')).toBe(true);
    expect(validateFieldKey('')).toBe(false);
    expect(validateFieldKey('guardian email')).toBe(false);
  });

  it('detects and rejects legacy field and response identity keys', () => {
    expect(hasLegacyFieldIdentity({ table_name: 'base_application' })).toBe(true);
    expect(hasLegacyFieldIdentity({ field_key: 'guardian_email' })).toBe(false);

    expect(hasLegacyResponseTargeting({ target_table: 'base_application' })).toBe(true);
    expect(
      hasLegacyResponseTargeting({
        workflow_subject_type: 'base_application',
        workflow_subject_id: 'app-1',
      })
    ).toBe(false);
  });
});
