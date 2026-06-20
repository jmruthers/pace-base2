import type { EventStub } from '@solvera/pace-core/types';

export const SHELL_LANDING_DEFAULT_TILE_COUNT = 4;

export function readEventString(event: EventStub, keys: ReadonlyArray<string>): string | null {
  for (const key of keys) {
    const value = event[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function readEventNumber(event: EventStub, keys: ReadonlyArray<string>): number | null {
  for (const key of keys) {
    const value = event[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function eventDisplayName(event: EventStub): string {
  return readEventString(event, ['event_name', 'name']) ?? 'Event';
}

export function eventStartTimestamp(event: EventStub): number | null {
  const dateValue = readEventString(event, ['event_date', 'date']);
  if (dateValue == null) {
    return null;
  }
  const parsed = new Date(dateValue).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function orderEventsForShellLanding(events: ReadonlyArray<EventStub>): EventStub[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = today.getTime();

  const upcoming: EventStub[] = [];
  const past: EventStub[] = [];

  for (const event of events) {
    const timestamp = eventStartTimestamp(event);
    if (timestamp == null || timestamp >= cutoff) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  }

  upcoming.sort((left, right) => {
    const leftTs = eventStartTimestamp(left) ?? Number.MAX_SAFE_INTEGER;
    const rightTs = eventStartTimestamp(right) ?? Number.MAX_SAFE_INTEGER;
    return leftTs - rightTs;
  });

  past.sort((left, right) => {
    const leftTs = eventStartTimestamp(left) ?? 0;
    const rightTs = eventStartTimestamp(right) ?? 0;
    return rightTs - leftTs;
  });

  return [...upcoming, ...past];
}
