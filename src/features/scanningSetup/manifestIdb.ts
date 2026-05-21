import type { ApiResult } from '@solvera/pace-core/types';
import { createErrorResult, isOk, normalizeToApiError, ok } from '@solvera/pace-core/types';
import type { ManifestContextType, ManifestRow } from './scanEventTypes';

const DB_NAME = 'ba12_manifests';
const DB_VERSION = 1;
const STORE = 'manifests';

export type ManifestRecord = {
  event_id: string;
  manifest_type: ManifestContextType;
  rows: ManifestRow[];
  stored_at: number;
};

function manifestKey(eventId: string, manifestType: ManifestContextType): string {
  return `${eventId}::${manifestType}`;
}

async function openDb(): Promise<ApiResult<IDBDatabase>> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => {
        reject(req.error ?? new Error('IndexedDB open failed'));
      };
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        resolve(req.result);
      };
    });
    return ok(db);
  } catch (error: unknown) {
    const apiErr = normalizeToApiError(error, 'idb_open', 'IndexedDB open failed');
    return createErrorResult(apiErr.code, apiErr.message, apiErr.details);
  }
}

type StoredManifestRow = ManifestRecord & { id: string };

export async function persistManifestToIdb(params: {
  eventId: string;
  manifestType: ManifestContextType;
  rows: ManifestRow[];
}): Promise<ApiResult<void>> {
  const dbResult = await openDb();
  if (!isOk(dbResult)) {
    return createErrorResult(dbResult.error.code, dbResult.error.message, dbResult.error.details);
  }
  const db = dbResult.data;
  try {
    const row: StoredManifestRow = {
      id: manifestKey(params.eventId, params.manifestType),
      event_id: params.eventId,
      manifest_type: params.manifestType,
      rows: params.rows,
      stored_at: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.objectStore(STORE).put(row);
    });
    return ok(undefined);
  } catch (error: unknown) {
    const apiErr = normalizeToApiError(error, 'idb_put', 'IndexedDB write failed');
    return createErrorResult(apiErr.code, apiErr.message, apiErr.details);
  } finally {
    db.close();
  }
}

export async function readManifestFromIdb(
  eventId: string,
  manifestType: ManifestContextType
): Promise<ApiResult<ManifestRow[] | null>> {
  const dbResult = await openDb();
  if (!isOk(dbResult)) {
    return createErrorResult(dbResult.error.code, dbResult.error.message, dbResult.error.details);
  }
  const db = dbResult.data;
  try {
    const id = manifestKey(eventId, manifestType);
    const record = await new Promise<StoredManifestRow | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result as StoredManifestRow | undefined);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB get failed'));
    });
    if (record == null) {
      return ok(null);
    }
    return ok(record.rows);
  } catch (error: unknown) {
    const apiErr = normalizeToApiError(error, 'idb_read', 'IndexedDB read failed');
    return createErrorResult(apiErr.code, apiErr.message, apiErr.details);
  } finally {
    db.close();
  }
}
