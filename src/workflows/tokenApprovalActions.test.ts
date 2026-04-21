import { describe, expect, it, vi } from 'vitest';
import {
  resolveToken,
  submitTokenDecision,
  validateTokenDecisionInput,
} from './tokenApprovalActions';

describe('BA07 token approval action contracts', () => {
  it('requires comments for reject and allows optional comments for approve', () => {
    expect(
      validateTokenDecisionInput({
        decision: 'reject',
        comments: '   ',
      })
    ).toEqual({ ok: false, reason: 'reject_requires_comments' });

    expect(
      validateTokenDecisionInput({
        decision: 'approve',
        comments: '',
      })
    ).toEqual({ ok: true });
  });

  it('resolves token states through token-resolution contract', async () => {
    const rpcMock = vi.fn(async () => ({
      data: { state: 'valid', check_id: 'check-1' },
      error: null,
    }));

    const result = await resolveToken({ rpc: rpcMock }, 'token-abc');
    expect(result).toEqual({ state: 'valid', checkId: 'check-1' });
  });

  it('submits decision through backend-owned submit contract', async () => {
    const rpcMock = vi.fn(async () => ({ data: null, error: null }));
    const result = await submitTokenDecision(
      { rpc: rpcMock },
      {
        token: 'token-abc',
        decision: 'approve',
        comments: '',
      }
    );

    expect(result).toEqual({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith('app_base_application_update', {
      p_token: 'token-abc',
      p_decision: 'approve',
      p_comments: '',
    });
  });

  it('returns invalid_token when backend rejects token submission', async () => {
    const rpcMock = vi.fn(async () => ({ data: null, error: { message: 'expired' } }));
    const result = await submitTokenDecision(
      { rpc: rpcMock },
      {
        token: 'expired-token',
        decision: 'approve',
        comments: '',
      }
    );
    expect(result).toEqual({ ok: false, reason: 'invalid_token' });
  });
});
