import { describe, expect, it, vi } from 'vitest';
import { createRbacAppIdResolver } from './rbacAppResolver';

describe('createRbacAppIdResolver', () => {
  it('resolves active app id for authenticated user', async () => {
    const rpc = vi.fn(async () => ({
      data: [
        { id: 'app-1', name: 'BASE', is_active: true },
        { id: 'app-2', name: 'TEAM', is_active: true },
      ],
      error: null,
    }));
    const resolveUserId = vi.fn(async () => 'user-1');
    const resolver = createRbacAppIdResolver({ rpc, resolveUserId });

    await expect(resolver('BASE')).resolves.toBe('app-1');
    expect(rpc).toHaveBeenCalledWith('data_rbac_apps_list', { p_user_id: 'user-1' });
  });

  it('returns null when user is missing during bootstrap', async () => {
    const reportDiagnostic = vi.fn();
    const resolver = createRbacAppIdResolver({
      rpc: vi.fn(async () => ({ data: [], error: null })),
      resolveUserId: vi.fn(async () => null),
      reportDiagnostic,
    });

    await expect(resolver('BASE')).resolves.toBeNull();
    expect(reportDiagnostic).not.toHaveBeenCalled();
  });

  it('returns null and reports diagnostics when app id cannot be found', async () => {
    const reportDiagnostic = vi.fn();
    const resolver = createRbacAppIdResolver({
      rpc: vi.fn(async () => ({
        data: [{ id: 'app-2', name: 'TEAM', is_active: true }],
        error: null,
      })),
      resolveUserId: vi.fn(async () => 'user-1'),
      reportDiagnostic,
    });

    await expect(resolver('BASE')).resolves.toBeNull();
    expect(reportDiagnostic).toHaveBeenCalledWith(
      'RBAC app id was not found for requested appName.',
      expect.objectContaining({ code: 'rbac-app-id-not-found', appName: 'BASE', userId: 'user-1' })
    );
  });

  it('returns null when RPC fails', async () => {
    const reportDiagnostic = vi.fn();
    const resolver = createRbacAppIdResolver({
      rpc: vi.fn(async () => ({ data: null, error: { message: 'boom' } })),
      resolveUserId: vi.fn(async () => 'user-1'),
      reportDiagnostic,
    });

    await expect(resolver('BASE')).resolves.toBeNull();
    expect(reportDiagnostic).toHaveBeenCalledWith(
      'Failed to fetch RBAC apps list for app id resolution.',
      expect.objectContaining({ code: 'rbac-app-id-list-fetch-failed', appName: 'BASE', userId: 'user-1' })
    );
  });
});
