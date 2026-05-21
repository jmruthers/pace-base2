import type { RuntimeRejectionReason } from '@/features/scanningRuntime/types';

export type ScanningRuntimePanelState =
  | { kind: 'idle' }
  | { kind: 'validating'; showSpinner: boolean }
  | { kind: 'accepted'; name: string; scannedAt: number }
  | {
      kind: 'rejected';
      reason: RuntimeRejectionReason;
      scannedAt: number;
      cardIdentifier: string;
      participantName: string | null;
    }
  | { kind: 'override_ok'; name: string; scannedAt: number }
  | { kind: 'eligibility_error'; message: string; scannedAt: number };

export type PendingScanOverrideState = {
  reason: RuntimeRejectionReason;
  cardIdentifier: string;
  scannedAt: number;
  participantDisplayName: string | null;
};
