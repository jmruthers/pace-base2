import type { ApiResult } from './apiResult';

export type QueueState =
  | 'pending_upload'
  | 'uploaded'
  | 'upload_failed'
  | 'upload_conflict';

export interface QueuedScanEvent {
  id: string;
  scanPointId: string;
  validationResult: 'accepted' | 'accepted_override' | 'rejected' | 'upload_conflict';
  validationReason:
    | 'card_not_recognised'
    | 'card_not_valid'
    | 'registration_not_valid'
    | 'booking_not_valid'
    | 'duplicate_scan'
    | null;
  state: QueueState;
}

interface RpcClient {
  rpc: (
    name: string,
    payload: Record<string, unknown>
  ) => Promise<{ error: { message: string } | null }>;
}

export async function uploadQueuedScan(
  client: RpcClient,
  queueItem: QueuedScanEvent
): Promise<ApiResult<QueuedScanEvent>> {
  const { error } = await client.rpc('app_base_scan_event_upload', {
    p_event_id: queueItem.id,
    p_scan_point_id: queueItem.scanPointId,
    p_validation_result: queueItem.validationResult,
    p_validation_reason: queueItem.validationReason,
  });
  if (error == null) {
    return {
      ok: true,
      data: { ...queueItem, state: 'uploaded' },
    };
  }

  if (error.message.includes('conflict')) {
    return {
      ok: false,
      error: {
        code: 'upload_conflict',
        message: error.message,
        details: {
          queueItem: {
            ...queueItem,
            state: 'upload_conflict',
            validationResult: 'upload_conflict',
          },
        },
      },
    };
  }

  return {
    ok: false,
    error: {
      code: 'upload_failed',
      message: error.message,
      details: {
        queueItem: { ...queueItem, state: 'upload_failed' },
      },
    },
  };
}

export function markPendingUpload(queueItem: Omit<QueuedScanEvent, 'state'>): QueuedScanEvent {
  return { ...queueItem, state: 'pending_upload' };
}
