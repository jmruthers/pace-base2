import { describe, expect, it } from 'vitest';
import {
  BASE_SYSTEM_KEYS,
  COMMUNICATION_STATUS_OPTIONS,
} from './constants';

describe('communications constants', () => {
  it('exports the six BA17 system keys', () => {
    expect(BASE_SYSTEM_KEYS).toEqual({
      GUARDIAN_REQUEST_ISSUED: 'base.guardian_request_issued',
      GUARDIAN_REQUEST_REISSUED: 'base.guardian_request_reissued',
      REFEREE_REQUEST_ISSUED: 'base.referee_request_issued',
      REFEREE_REQUEST_REISSUED: 'base.referee_request_reissued',
      APPLICATION_APPROVED: 'base.application_approved',
      APPLICATION_REJECTED: 'base.application_rejected',
    });
  });

  it('uses canonical status filter options', () => {
    expect(COMMUNICATION_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      'submitted',
      'under_review',
      'approved',
      'rejected',
      'withdrawn',
    ]);
  });
});
