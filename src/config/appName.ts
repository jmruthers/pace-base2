export const APP_NAME = 'BASE';

export function isCanonicalAppName(appName: string): boolean {
  return appName.length > 0 && appName.trim() === appName && appName === appName.toUpperCase();
}
