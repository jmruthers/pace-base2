import type { ScanContextType, ScanDirection, ScanEventRow } from './types';

export interface ScanConflictRow extends ScanEventRow {
  scan_point_name: string;
  card_identifier: string | null;
}

export interface ScanHistoryRow extends ScanEventRow {
  scan_point_name: string;
  card_identifier: string | null;
  participant_name: string | null;
}

export interface ScanResourceOption {
  id: string;
  label: string;
}

export interface ScanPointMutationInput {
  name: string;
  context_type: ScanContextType;
  direction: ScanDirection;
  resource_id: string | null;
  eventId: string;
  organisationId: string;
  userId: string | null;
}

export interface ManifestRow {
  card_identifier: string;
  person_id: string;
  name: string;
}

export type ManifestContextType = ScanContextType;
