import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from '@solvera/pace-core/components';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useCan, useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import { isOk } from '@solvera/pace-core/types';
import { formatInTimeZone, getUserTimeZone } from '@solvera/pace-core/utils';
import { useManualParticipantSearch } from '@/features/scanningRuntime/hooks/useManualParticipantSearch';
import { useScanPointRecord } from '@/features/scanningRuntime/hooks/useScanPointRecord';
import { putScanQueueEntry } from '@/features/scanningRuntime/queue/scanQueueIdb';
import { buildQueueEntry } from '@/features/scanningRuntime/queue/scanQueueHelpers';
import {
  getQueueEntriesByStatus,
  getQueueStatusCounts,
  retryFailedQueueEntries,
  useScanSyncSnapshot,
} from '@/features/scanningRuntime/sync/scanSyncWorker';
import type { ManualParticipantSearchRow, ScanQueueEntry } from '@/features/scanningRuntime/types';
import { eventIdFromSelection, eventNameFromSelection, eventTimezoneFromSelection } from '@/pages/scanning/components/scanSetupHelpers';
import type {
  ScanningRuntimePageController,
  ScanningRuntimeReadySurface,
} from '@/pages/scanning/scanningRuntimeControllerTypes';
import type { PendingScanOverrideState, ScanningRuntimePanelState } from '@/pages/scanning/scanningRuntimePageTypes';
import { useScanningRuntimeProcessScan } from './useScanningRuntimeProcessScan';

export function useScanningRuntimePageController(): ScanningRuntimePageController {
  const navigate = useNavigate();
  const { scanPointId } = useParams<{ scanPointId: string }>();
  const secureSupabase = useSecureSupabase();
  const { selectedEvent } = useEvents();
  const { user } = useUnifiedAuth();
  const { scope } = useResolvedScope();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [cardValue, setCardValue] = useState('');
  const [panel, setPanel] = useState<ScanningRuntimePanelState>({ kind: 'idle' });
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSelected, setManualSelected] = useState<ManualParticipantSearchRow | null>(null);
  const [pendingOverride, setPendingOverride] = useState<PendingScanOverrideState | null>(null);

  const scanGenRef = useRef(0);
  const { lastFlushAt } = useScanSyncSnapshot();
  const [queueCounts, setQueueCounts] = useState({
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
  });
  const [failedQueueEntries, setFailedQueueEntries] = useState<ScanQueueEntry[]>([]);

  const { scanPoint: scanPointMaybe, isLoading: scanPointLoading } = useScanPointRecord(scanPointId);
  const scanPoint = scanPointMaybe ?? null;

  const updateScope = useMemo(
    () => ({
      organisationId: scanPoint?.organisation_id ?? undefined,
      eventId: scanPoint?.event_id ?? undefined,
      appId: scope.appId ?? undefined,
    }),
    [scanPoint?.event_id, scanPoint?.organisation_id, scope.appId],
  );

  const { can: canUpdateScanning } = useCan('update:page.scanning', updateScope);

  const eventId = eventIdFromSelection(selectedEvent);
  const eventName = eventNameFromSelection(selectedEvent);
  const eventTz = eventTimezoneFromSelection(selectedEvent) ?? getUserTimeZone();

  const manualSearchOrganisationId = scanPoint?.organisation_id ?? scope.organisationId ?? null;

  const { manualResults, setManualResults } = useManualParticipantSearch({
    manualOpen,
    manualSearch,
    eventId,
    organisationId: manualSearchOrganisationId,
    secureSupabase: (secureSupabase ?? null) as unknown as SupabaseClient | null,
  });

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const overrideDialogOpenChange = useCallback(
    (open: boolean) => {
      setOverrideOpen(open);
      if (!open) {
        focusInput();
      }
    },
    [focusInput],
  );

  useEffect(() => {
    if (panel.kind === 'idle' && !overrideOpen && !manualOpen && scanPoint?.is_active === true) {
      focusInput();
    }
  }, [focusInput, manualOpen, overrideOpen, panel.kind, scanPoint?.is_active]);

  useEffect(() => {
    if (panel.kind === 'accepted' || panel.kind === 'override_ok') {
      const t = window.setTimeout(() => {
        setPanel({ kind: 'idle' });
        setCardValue('');
        focusInput();
      }, 3000);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [focusInput, panel.kind]);

  useEffect(() => {
    if (!overrideOpen) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById('override-notes')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [overrideOpen]);

  const writeQueueOrToast = useCallback(
    async (entry: ReturnType<typeof buildQueueEntry>) => {
      const putResult = await putScanQueueEntry(entry);
      if (!isOk(putResult)) {
        toast({
          variant: 'destructive',
          description: 'Scan could not be saved. Please try again.',
        });
        setPanel({ kind: 'idle' });
        focusInput();
        return false;
      }
      if (scanPoint != null) {
        const [counts, failedRows] = await Promise.all([
          getQueueStatusCounts([scanPoint.id]),
          getQueueEntriesByStatus(['failed'], [scanPoint.id]),
        ]);
        setQueueCounts(counts);
        setFailedQueueEntries(failedRows);
      }
      return true;
    },
    [focusInput, scanPoint],
  );

  useEffect(() => {
    if (scanPoint == null) {
      return;
    }
    void (async () => {
      const [counts, failedRows] = await Promise.all([
        getQueueStatusCounts([scanPoint.id]),
        getQueueEntriesByStatus(['failed'], [scanPoint.id]),
      ]);
      setQueueCounts(counts);
      setFailedQueueEntries(failedRows);
    })();
  }, [lastFlushAt, scanPoint]);

  const processScan = useScanningRuntimeProcessScan({
    scanGenRef,
    secureSupabase,
    scanPoint,
    eventId,
    writeQueueOrToast,
    setPanel,
    setCardValue,
    setPendingOverride,
  });

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void processScan(cardValue);
      }
    },
    [cardValue, processScan],
  );

  const validationDisabled =
    panel.kind === 'validating' ||
    panel.kind === 'rejected' ||
    scanPoint?.is_active !== true ||
    secureSupabase == null;

  const showResultPanel =
    (panel.kind === 'validating' && panel.showSpinner) ||
    panel.kind === 'accepted' ||
    panel.kind === 'rejected' ||
    panel.kind === 'override_ok' ||
    panel.kind === 'eligibility_error';

  const formatScanned = useCallback(
    (ts: number) => formatInTimeZone(ts, eventTz, 'd MMM yyyy h:mm a'),
    [eventTz],
  );

  const handleDismiss = useCallback(() => {
    setPanel({ kind: 'idle' });
    setCardValue('');
    setPendingOverride(null);
    focusInput();
  }, [focusInput]);

  const handleConfirmOverride = useCallback(async () => {
    if (scanPoint == null || pendingOverride == null || user?.id == null) {
      return;
    }
    const entry = buildQueueEntry({
      scanPointId: scanPoint.id,
      cardIdentifier: pendingOverride.cardIdentifier,
      scannedAt: Date.now(),
      validationResult: 'accepted_override',
      validationReason: pendingOverride.reason,
      overrideBy: user.id,
      notes: overrideNotes.trim().length > 0 ? overrideNotes.trim() : null,
    });
    const ok = await writeQueueOrToast(entry);
    if (!ok) {
      return;
    }
    setOverrideOpen(false);
    setOverrideNotes('');
    const displayName = pendingOverride.participantDisplayName ?? eventName;
    setPanel({ kind: 'override_ok', name: displayName, scannedAt: entry.scanned_at });
    setPendingOverride(null);
  }, [eventName, overrideNotes, pendingOverride, scanPoint, user, writeQueueOrToast]);

  const recordManualScan = useCallback(async () => {
    const selected = manualSelected;
    if (scanPoint == null || user?.id == null || selected == null) {
      return;
    }
    const entry = buildQueueEntry({
      scanPointId: scanPoint.id,
      cardIdentifier: null,
      scannedAt: Date.now(),
      validationResult: 'accepted_override',
      validationReason: null,
      overrideBy: user.id,
      notes: manualNotes.trim().length > 0 ? manualNotes.trim() : null,
    });
    const ok = await writeQueueOrToast(entry);
    if (!ok) {
      return;
    }
    setManualOpen(false);
    setManualSearch('');
    setManualNotes('');
    setManualSelected(null);
    setManualResults([]);
    setPanel({ kind: 'override_ok', name: selected.displayName, scannedAt: entry.scanned_at });
  }, [manualNotes, manualSelected, scanPoint, setManualResults, user, writeQueueOrToast]);

  const handleRetryFailed = useCallback(
    async (entry: ScanQueueEntry) => {
      if (scanPoint == null || entry.sync_status !== 'failed') {
        return;
      }
      const summary = await retryFailedQueueEntries([entry.local_id]);
      if (summary.skippedManualNoCard > 0) {
        toast({
          variant: 'destructive',
          description: 'Manual scan entries cannot be uploaded in MVP without a card identifier.',
        });
        return;
      }
      const [counts, failedRows] = await Promise.all([
        getQueueStatusCounts([scanPoint.id]),
        getQueueEntriesByStatus(['failed'], [scanPoint.id]),
      ]);
      setQueueCounts(counts);
      setFailedQueueEntries(failedRows);
      if (failedRows.length === 0) {
        toast({
          variant: 'success',
          description: 'Scan event re-uploaded successfully.',
        });
        return;
      }
      toast({
        variant: 'destructive',
        description: 'Retry failed. Check your connection and try again.',
      });
    },
    [scanPoint],
  );

  const manualListEligible = manualSearch.trim().length >= 2;
  const visibleManualResults = manualListEligible ? manualResults : [];
  const notesRemaining = 500 - overrideNotes.length;
  const showNotesCounter = notesRemaining <= 50;
  const manualNotesRemaining = 500 - manualNotes.length;
  const showManualNotesCounter = manualNotesRemaining <= 50;

  if (secureSupabase == null) {
    return { status: 'loading_supabase' };
  }

  if (scanPointLoading) {
    return { status: 'loading_scan_point' };
  }

  if (scanPoint == null) {
    return { status: 'scan_missing', navigate };
  }

  if (!scanPoint.is_active) {
    return { status: 'scan_inactive', navigate };
  }

  const surface: ScanningRuntimeReadySurface = {
    navigate,
    scanPoint,
    eventName,
    eventTz,
    queueCounts,
    failedQueueEntries,
    handleRetryFailed,
    cardValue,
    setCardValue,
    panel,
    validationDisabled,
    showResultPanel,
    formatScanned,
    handleDismiss,
    canUpdateScanning,
    pendingOverride,
    overrideDialogOpenChange,
    overrideOpen,
    overrideNotes,
    setOverrideNotes,
    handleConfirmOverride,
    focusInput,
    manualOpen,
    setManualOpen,
    manualSearch,
    setManualSearch: (next: string) => {
      setManualSearch(next);
      setManualSelected(null);
    },
    manualNotes,
    setManualNotes,
    manualSelected,
    setManualSelected,
    visibleManualResults,
    manualListEligible,
    recordManualScan: () => {
      void recordManualScan();
    },
    showManualNotesCounter,
    showNotesCounter,
    onKeyDown,
  };

  return {
    status: 'ready',
    surface,
    cardInputRef: inputRef,
  };
}
