import { describe, expect, it } from 'vitest';
import { orderEventsForShellLanding } from './shellLandingHelpers';

describe('shellLandingHelpers', () => {
  it('orders upcoming events before past events', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setUTCDate(future.getUTCDate() + 10);
    const past = new Date(today);
    past.setUTCDate(past.getUTCDate() - 10);

    const ordered = orderEventsForShellLanding([
      { id: 'past', event_date: past.toISOString() },
      { id: 'future', event_date: future.toISOString() },
    ]);

    expect(ordered.map((event) => event.id)).toEqual(['future', 'past']);
  });
});
