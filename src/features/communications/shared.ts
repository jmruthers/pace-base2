import type { EventParticipantsPool } from '@solvera/pace-core/comms';
import type { CommunicationStatusFilter } from './constants';

export interface CommunicationFilters {
  registrationTypeIds: string[];
  statuses: CommunicationStatusFilter[];
  unitIds: string[];
}

export const EMPTY_COMMUNICATION_FILTERS: CommunicationFilters = {
  registrationTypeIds: [],
  statuses: [],
  unitIds: [],
};

export function hasActiveCommunicationFilters(filters: CommunicationFilters): boolean {
  return (
    filters.registrationTypeIds.length > 0 || filters.statuses.length > 0 || filters.unitIds.length > 0
  );
}

export function buildEventParticipantsPool(
  eventId: string,
  filters: CommunicationFilters
): EventParticipantsPool {
  return {
    type: 'event_participants',
    event_id: eventId,
    filters: {
      registration_type_ids:
        filters.registrationTypeIds.length > 0 ? filters.registrationTypeIds : undefined,
      status: filters.statuses.length > 0 ? filters.statuses : undefined,
      unit_ids: filters.unitIds.length > 0 ? filters.unitIds : undefined,
    },
  };
}
