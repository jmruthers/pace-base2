import { describe, expect, it } from 'vitest';
import {
  applicationStatusLabel,
  evidenceFieldLabel,
  getChecksSummary,
  renderJsonValue,
  resolveApplicantName,
  resolveSubmittedLabel,
  sortChecksByOrder,
} from './stateHelpers';
import type { ApplicationQueueRow } from './types';

function makeRow(overrides?: Partial<ApplicationQueueRow>): ApplicationQueueRow {
  return {
    id: 'application-1',
    event_id: 'event-1',
    person_id: 'person-1',
    status: 'submitted',
    submitted_at: '2026-05-01T00:00:00.000Z',
    created_at: '2026-04-30T00:00:00.000Z',
    registration_type_id: 'type-1',
    person: {
      preferred_name: 'Alex',
      first_name: 'Alexander',
      last_name: 'Smith',
      email: 'alex@example.com',
    },
    registration_type: {
      id: 'type-1',
      name: 'Leader',
    },
    checks: [],
    ...overrides,
  };
}

describe('applicationsAdmin stateHelpers', () => {
  it('resolves applicant name from preferred name then last name', () => {
    const row = makeRow();
    expect(resolveApplicantName(row)).toBe('Alex Smith');
  });

  it('falls back to email when names are empty', () => {
    const row = makeRow({
      person: {
        preferred_name: '',
        first_name: '',
        last_name: '',
        email: 'person@example.com',
      },
    });
    expect(resolveApplicantName(row)).toBe('person@example.com');
  });

  it('falls back to unknown applicant when names and email are empty', () => {
    const row = makeRow({
      person: {
        preferred_name: '',
        first_name: '',
        last_name: '',
        email: '',
      },
    });
    expect(resolveApplicantName(row)).toBe('Unknown applicant');
  });

  it('uses submitted timestamp first, then created timestamp, then fallback text', () => {
    const submitted = makeRow();
    expect(resolveSubmittedLabel(submitted)).toContain('2026');

    const created = makeRow({ submitted_at: null, created_at: '2026-04-02T10:00:00.000Z' });
    expect(resolveSubmittedLabel(created)).toContain('2026');

    const none = makeRow({ submitted_at: null, created_at: null });
    expect(resolveSubmittedLabel(none)).toBe('Not submitted');
  });

  it('maps application status labels', () => {
    expect(applicationStatusLabel('submitted')).toBe('Submitted');
    expect(applicationStatusLabel('under_review')).toBe('Under review');
    expect(applicationStatusLabel('approved')).toBe('Approved');
    expect(applicationStatusLabel('rejected')).toBe('Rejected');
  });

  it('calculates check summary priority', () => {
    expect(getChecksSummary([])).toBeNull();
    expect(getChecksSummary([{ id: '1', status: 'failed', requirement_id: null, token_expires_at: null, actioned_at: null, notes: null, requirement: null }])).toEqual({
      label: '1 failed',
      variant: 'solid-acc-strong',
    });
    expect(getChecksSummary([{ id: '1', status: 'pending', requirement_id: null, token_expires_at: null, actioned_at: null, notes: null, requirement: null }])).toEqual({
      label: '1 pending',
      variant: 'soft-sec-normal',
    });
    expect(getChecksSummary([{ id: '1', status: 'satisfied', requirement_id: null, token_expires_at: null, actioned_at: null, notes: null, requirement: null }])).toEqual({
      label: 'All satisfied',
      variant: 'solid-main-normal',
    });
    expect(getChecksSummary([{ id: '1', status: 'waived', requirement_id: null, token_expires_at: null, actioned_at: null, notes: null, requirement: null }])).toEqual({
      label: 'All satisfied',
      variant: 'solid-main-normal',
    });
  });

  it('sorts checks by requirement sort order with nulls last', () => {
    const sorted = sortChecksByOrder([
      { id: 'c3', status: 'pending', requirement_id: 'r3', token_expires_at: null, actioned_at: null, notes: null, requirement: { check_type: 'payment', sort_order: null, is_automated: null, config: null } },
      { id: 'c2', status: 'pending', requirement_id: 'r2', token_expires_at: null, actioned_at: null, notes: null, requirement: { check_type: 'payment', sort_order: 2, is_automated: null, config: null } },
      { id: 'c1', status: 'pending', requirement_id: 'r1', token_expires_at: null, actioned_at: null, notes: null, requirement: { check_type: 'payment', sort_order: 1, is_automated: null, config: null } },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('renders JSON values per BA06 display rules', () => {
    expect(renderJsonValue('value')).toBe('value');
    expect(renderJsonValue(12)).toBe('12');
    expect(renderJsonValue(['a', 'b'])).toBe('a, b');
    expect(renderJsonValue({ guardianName: 'Kim' })).toEqual({ 'Guardian Name': 'Kim' });
    expect(renderJsonValue([{ name: 'Kim' }, { role: 'Guardian' }])).toBe('Name: Kim, Role: Guardian');
    expect(
      renderJsonValue({
        guardianDetails: {
          fullName: 'Kim Example',
          contactMethods: ['Email', 'SMS'],
        },
      })
    ).toEqual({
      'Guardian Details': 'Full Name: Kim Example, Contact Methods: Email, SMS',
    });
    expect(renderJsonValue(null)).toBeNull();
  });

  it('prefers field label then field key for evidence labels', () => {
    expect(
      evidenceFieldLabel({
        field_key: 'guardian_name',
        form_field_id: 'field-1',
        value_text: 'Kim',
        value_json: null,
        field: { id: 'field-1', label: 'Guardian Name', field_key: 'guardian_name' },
      })
    ).toBe('Guardian Name');

    expect(
      evidenceFieldLabel({
        field_key: 'guardian_name',
        form_field_id: null,
        value_text: 'Kim',
        value_json: null,
        field: null,
      })
    ).toBe('guardian_name');
  });
});
