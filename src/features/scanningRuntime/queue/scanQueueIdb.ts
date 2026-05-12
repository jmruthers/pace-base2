import type { ApiResult } from '@solvera/pace-core/types';
import { createErrorResult, isOk, normalizeToApiError, ok } from '@solvera/pace-core/types';
import type { ScanQueueEntry } from '../types';

export const DEDUP_WINDOW_MS = 3_600_000;

const DB_NAME = 'ba13_scan_queue';
const DB_VERSION = 1;
const STORE = 'scan_events';

export async function openScanQueueDb(): Promise<ApiResult<IDBDatabase>> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(STORE)) {
          const os = database.createObjectStore(STORE, { keyPath: 'local_id' });
          os.createIndex('by_scan_point', ['scan_point_id', 'sync_status'], { unique: false });
          os.createIndex('by_card_at_point', ['scan_point_id', 'card_identifier', 'scanned_at'], {
            unique: false,
          });
        }
      };
      req.onsuccess = () => resolve(req.result);
    });
    return ok(db);
  } catch (error: unknown) {
    const apiErr = normalizeToApiError(error, 'idb_open', 'IndexedDB open failed');
    return createErrorResult(apiErr.code, apiErr.message, apiErr.details);
  }
}

export async function putScanQueueEntry(entry: ScanQueueEntry): Promise<ApiResult<void>> {
  const dbResult = await openScanQueueDb();
  if (!isOk(dbResult)) {
    return createErrorResult(dbResult.error.code, dbResult.error.message, dbResult.error.details);
  }
  const db = dbResult.data;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
      tx.objectStore(STORE).put(entry);
    });
    return ok(undefined);
  } catch (error: unknown) {
    const apiErr = normalizeToApiError(error, 'idb_put', 'IndexedDB write failed');
    return createErrorResult(apiErr.code, apiErr.message, apiErr.details);
  } finally {
    db.close();
  }
}

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
  };
}
