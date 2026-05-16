import { isCanonicalAppName } from '@/config/appName';

interface BuildStrictRbacSetupOptionsParams {
  appName: string;
  getAppId?: (normalizedAppName: string) => Promise<string | null>;
}

export interface StrictRbacSetupOptions {
  appName: string;
  getAppId: (normalizedAppName: string) => Promise<string | null>;
}

export function buildStrictRbacSetupOptions({
  appName,
  getAppId,
}: BuildStrictRbacSetupOptionsParams): StrictRbacSetupOptions {
  if (!isCanonicalAppName(appName)) {
    throw new Error('APP_NAME must be canonical uppercase with no leading/trailing whitespace.');
  }
  if (typeof getAppId !== 'function') {
    throw new Error('setupRBAC strict contract requires getAppId.');
  }
  return {
    appName,
    getAppId,
  };
}
