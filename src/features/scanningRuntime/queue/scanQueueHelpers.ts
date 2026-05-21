import type { ApiResult } from '@solvera/pace-core/types';
import { createErrorResult, isOk, normalizeToApiError, ok } from '@solvera/pace-core/types';
import type { ScanQueueEntry } from '../types';

import { openScanQueueDb } from './scanQueueIdb';

/** Must match ObjectStore created in scanQueueIdb */
const STORE = 'scan_events';

export const DEDUP_WINDOW_MS = 3_600_000;

export async function hasRecentAcceptAtPoint(
  scanPointId: string,
  cardIdentifier: string,
  now: number,
  dedupWindowMs: number
): Promise<ApiResult<boolean>> {
  const dbResult = await openScanQueueDb();
  if (!isOk(dbResult)) {
    return createErrorResult(dbResult.error.code, dbResult.error.message, dbResult.error.details);
  }
  const db = dbResult.data;
  try {
    const lower = now - dedupWindowMs;
    const range = IDBKeyRange.bound(
      [scanPointId, cardIdentifier, lower],
      [scanPointId, cardIdentifier, now],
      true,
      false
    );
    const found = await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const index = tx.objectStore(STORE).index('by_card_at_point');
      const req = index.openCursor(range);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(false);
          return;
        }
        const entry = cursor.value as ScanQueueEntry;
        if (entry.validation_result === 'accepted' || entry.validation_result === 'accepted_override') {
          resolve(true);
          return;
        }
        cursor.continue();
      };
    });
    return ok(found);
  } catch (error: unknown) {
    const apiErr = normalizeToApiError(error, 'idb_dedup', 'IndexedDB read failed');
    return createErrorResult(apiErr.code, apiErr.message, apiErr.details);
  } finally {
    db.close();
  }
}

export function getOrCreateSessionDeviceId(): string {
  if (typeof sessionStorage === 'undefined') {
    return crypto.randomUUID();
  }
  let id = sessionStorage.getItem('ba13_device_id');
  if (id == null || id.length === 0) {
    id = crypto.randomUUID();
    sessionStorage.setItem('ba13_device_id', id);
  }
  return id;
}

export function buildQueueEntry(params: {
  scanPointId: string;
  cardIdentifier: string | null;
  scannedAt: number;
  validationResult: ScanQueueEntry['validation_result'];
  validationReason: string | null;
  overrideBy: string | null;
  notes: string | null;
}): ScanQueueEntry {
  return {
    local_id: crypto.randomUUID(),
    scan_point_id: params.scanPointId,
    card_identifier: params.cardIdentifier,
    scanned_at: params.scannedAt,
    validation_result: params.validationResult,
    validation_reason: params.validationReason,
    override_by: params.overrideBy,
    notes: params.notes,
    device_id: getOrCreateSessionDeviceId(),
    sync_status: 'pending',
    failure_reason: null,
  };
}
