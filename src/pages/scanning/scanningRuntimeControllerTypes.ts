import type { RefObject } from 'react';
import type { NavigateFunction } from 'react-router-dom';

import type {
  ManualParticipantSearchRow,
  ScanQueueEntry,
  ScanPointRecord,
} from '@/features/scanningRuntime/types';

import type { PendingScanOverrideState, ScanningRuntimePanelState } from './scanningRuntimePageTypes';

type ScanningRuntimeQueueSurface = {
  queueCounts: { pending: number; syncing: number; synced: number; failed: number };
  failedQueueEntries: ScanQueueEntry[];
  handleRetryFailed: (entry: ScanQueueEntry) => Promise<void>;
};

type ScanningRuntimeScanSurface = {
  cardValue: string;
  setCardValue: (next: string) => void;
  panel: ScanningRuntimePanelState;
  validationDisabled: boolean;
  showResultPanel: boolean;
  formatScanned: (ts: number) => string;
  handleDismiss: () => void;
  canUpdateScanning: boolean;
  pendingOverride: PendingScanOverrideState | null;
  overrideDialogOpenChange: (open: boolean) => void;
  overrideOpen: boolean;
  overrideNotes: string;
  setOverrideNotes: (next: string) => void;
  handleConfirmOverride: () => Promise<void>;
  focusInput: () => void;
  showNotesCounter: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

type ScanningRuntimeManualSurface = {
  manualOpen: boolean;
  setManualOpen: (open: boolean) => void;
  manualSearch: string;
  setManualSearch: (next: string) => void;
  manualNotes: string;
  setManualNotes: (next: string) => void;
  manualSelected: ManualParticipantSearchRow | null;
  setManualSelected: (row: ManualParticipantSearchRow | null) => void;
  visibleManualResults: ManualParticipantSearchRow[];
  manualListEligible: boolean;
  recordManualScan: () => void;
  showManualNotesCounter: boolean;
};

/** Runtime scan UI callbacks and state snapshot (DOM ref stays outside this bag for react-hooks/refs). */
export type ScanningRuntimeReadySurface = {
  navigate: NavigateFunction;
  scanPoint: ScanPointRecord;
  eventName: string;
  eventTz: string;
} & ScanningRuntimeQueueSurface &
  ScanningRuntimeScanSurface &
  ScanningRuntimeManualSurface;

export type ScanningRuntimePageController =
  | { status: 'loading_supabase' }
  | { status: 'loading_scan_point' }
  | { status: 'scan_missing'; navigate: NavigateFunction }
  | { status: 'scan_inactive'; navigate: NavigateFunction }
  | { status: 'ready'; surface: ScanningRuntimeReadySurface; cardInputRef: RefObject<HTMLInputElement | null> };
