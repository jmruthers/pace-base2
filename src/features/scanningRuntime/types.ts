import type { ManifestContextType } from '@/features/scanningSetup/types';

export type QueueValidationResult = 'accepted' | 'rejected' | 'accepted_override';

export type QueueValidationReason =
  | 'card_not_recognised'
  | 'card_not_valid'
  | 'registration_not_valid'
  | 'booking_not_valid'
  | 'duplicate_scan';

export type QueueSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface ScanQueueEntry {
  local_id: string;
  scan_point_id: string;
  card_identifier: string | null;
  scanned_at: number;
  validation_result: QueueValidationResult;
  validation_reason: string | null;
  override_by: string | null;
  notes: string | null;
  device_id: string | null;
  sync_status: QueueSyncStatus;
  failure_reason?: string | null;
}

export interface ScanPointRecord {
  id: string;
  name: string;
  context_type: ManifestContextType;
  direction: string;
  resource_type: string | null;
  resource_id: string | null;
  is_active: boolean;
  event_id: string;
  organisation_id: string;
}

export type RuntimeRejectionReason = QueueValidationReason;

export interface ManualParticipantSearchRow {
  applicationId: string;
  personId: string;
  displayName: string;
}

export type ScanRuntimeResult =
  | {
      kind: 'accepted';
      participantName: string;
      scannedAt: number;
      cardIdentifier: string;
    }
  | {
      kind: 'rejected';
      participantName: string | null;
      scannedAt: number;
      cardIdentifier: string;
      reason: RuntimeRejectionReason;
    }
  | {
      kind: 'accepted_override';
      participantName: string;
      scannedAt: number;
      cardIdentifier: string | null;
    }
  | {
      kind: 'eligibility_read_error';
      message: string;
      scannedAt: number;
      cardIdentifier: string;
    };
