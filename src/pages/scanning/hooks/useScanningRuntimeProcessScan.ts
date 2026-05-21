import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import { isOk } from '@solvera/pace-core/types';
import type { ScanPointRecord } from '@/features/scanningRuntime/types';
import { buildQueueEntry } from '@/features/scanningRuntime/queue/scanQueueHelpers';
import { validateScan } from '@/features/scanningRuntime/validation/validateScan';
import type { PendingScanOverrideState, ScanningRuntimePanelState } from '../scanningRuntimePageTypes';

type ProcessScanDeps = {
  scanGenRef: MutableRefObject<number>;
  secureSupabase: RBACSupabaseClient | null | undefined;
  scanPoint: ScanPointRecord | null;
  eventId: string | null;
  writeQueueOrToast: (entry: ReturnType<typeof buildQueueEntry>) => Promise<boolean>;
  setPanel: Dispatch<SetStateAction<ScanningRuntimePanelState>>;
  setCardValue: Dispatch<SetStateAction<string>>;
  setPendingOverride: Dispatch<SetStateAction<PendingScanOverrideState | null>>;
};

export function useScanningRuntimeProcessScan({
  scanGenRef,
  secureSupabase,
  scanPoint,
  eventId,
  writeQueueOrToast,
  setPanel,
  setCardValue,
  setPendingOverride,
}: ProcessScanDeps) {
  return useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        return;
      }
      if (
        secureSupabase == null ||
        scanPoint == null ||
        scanPoint.is_active !== true ||
        eventId == null ||
        eventId.length === 0
      ) {
        return;
      }

      const scannedAt = Date.now();
      const gen = (scanGenRef.current += 1);
      setPanel({ kind: 'validating', showSpinner: false });
      const slowHandle = window.setTimeout(() => {
        setPanel((prev) => {
          if (scanGenRef.current !== gen) {
            return prev;
          }
          return prev.kind === 'validating' ? { kind: 'validating', showSpinner: true } : prev;
        });
      }, 50);

      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const outcomeResult = await validateScan({
        supabase: secureSupabase as unknown as SupabaseClient,
        scanPoint,
        eventId,
        organisationId: scanPoint.organisation_id,
        cardIdentifier: trimmed,
        scannedAt,
        isOnline: online,
      });

      window.clearTimeout(slowHandle);

      if (scanGenRef.current !== gen) {
        return;
      }

      if (!isOk(outcomeResult)) {
        setPanel({
          kind: 'eligibility_error',
          message: outcomeResult.error.message,
          scannedAt,
        });
        setCardValue('');
        return;
      }

      const outcome = outcomeResult.data;

      if (outcome.kind === 'eligibility_read_error') {
        setPanel({ kind: 'eligibility_error', message: outcome.message, scannedAt: outcome.scannedAt });
        setCardValue('');
        return;
      }

      if (outcome.kind === 'accepted') {
        const ready = await writeQueueOrToast(
          buildQueueEntry({
            scanPointId: scanPoint.id,
            cardIdentifier: outcome.cardIdentifier,
            scannedAt: outcome.scannedAt,
            validationResult: 'accepted',
            validationReason: null,
            overrideBy: null,
            notes: null,
          })
        );
        if (!ready) {
          return;
        }
        setCardValue('');
        setPanel({ kind: 'accepted', name: outcome.participantName, scannedAt: outcome.scannedAt });
        setPendingOverride(null);
        return;
      }

      if (outcome.kind === 'rejected') {
        const ready = await writeQueueOrToast(
          buildQueueEntry({
            scanPointId: scanPoint.id,
            cardIdentifier: outcome.cardIdentifier,
            scannedAt: outcome.scannedAt,
            validationResult: 'rejected',
            validationReason: outcome.reason,
            overrideBy: null,
            notes: null,
          })
        );
        if (!ready) {
          return;
        }
        setCardValue('');
        setPanel({
          kind: 'rejected',
          reason: outcome.reason,
          scannedAt: outcome.scannedAt,
          cardIdentifier: outcome.cardIdentifier,
          participantName: outcome.participantName,
        });
        setPendingOverride({
          reason: outcome.reason,
          cardIdentifier: outcome.cardIdentifier,
          scannedAt: outcome.scannedAt,
          participantDisplayName: outcome.participantName,
        });
      }
    },
    [
      eventId,
      scanGenRef,
      scanPoint,
      secureSupabase,
      setCardValue,
      setPanel,
      setPendingOverride,
      writeQueueOrToast,
    ]
  );
}
