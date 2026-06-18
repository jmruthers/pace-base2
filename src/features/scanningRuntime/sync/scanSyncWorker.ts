import { useEffect, useState } from 'react';
import { toast } from '@solvera/pace-core/components';
import { createErrorResult, isOk, normalizeToApiError, ok } from '@solvera/pace-core/types';
import type { ApiResult } from '@solvera/pace-core/types';
import type { QueueSyncStatus, ScanQueueEntry } from '@/features/scanningRuntime/types';
import {
  getScanQueueEntry,
  listScanQueueEntries,
  listScanQueueEntriesByStatus,
  resetSyncingEntriesToPending,
  updateScanQueueEntrySyncStatus,
} from '@/features/scanningRuntime/queue/scanQueueIdb';

const POLL_INTERVAL_MS = 30_000;
const EDGE_FUNCTION_NAME = 'base-scan-sync';

type SyncSnapshot = {
  isFlushing: boolean;
  lastFlushAt: number | null;
};

type EdgeSuccessBody = {
  ok: true;
  data: {
    local_id: string;
    status: 'synced' | 'already_synced';
    conflict_detected: boolean;
    conflict_flagged: boolean;
  };
};

type EdgeFailureBody = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};

type FlushCycleSummary = {
  synced: number;
  failed: number;
  conflicts: number;
};

type RetrySummary = {
  retried: number;
  skippedManualNoCard: number;
};

type SyncListener = (snapshot: SyncSnapshot) => void;

const listeners = new Set<SyncListener>();
let intervalHandle: number | null = null;
let onlineHandler: (() => void) | null = null;
type SecureSupabaseLike = {
  auth?: unknown;
};

let secureSupabaseClient: SecureSupabaseLike | null = null;
let snapshot: SyncSnapshot = { isFlushing: false, lastFlushAt: null };
let inflightFlush: Promise<void> | null = null;

function emitSnapshot() {
  listeners.forEach((listener) => listener(snapshot));
}

function setSnapshot(next: SyncSnapshot) {
  snapshot = next;
  emitSnapshot();
}

function getEdgeFunctionUrl(): string | null {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  if (baseUrl.length === 0) {
    return null;
  }
  return `${baseUrl}/functions/v1/${EDGE_FUNCTION_NAME}`;
}

async function getAccessToken(): Promise<string | null> {
  if (secureSupabaseClient == null) {
    return null;
  }
  const authClient = secureSupabaseClient.auth as
    | {
        getSession?: () => Promise<{
          data?: { session?: { access_token?: string | null } | null };
        }>;
      }
    | undefined;
  if (typeof authClient?.getSession !== 'function') {
    return null;
  }
  const result = await authClient.getSession();
  return result.data?.session?.access_token ?? null;
}

function toastCycleSummary(summary: FlushCycleSummary) {
  if (summary.synced > 0) {
    toast({
      variant: 'success',
      description: `${summary.synced} scan events uploaded`,
    });
  }
  if (summary.failed > 0) {
    toast({
      variant: 'destructive',
      description: `Upload failed for ${summary.failed} scan events. Retrying when online.`,
    });
  }
  if (summary.conflicts > 0) {
    toast({
      title: 'Warning',
      description: 'Upload conflict detected — check the conflict log.',
    });
  }
}

async function markFailed(localId: string, reason: string): Promise<void> {
  await updateScanQueueEntrySyncStatus({
    localId,
    syncStatus: 'failed',
    failureReason: reason,
  });
}

function buildEdgePayload(entry: ScanQueueEntry) {
  return {
    local_id: entry.local_id,
    scan_point_id: entry.scan_point_id,
    card_identifier: entry.card_identifier,
    scanned_at: entry.scanned_at,
    validation_result: entry.validation_result,
    validation_reason: entry.validation_reason,
    device_id: entry.device_id ?? null,
    override_by: entry.override_by ?? null,
    notes: entry.notes ?? null,
  };
}

async function flushEntry(localId: string): Promise<{ synced: boolean; failed: boolean; conflict: boolean }> {
  const latestResult = await getScanQueueEntry(localId);
  if (!isOk(latestResult) || latestResult.data == null) {
    return { synced: false, failed: false, conflict: false };
  }
  const latest = latestResult.data;
  if (latest.sync_status !== 'pending' && latest.sync_status !== 'failed') {
    return { synced: false, failed: false, conflict: false };
  }
  if (latest.sync_status === 'failed' && latest.failure_reason === 'manual_scan_no_card') {
    return { synced: false, failed: false, conflict: false };
  }

  const toSyncResult = await updateScanQueueEntrySyncStatus({
    localId,
    syncStatus: 'syncing',
  });
  if (!isOk(toSyncResult) || toSyncResult.data == null) {
    return { synced: false, failed: true, conflict: false };
  }

  const entry = toSyncResult.data;
  if (entry.card_identifier == null) {
    console.warn(
      `[BA14] card_identifier is null on local_id ${entry.local_id} - manual scan entries cannot be flushed in MVP (see section 16 item 13).`
    );
    await markFailed(entry.local_id, 'manual_scan_no_card');
    return { synced: false, failed: true, conflict: false };
  }

  const functionUrl = getEdgeFunctionUrl();
  if (functionUrl == null) {
    await markFailed(entry.local_id, 'missing_supabase_url');
    return { synced: false, failed: true, conflict: false };
  }

  const accessToken = await getAccessToken();
  if (accessToken == null || accessToken.length === 0) {
    await markFailed(entry.local_id, 'missing_auth_session');
    return { synced: false, failed: true, conflict: false };
  }

  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  if (publishableKey.length > 0) {
    headers.apikey = publishableKey;
  }

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildEdgePayload(entry)),
    });
    const body = (await response.json()) as EdgeSuccessBody | EdgeFailureBody;
    if (!response.ok || body == null || body.ok !== true) {
      const message =
        body != null && 'error' in body && body.error?.message != null
          ? body.error.message
          : `HTTP ${response.status}`;
      console.warn(`[BA14] Sync request failed for local_id ${entry.local_id}: ${message}`);
      await markFailed(entry.local_id, 'edge_sync_failed');
      return { synced: false, failed: true, conflict: false };
    }

    const updated = await updateScanQueueEntrySyncStatus({
      localId: entry.local_id,
      syncStatus: 'synced',
    });
    if (!isOk(updated)) {
      return { synced: false, failed: true, conflict: false };
    }

    return {
      synced: true,
      failed: false,
      conflict: body.data.conflict_detected && body.data.conflict_flagged,
    };
  } catch (error: unknown) {
    console.warn(`[BA14] Sync request failed for local_id ${entry.local_id}:`, error);
    await markFailed(entry.local_id, 'edge_sync_request_error');
    return { synced: false, failed: true, conflict: false };
  }
}

async function flushEntries(localIds: string[]): Promise<FlushCycleSummary> {
  let synced = 0;
  let failed = 0;
  let conflicts = 0;
  for (const localId of localIds) {
    const result = await flushEntry(localId);
    if (result.synced) {
      synced += 1;
    }
    if (result.failed) {
      failed += 1;
    }
    if (result.conflict) {
      conflicts += 1;
    }
  }
  return { synced, failed, conflicts };
}

async function runFlushCycle(localIds?: string[]): Promise<void> {
  if (inflightFlush != null) {
    return inflightFlush;
  }
  inflightFlush = (async () => {
    setSnapshot({ ...snapshot, isFlushing: true });
    const targets = localIds ?? (await getAutomaticFlushTargetIds());
    const summary = await flushEntries(targets);
    setSnapshot({
      isFlushing: false,
      lastFlushAt: Date.now(),
    });
    toastCycleSummary(summary);
  })();

  try {
    await inflightFlush;
  } finally {
    inflightFlush = null;
  }
}

export async function flushScanQueueNow(): Promise<void> {
  await runFlushCycle();
}

async function getAutomaticFlushTargetIds(): Promise<string[]> {
  const pending = await listScanQueueEntriesByStatus(['pending', 'failed']);
  if (!isOk(pending)) {
    return [];
  }
  return pending.data
    .filter((entry) => !(entry.sync_status === 'failed' && entry.failure_reason === 'manual_scan_no_card'))
    .map((entry) => entry.local_id);
}

export async function retryFailedQueueEntries(localIds: string[]): Promise<RetrySummary> {
  let retried = 0;
  let skippedManualNoCard = 0;
  const retryTargets: string[] = [];
  for (const localId of localIds) {
    const current = await getScanQueueEntry(localId);
    if (!isOk(current) || current.data == null || current.data.sync_status !== 'failed') {
      continue;
    }
    if (current.data.failure_reason === 'manual_scan_no_card') {
      skippedManualNoCard += 1;
      continue;
    }
    await updateScanQueueEntrySyncStatus({
      localId,
      syncStatus: 'pending',
    });
    retryTargets.push(localId);
    retried += 1;
  }
  if (retryTargets.length > 0) {
    await runFlushCycle(retryTargets);
  }
  return { retried, skippedManualNoCard };
}

export async function getQueueEntriesByStatus(
  statuses: QueueSyncStatus[],
  scanPointIds?: string[]
): Promise<ScanQueueEntry[]> {
  const result = await listScanQueueEntriesByStatus(statuses);
  if (!isOk(result)) {
    return [];
  }
  if (scanPointIds == null || scanPointIds.length === 0) {
    return result.data;
  }
  const allowed = new Set(scanPointIds);
  return result.data.filter((entry) => allowed.has(entry.scan_point_id));
}

export async function getQueueStatusCounts(scanPointIds?: string[]): Promise<Record<QueueSyncStatus, number>> {
  const listResult = await listScanQueueEntries();
  const rows = isOk(listResult) ? listResult.data : [];
  const allowed = scanPointIds != null && scanPointIds.length > 0 ? new Set(scanPointIds) : null;
  const counts: Record<QueueSyncStatus, number> = {
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
  };
  rows.forEach((row) => {
    if (allowed != null && !allowed.has(row.scan_point_id)) {
      return;
    }
    counts[row.sync_status] += 1;
  });
  return counts;
}

export interface ScanPointQueueSummary {
  pending: number;
  syncing: number;
  failed: number;
}

export async function getQueueSyncSummaryByScanPoint(
  scanPointIds: string[]
): Promise<Record<string, ScanPointQueueSummary>> {
  const listResult = await listScanQueueEntries();
  const rows = isOk(listResult) ? listResult.data : [];
  const summary = scanPointIds.reduce<Record<string, ScanPointQueueSummary>>((accumulator, scanPointId) => {
    accumulator[scanPointId] = { pending: 0, syncing: 0, failed: 0 };
    return accumulator;
  }, {});
  if (scanPointIds.length === 0) {
    return summary;
  }
  const allowed = new Set(scanPointIds);
  rows.forEach((row) => {
    if (!allowed.has(row.scan_point_id)) {
      return;
    }
    if (row.sync_status === 'pending' || row.sync_status === 'syncing' || row.sync_status === 'failed') {
      summary[row.scan_point_id][row.sync_status] += 1;
    }
  });
  return summary;
}

export async function startScanSyncWorker(supabaseClient: SecureSupabaseLike): Promise<ApiResult<void>> {
  try {
    secureSupabaseClient = supabaseClient;
    const resetResult = await resetSyncingEntriesToPending();
    if (!isOk(resetResult)) {
      console.warn('[BA14] Could not reset syncing queue entries on worker startup.', resetResult.error);
    }
    if (onlineHandler == null) {
      onlineHandler = () => {
        void runFlushCycle();
      };
      window.addEventListener('online', onlineHandler);
    }
    if (intervalHandle == null) {
      intervalHandle = window.setInterval(() => {
        void runFlushCycle();
      }, POLL_INTERVAL_MS);
    }
    return ok(undefined);
  } catch (error: unknown) {
    const apiError = normalizeToApiError(error, 'ba14_sync_start_failed', 'Could not start sync worker.');
    return createErrorResult(apiError.code, apiError.message, apiError.details);
  }
}

export function stopScanSyncWorker() {
  if (onlineHandler != null) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }
  if (intervalHandle != null) {
    window.clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export function subscribeScanSync(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

export function useScanSyncSnapshot(): SyncSnapshot {
  const [state, setState] = useState<SyncSnapshot>(snapshot);
  useEffect(() => subscribeScanSync(setState), []);
  return state;
}
