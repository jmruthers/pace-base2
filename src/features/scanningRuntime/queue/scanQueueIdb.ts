import type { ApiResult } from '@solvera/pace-core/types';
import { createErrorResult, isOk, normalizeToApiError, ok } from '@solvera/pace-core/types';
import type { QueueSyncStatus, ScanQueueEntry } from '../types';

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

export async function getScanQueueEntry(localId: string): Promise<ApiResult<ScanQueueEntry | null>> {
  const dbResult = await openScanQueueDb();
  if (!isOk(dbResult)) {
    return createErrorResult(dbResult.error.code, dbResult.error.message, dbResult.error.details);
  }
  const db = dbResult.data;
  try {
    const row = await new Promise<ScanQueueEntry | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(localId);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
      req.onsuccess = () => resolve((req.result as ScanQueueEntry | undefined) ?? null);
    });
    return ok(row);
  } catch (error: unknown) {
    const apiErr = normalizeToApiError(error, 'idb_get', 'IndexedDB read failed');
    return createErrorResult(apiErr.code, apiErr.message, apiErr.details);
  } finally {
    db.close();
  }
}

export async function listScanQueueEntries(): Promise<ApiResult<ScanQueueEntry[]>> {
  const dbResult = await openScanQueueDb();
  if (!isOk(dbResult)) {
    return createErrorResult(dbResult.error.code, dbResult.error.message, dbResult.error.details);
  }
  const db = dbResult.data;
  try {
    const rows = await new Promise<ScanQueueEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      const result: ScanQueueEntry[] = [];
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(result);
          return;
        }
        result.push(cursor.value as ScanQueueEntry);
        cursor.continue();
      };
    });
    return ok(rows);
  } catch (error: unknown) {
    const apiErr = normalizeToApiError(error, 'idb_list', 'IndexedDB read failed');
    return createErrorResult(apiErr.code, apiErr.message, apiErr.details);
  } finally {
    db.close();
  }
}

export async function listScanQueueEntriesByStatus(
  statuses: QueueSyncStatus[]
): Promise<ApiResult<ScanQueueEntry[]>> {
  const listResult = await listScanQueueEntries();
  if (!isOk(listResult)) {
    return createErrorResult(listResult.error.code, listResult.error.message, listResult.error.details);
  }
  const wanted = new Set(statuses);
  return ok(listResult.data.filter((row) => wanted.has(row.sync_status)));
}

export async function updateScanQueueEntrySyncStatus(params: {
  localId: string;
  syncStatus: QueueSyncStatus;
  failureReason?: string | null;
}): Promise<ApiResult<ScanQueueEntry | null>> {
  const dbResult = await openScanQueueDb();
  if (!isOk(dbResult)) {
    return createErrorResult(dbResult.error.code, dbResult.error.message, dbResult.error.details);
  }
  const db = dbResult.data;
  try {
    const updated = await new Promise<ScanQueueEntry | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB update failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
      const store = tx.objectStore(STORE);
      const getReq = store.get(params.localId);
      getReq.onerror = () => reject(getReq.error ?? new Error('IndexedDB read failed'));
      getReq.onsuccess = () => {
        const current = (getReq.result as ScanQueueEntry | undefined) ?? null;
        if (current == null) {
          resolve(null);
          return;
        }
        const next: ScanQueueEntry = {
          ...current,
          sync_status: params.syncStatus,
          failure_reason:
            params.syncStatus === 'failed' ? (params.failureReason ?? current.failure_reason ?? null) : null,
        };
        const putReq = store.put(next);
        putReq.onerror = () => reject(putReq.error ?? new Error('IndexedDB write failed'));
        putReq.onsuccess = () => resolve(next);
      };
    });
    return ok(updated);
  } catch (error: unknown) {
    const apiErr = normalizeToApiError(error, 'idb_status_update', 'IndexedDB write failed');
    return createErrorResult(apiErr.code, apiErr.message, apiErr.details);
  } finally {
    db.close();
  }
}

export async function resetSyncingEntriesToPending(): Promise<ApiResult<number>> {
  const dbResult = await openScanQueueDb();
  if (!isOk(dbResult)) {
    return createErrorResult(dbResult.error.code, dbResult.error.message, dbResult.error.details);
  }
  const db = dbResult.data;
  try {
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB update failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
      const req = tx.objectStore(STORE).openCursor();
      let updated = 0;
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(updated);
          return;
        }
        const entry = cursor.value as ScanQueueEntry;
        if (entry.sync_status === 'syncing') {
          const next: ScanQueueEntry = { ...entry, sync_status: 'pending' };
          delete (next as { failure_reason?: string | null }).failure_reason;
          cursor.update(next);
          updated += 1;
        }
        cursor.continue();
      };
    });
    return ok(count);
  } catch (error: unknown) {
    const apiErr = normalizeToApiError(error, 'idb_sync_reset', 'IndexedDB write failed');
    return createErrorResult(apiErr.code, apiErr.message, apiErr.details);
  } finally {
    db.close();
  }
}
