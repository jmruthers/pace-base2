import { describe, expect, it } from 'vitest';
import {
  arePreferenceRanksContiguous,
  computeDescendantIds,
  hasDuplicateSessionPreference,
  normalizeOptionalText,
  normalizePreferenceRanks,
  resolveApplicantName,
  validateUnitNumber,
} from './stateHelpers';
import type { ActivityPreferenceRow, UnitRow } from './types';

function makePreference(overrides?: Partial<ActivityPreferenceRow>): ActivityPreferenceRow {
  return {
    id: 'pref-1',
    unit_id: 'unit-1',
    session_id: 'session-1',
    rank: 1,
    submitted_at: null,
    submitted_by: null,
    event_id: 'event-1',
    ...overrides,
  };
}

describe('unitsCoordination state helpers', () => {
  it('validates unit number inputs', () => {
    expect(validateUnitNumber('').valid).toBe(false);
    expect(validateUnitNumber('0').valid).toBe(false);
    expect(validateUnitNumber('-1').valid).toBe(false);
    expect(validateUnitNumber('1.5').valid).toBe(false);
    expect(validateUnitNumber('2').valid).toBe(true);
  });

  it('normalises optional text to null when blank', () => {
    expect(normalizeOptionalText(undefined)).toBeNull();
    expect(normalizeOptionalText(null)).toBeNull();
    expect(normalizeOptionalText('')).toBeNull();
    expect(normalizeOptionalText('   ')).toBeNull();
    expect(normalizeOptionalText(' Alpha ')).toBe('Alpha');
  });

  it('resolves applicant name with preferred name and fallbacks', () => {
    expect(
      resolveApplicantName({
        preferred_name: 'Alex',
        first_name: 'Alexander',
        last_name: 'Smith',
        email: 'alex@example.com',
      })
    ).toBe('Alex Smith');
    expect(
      resolveApplicantName({
        preferred_name: '',
        first_name: '',
        last_name: '',
        email: 'fallback@example.com',
      })
    ).toBe('fallback@example.com');
    expect(resolveApplicantName(null)).toBe('Unknown applicant');
  });

  it('computes descendant exclusions recursively', () => {
    const units: UnitRow[] = [
      {
        id: 'a',
        unit_number: 1,
        unit_name: 'A',
        subcamp: null,
        contingent: null,
        parent_unit_id: null,
        event_id: 'event-1',
        created_at: null,
        updated_at: null,
      },
      {
        id: 'b',
        unit_number: 2,
        unit_name: 'B',
        subcamp: null,
        contingent: null,
        parent_unit_id: 'a',
        event_id: 'event-1',
        created_at: null,
        updated_at: null,
      },
      {
        id: 'c',
        unit_number: 3,
        unit_name: 'C',
        subcamp: null,
        contingent: null,
        parent_unit_id: 'b',
        event_id: 'event-1',
        created_at: null,
        updated_at: null,
      },
    ];

    const excluded = computeDescendantIds(units, 'a');
    expect(excluded.has('a')).toBe(true);
    expect(excluded.has('b')).toBe(true);
    expect(excluded.has('c')).toBe(true);
  });

  it('normalises and validates preference ranks contiguously', () => {
    const unordered = [
      makePreference({ id: 'pref-1', rank: 3, session_id: 's1' }),
      makePreference({ id: 'pref-2', rank: 1, session_id: 's2' }),
      makePreference({ id: 'pref-3', rank: 2, session_id: 's3' }),
    ];
    const normalised = normalizePreferenceRanks(unordered);
    expect(normalised.map((row) => row.rank)).toEqual([1, 2, 3]);
    expect(arePreferenceRanksContiguous(normalised)).toBe(true);

    const moved = normalizePreferenceRanks(normalised, 'pref-3', 1);
    expect(moved[0]?.id).toBe('pref-3');
    expect(moved.map((row) => row.rank)).toEqual([1, 2, 3]);
  });

  it('detects duplicate sessions in preference rows', () => {
    expect(
      hasDuplicateSessionPreference([
        makePreference({ id: 'pref-1', session_id: 'session-1' }),
        makePreference({ id: 'pref-2', session_id: 'session-2' }),
      ])
    ).toBe(false);

    expect(
      hasDuplicateSessionPreference([
        makePreference({ id: 'pref-1', session_id: 'session-1' }),
        makePreference({ id: 'pref-2', session_id: 'session-1' }),
      ])
    ).toBe(true);
  });
});
