import { describe, expect, it } from 'vitest';
import {
  getContextAwareShellNavigationItems,
  getLegacyShellNavigationItemLabels,
} from './shellNavigation';

describe('shellNavigation', () => {
  it('returns landing nav when no event is selected', () => {
    const items = getContextAwareShellNavigationItems(null);
    expect(items.map((item) => item.label)).toEqual(['Events']);
    expect(items[0]?.href).toBe('/');
  });

  it('returns in-event nav when an event is selected', () => {
    const items = getContextAwareShellNavigationItems('event-1');
    expect(items.map((item) => item.label)).toEqual(getLegacyShellNavigationItemLabels());
    expect(items.map((item) => item.href)).toEqual([
      '/event-dashboard',
      '/applications',
      '/communications',
      '/reports',
    ]);
  });
});
