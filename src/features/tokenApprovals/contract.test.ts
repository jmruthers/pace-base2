import { describe, expect, it } from 'vitest';
import {
  BA07_TOKEN_ERROR_MESSAGES,
  parseReissueTokenPayload,
  parseResolveTokenPayload,
  parseSubmitTokenPayload,
} from './contract';

describe('BA07 token approval contracts', () => {
  it('keeps expected token error message contract', () => {
    expect(BA07_TOKEN_ERROR_MESSAGES).toEqual({
      tokenRequired: 'Token is required',
      invalidOrExpiredResolve: 'Invalid or expired token',
      invalidExpiredOrUsedSubmit: 'Invalid, expired, or already used token',
      invalidOutcome: 'Outcome must be approve or reject',
      commentsRequiredForReject: 'Comments are required for reject',
    });
  });

  it('parses resolve payload with exact key allow-list', () => {
    expect(
      parseResolveTokenPayload({
        check_id: 'check-1',
        application_id: 'app-1',
        requirement_id: 'req-1',
        expires_at: '2026-05-15T10:30:00Z',
        check_type: 'guardian_approval',
        event_title: 'Camp Bravo',
        registration_type_name: 'Camper',
        applicant_display_name: 'Alex Smith',
      })
    ).toEqual({
      check_id: 'check-1',
      application_id: 'app-1',
      requirement_id: 'req-1',
      expires_at: '2026-05-15T10:30:00Z',
      check_type: 'guardian_approval',
      event_title: 'Camp Bravo',
      registration_type_name: 'Camper',
      applicant_display_name: 'Alex Smith',
    });

    expect(() =>
      parseResolveTokenPayload({
        check_id: 'check-1',
        application_id: 'app-1',
        requirement_id: 'req-1',
        expires_at: null,
        check_type: 'guardian_approval',
        event_title: 'Camp Bravo',
        registration_type_name: 'Camper',
        applicant_display_name: 'Alex Smith',
        token_hash: 'forbidden',
      })
    ).toThrow(/Expected keys/);
  });

  it('parses submit payload with exact key allow-list', () => {
    expect(
      parseSubmitTokenPayload({
        check_id: 'check-1',
        previous_status: 'pending',
        new_status: 'satisfied',
      })
    ).toEqual({
      check_id: 'check-1',
      previous_status: 'pending',
      new_status: 'satisfied',
    });

    expect(() =>
      parseSubmitTokenPayload({
        check_id: 'check-1',
        previous_status: 'pending',
      })
    ).toThrow(/Expected keys/);
  });

  it('parses reissue payload with exact key allow-list', () => {
    expect(
      parseReissueTokenPayload({
        check_id: 'check-1',
        token: 'raw-token',
        token_expires_at: '2026-05-15T10:30:00Z',
      })
    ).toEqual({
      check_id: 'check-1',
      token: 'raw-token',
      token_expires_at: '2026-05-15T10:30:00Z',
    });

    expect(() =>
      parseReissueTokenPayload({
        check_id: 'check-1',
        token: 'raw-token',
        token_expires_at: '2026-05-15T10:30:00Z',
        extra: 'not-allowed',
      })
    ).toThrow(/Expected keys/);
  });
});
