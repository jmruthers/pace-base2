import type { EventStub } from '@solvera/pace-core/types';
import { LANDING_DEFAULT_TILE_COUNT } from '@solvera/pace-core/events';

export { orderEventsForShellLanding } from '@solvera/pace-core/events';
export const SHELL_LANDING_DEFAULT_TILE_COUNT = LANDING_DEFAULT_TILE_COUNT;

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
