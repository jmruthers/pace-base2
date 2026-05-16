import { describe, expect, it, vi } from 'vitest';
import { buildStrictRbacSetupOptions } from './rbacSetup';

describe('buildStrictRbacSetupOptions', () => {
  it('fails when appName is non-canonical', () => {
    const getAppId = vi.fn(async () => null);
    const nonCanonicalAppName = 'BASE'.toLowerCase();

    expect(() =>
      buildStrictRbacSetupOptions({
        appName: nonCanonicalAppName,
        getAppId,
      })
    ).toThrow('APP_NAME must be canonical uppercase');
  });

  it('fails when getAppId is missing', () => {
    expect(() =>
      buildStrictRbacSetupOptions({
        appName: 'BASE',
      })
    ).toThrow('setupRBAC strict contract requires getAppId.');
  });

  it('succeeds with uppercase appName and getAppId', async () => {
    const getAppId = vi.fn(async () => 'app-1');
    const options = buildStrictRbacSetupOptions({
      appName: 'BASE',
      getAppId,
    });

    expect(options.appName).toBe('BASE');
    await expect(options.getAppId('BASE')).resolves.toBe('app-1');
  });
});
