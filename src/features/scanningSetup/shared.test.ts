import { describe, expect, it } from 'vitest';
import {
  clearResourceOnContextChange,
  deriveParticipantName,
  getDirectionBadge,
  getOfflineBadge,
  getResultBadge,
  getStatusBadge,
  validateScanPoint,
} from './shared';

describe('BA12 shared mapping helpers', () => {
  it('maps all direction badge values', () => {
    expect(getDirectionBadge('in')).toEqual({ label: 'In', variant: 'solid-sec-muted' });
    expect(getDirectionBadge('out')).toEqual({ label: 'Out', variant: 'solid-sec-muted' });
    expect(getDirectionBadge('both')).toEqual({ label: 'Both', variant: 'solid-sec-muted' });
    expect(getDirectionBadge('neutral')).toEqual({ label: 'Neutral', variant: 'solid-sec-muted' });
  });

  it('maps status badges and always exposes offline indicator', () => {
    expect(getStatusBadge(true)).toEqual({ label: 'Active', variant: 'solid-main-normal' });
    expect(getStatusBadge(false)).toEqual({ label: 'Inactive', variant: 'solid-sec-muted' });
    expect(getOfflineBadge('site')).toEqual({ label: 'Offline', variant: 'solid-acc-normal' });
    expect(getOfflineBadge('activity')).toEqual({ label: 'Offline', variant: 'solid-acc-normal' });
    expect(getOfflineBadge('transport')).toEqual({ label: 'Offline', variant: 'solid-acc-normal' });
    expect(getOfflineBadge('meal')).toEqual({ label: 'Offline', variant: 'solid-acc-normal' });
  });

  it('maps result badge variants', () => {
    expect(getResultBadge('accepted')).toEqual({ label: 'Accepted', variant: 'solid-main-normal' });
    expect(getResultBadge('rejected')).toEqual({ label: 'Rejected', variant: 'solid-sec-muted' });
    expect(getResultBadge('upload_conflict')).toEqual({ label: 'Conflict', variant: 'outline-acc-muted' });
  });

  it('derives participant name with preferred-name fallback chain', () => {
    expect(
      deriveParticipantName({
        preferred_name: 'Sam',
        first_name: 'Samuel',
        last_name: 'Example',
      })
    ).toBe('Sam');
    expect(
      deriveParticipantName({
        preferred_name: '',
        first_name: 'Samuel',
        last_name: 'Example',
      })
    ).toBe('Samuel Example');
    expect(
      deriveParticipantName({
        preferred_name: null,
        first_name: null,
        last_name: null,
      })
    ).toBeNull();
  });

  it('clears resource when context changes in form state', () => {
    const unchanged = clearResourceOnContextChange(
      {
        name: 'Gate',
        context_type: 'activity',
        direction: 'in',
        resource_id: 'session-1',
      },
      'activity'
    );
    expect(unchanged.resource_id).toBe('session-1');

    const changed = clearResourceOnContextChange(
      {
        name: 'Gate',
        context_type: 'activity',
        direction: 'in',
        resource_id: 'session-1',
      },
      'site'
    );
    expect(changed.resource_id).toBeNull();
  });

  it('rejects scan point name longer than 100 characters', () => {
    const tooLong = `${'a'.repeat(101)}`;
    expect(
      validateScanPoint({
        name: tooLong,
        context_type: 'site',
        direction: 'neutral',
        resource_id: null,
      }).name
    ).toBe('Name must be 100 characters or fewer.');
  });
});
