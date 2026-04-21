import { describe, expect, it, vi } from 'vitest';
import { markPendingUpload, uploadQueuedScan } from './scanningSyncQueue';

describe('BA14 scanning sync and reconciliation contract', () => {
  it('creates pending queue entries with client-generated ids', () => {
    const queueItem = markPendingUpload({
      id: 'client-generated-id-1',
      scanPointId: 'scan-point-1',
      validationResult: 'accepted',
      validationReason: null,
    });
    expect(queueItem.state).toBe('pending_upload');
    expect(queueItem.id).toBe('client-generated-id-1');
  });

  it('marks uploaded when ingest call succeeds', async () => {
    const rpcMock = vi.fn(async () => ({ error: null }));
    const queueItem = markPendingUpload({
      id: 'client-generated-id-1',
      scanPointId: 'scan-point-1',
      validationResult: 'accepted',
      validationReason: null,
    });

    const result = await uploadQueuedScan({ rpc: rpcMock }, queueItem);
    expect(result.state).toBe('uploaded');
    expect(rpcMock).toHaveBeenCalledWith('app_base_scan_event_upload', {
      p_event_id: 'client-generated-id-1',
      p_scan_point_id: 'scan-point-1',
      p_validation_result: 'accepted',
      p_validation_reason: null,
    });
  });

  it('marks conflict and preserves original reason class when conflict returned', async () => {
    const rpcMock = vi.fn(async () => ({ error: { message: 'upload conflict detected' } }));
    const queueItem = markPendingUpload({
      id: 'client-generated-id-2',
      scanPointId: 'scan-point-1',
      validationResult: 'rejected',
      validationReason: 'duplicate_scan',
    });

    const result = await uploadQueuedScan({ rpc: rpcMock }, queueItem);
    expect(result.state).toBe('upload_conflict');
    expect(result.validationResult).toBe('upload_conflict');
    expect(result.validationReason).toBe('duplicate_scan');
  });
});
