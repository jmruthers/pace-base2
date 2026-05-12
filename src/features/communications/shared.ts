import type { EventParticipantsPool, ManualPool, RecipientPoolDescriptor } from '@solvera/pace-core/comms';
import type { CommunicationStatusFilter } from './constants';

export interface CommunicationFilters {
  registrationTypeIds: string[];
  statuses: CommunicationStatusFilter[];
  unitIds: string[];
}

export type CommunicationPoolMode = 'event_participants' | 'specific_participants';

export const EMPTY_COMMUNICATION_FILTERS: CommunicationFilters = {
  registrationTypeIds: [],
  statuses: [],
  unitIds: [],
};

export const DEFAULT_COMMUNICATION_POOL_MODE: CommunicationPoolMode = 'event_participants';

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

export function buildManualPool(memberIds: string[]): ManualPool {
  return {
    type: 'manual',
    member_ids: memberIds,
  };
}

export function buildRecipientPool(
  eventId: string,
  mode: CommunicationPoolMode,
  filters: CommunicationFilters,
  memberIds: string[]
): RecipientPoolDescriptor {
  if (mode === 'specific_participants') {
    return buildManualPool(memberIds);
  }

  return buildEventParticipantsPool(eventId, filters);
}
