/* eslint-disable max-lines-per-function, complexity -- BA13 runtime surface */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  Input,
  Label,
  LoadingSpinner,
  Textarea,
  toast,
} from '@solvera/pace-core/components';
import { ChevronLeft } from '@solvera/pace-core/icons';
import { useManualParticipantSearch } from '@/features/scanningRuntime/hooks/useManualParticipantSearch';
import { useScanPointRecord } from '@/features/scanningRuntime/hooks/useScanPointRecord';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard, useCan, useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import { isOk } from '@solvera/pace-core/types';
import { formatInTimeZone, getUserTimeZone } from '@solvera/pace-core/utils';
import {
  acceptedBodyText,
  directionBadgeLabel,
  isOverridableRejection,
  overrideBodyText,
  rejectionDescription,
  rejectionLabel,
} from '@/features/scanningRuntime/labels';
import { buildQueueEntry, putScanQueueEntry } from '@/features/scanningRuntime/queue/scanQueueIdb';
import type { ManualParticipantSearchRow, RuntimeRejectionReason } from '@/features/scanningRuntime/types';
import { validateScan } from '@/features/scanningRuntime/validation/validateScan';

type PanelState =
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

function eventNameFromSelection(selectedEvent: unknown): string {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent) {
    const value = (selectedEvent as { name?: unknown }).name;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return 'selected event';
}

function eventIdFromSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'id' in selectedEvent) {
    const value = (selectedEvent as { id?: unknown }).id;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

function eventTimezoneFromSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'timezone' in selectedEvent) {
    const value = (selectedEvent as { timezone?: unknown }).timezone;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

function ScanningRuntimePageInner() {
  const navigate = useNavigate();
  const { scanPointId } = useParams<{ scanPointId: string }>();
  const secureSupabase = useSecureSupabase();
  const { selectedEvent } = useEvents();
  const { user } = useUnifiedAuth();
  const { scope } = useResolvedScope();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [cardValue, setCardValue] = useState('');
  const [panel, setPanel] = useState<PanelState>({ kind: 'idle' });
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSelected, setManualSelected] = useState<ManualParticipantSearchRow | null>(null);
  const [pendingOverride, setPendingOverride] = useState<{
    reason: RuntimeRejectionReason;
    cardIdentifier: string;
    scannedAt: number;
    participantDisplayName: string | null;
  } | null>(null);

  const scanGenRef = useRef(0);

  const { scanPoint: scanPointMaybe, isLoading: scanPointLoading } = useScanPointRecord(scanPointId);
  const scanPoint = scanPointMaybe ?? null;

  const updateScope = useMemo(
    () => ({
      organisationId: scanPoint?.organisation_id ?? undefined,
      eventId: scanPoint?.event_id ?? undefined,
      appId: scope.appId ?? undefined,
    }),
    [scanPoint?.event_id, scanPoint?.organisation_id, scope.appId]
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
      return true;
    },
    [focusInput]
  );

  const processScan = useCallback(
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
    [eventId, scanPoint, secureSupabase, writeQueueOrToast]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void processScan(cardValue);
      }
    },
    [cardValue, processScan]
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
    [eventTz]
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

  if (secureSupabase == null) {
    return (
      <main className="grid min-h-screen place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  if (scanPointLoading) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-6">
        <LoadingSpinner />
      </main>
    );
  }

  if (scanPoint == null) {
    return (
      <main className="mx-auto grid min-h-screen w-full max-w-[480px] place-content-start gap-6 px-4 py-6 sm:px-4 sm:py-6">
        <Alert variant="destructive">
          <AlertTitle>Scan point not found</AlertTitle>
          <AlertDescription>
            This scan point could not be loaded. It may have been removed or you may not have permission to access it.
          </AlertDescription>
          <Button type="button" variant="outline" onClick={() => navigate('/scanning')}>
            Back to scanning setup
          </Button>
        </Alert>
      </main>
    );
  }

  if (!scanPoint.is_active) {
    return (
      <main className="mx-auto grid min-h-screen w-full max-w-[480px] place-content-start gap-6 px-4 py-6 sm:px-4 sm:py-6">
        <Alert variant="destructive">
          <AlertTitle>Scan point inactive</AlertTitle>
          <AlertDescription>
            Scan point inactive — this scan point has been deactivated and cannot accept scans.
          </AlertDescription>
          <Button type="button" variant="outline" onClick={() => navigate('/scanning')}>
            Back to scanning setup
          </Button>
        </Alert>
      </main>
    );
  }

  const manualListEligible = manualSearch.trim().length >= 2;
  const visibleManualResults = manualListEligible ? manualResults : [];
  const notesRemaining = 500 - overrideNotes.length;
  const showNotesCounter = notesRemaining <= 50;
  const manualNotesRemaining = 500 - manualNotes.length;
  const showManualNotesCounter = manualNotesRemaining <= 50;

  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr]">
      <header className="grid h-12 w-full grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-card px-4">
        <nav className="justify-self-start" aria-label="Scan point navigation">
          <Button type="button" variant="ghost" size="small" onClick={() => navigate('/scanning')}>
            <ChevronLeft className="size-4" aria-hidden />
            Back to scanning setup
          </Button>
        </nav>
        <section className="grid justify-items-center gap-0.5">
          <strong>{scanPoint.name}</strong>
          <small>{eventName}</small>
          <Badge variant="solid-sec-muted">{directionBadgeLabel(scanPoint.direction)}</Badge>
        </section>
        <section className="h-0 w-24 justify-self-end" aria-hidden />
      </header>

      <section className="mx-auto grid w-full max-w-[480px] gap-6 px-4 py-4 sm:px-4 sm:py-6">
        <Card>
          <CardContent className="grid gap-4 pt-6">
            <Label htmlFor="cardInput">
              Scan card
              <Input
                ref={inputRef}
                id="cardInput"
                name="cardInput"
                className="h-12 min-h-12"
                value={cardValue}
                disabled={validationDisabled}
                onChange={(value) => setCardValue(value)}
                onKeyDown={onKeyDown}
                placeholder="Awaiting card scan…"
              />
            </Label>
          </CardContent>
        </Card>

        {showResultPanel ? (
          <Card>
            <CardContent className="grid gap-4 pt-6">
              {panel.kind === 'validating' && panel.showSpinner ? <LoadingSpinner /> : null}
              {panel.kind === 'accepted' ? (
                <>
                  <section className="grid grid-cols-[auto_1fr] items-center gap-2">
                    <Badge variant="solid-main-normal">Accepted</Badge>
                    <p className="min-w-0 truncate">{panel.name}</p>
                  </section>
                  <p>{acceptedBodyText()}</p>
                  <p>
                    <small>{formatScanned(panel.scannedAt)}</small>
                  </p>
                </>
              ) : null}
              {panel.kind === 'override_ok' ? (
                <>
                  <section className="grid grid-cols-[auto_1fr] items-center gap-2">
                    <Badge variant="solid-acc-normal">Accepted (override)</Badge>
                    <p className="min-w-0 truncate">{panel.name}</p>
                  </section>
                  <p>{overrideBodyText()}</p>
                  <p>
                    <small>{formatScanned(panel.scannedAt)}</small>
                  </p>
                </>
              ) : null}
              {panel.kind === 'rejected' ? (
                <>
                  <section className="grid grid-cols-[auto_1fr] items-center gap-2">
                    <Badge variant="solid-sec-muted">{rejectionLabel(panel.reason)}</Badge>
                    {panel.participantName != null ? (
                      <p className="min-w-0 truncate">{panel.participantName}</p>
                    ) : null}
                  </section>
                  <p>{rejectionDescription(panel.reason)}</p>
                  <p>
                    <small>{formatScanned(panel.scannedAt)}</small>
                  </p>
                  <section className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={handleDismiss}>
                      Dismiss
                    </Button>
                    {canUpdateScanning &&
                    pendingOverride != null &&
                    isOverridableRejection(pendingOverride.reason) ? (
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => {
                          setOverrideOpen(true);
                        }}
                      >
                        Override
                      </Button>
                    ) : null}
                  </section>
                </>
              ) : null}
              {panel.kind === 'eligibility_error' ? (
                <>
                  <p>{panel.message}</p>
                  <p>
                    <small>{formatScanned(panel.scannedAt)}</small>
                  </p>
                  <Button type="button" variant="outline" onClick={handleDismiss}>
                    Dismiss
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {canUpdateScanning ? (
          <Button type="button" variant="outline" onClick={() => setManualOpen(true)}>
            Manual scan
          </Button>
        ) : null}
      </section>

      <Dialog
        open={overrideOpen}
        onOpenChange={(open) => {
          setOverrideOpen(open);
          if (!open) {
            focusInput();
          }
        }}
      >
        <DialogPortal>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Override scan result</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p>
                {pendingOverride != null ? rejectionDescription(pendingOverride.reason) : null}
              </p>
              <Label htmlFor="override-notes">
                Notes (optional)
                <Textarea
                  id="override-notes"
                  name="notes"
                  value={overrideNotes}
                  onChange={(value) => setOverrideNotes(value)}
                  maxLength={500}
                  placeholder="Add a note for this scan."
                />
              </Label>
              {showNotesCounter ? (
                <output>
                  {overrideNotes.length} / 500
                </output>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="default"
                onClick={() => {
                  void handleConfirmOverride();
                }}
              >
                Confirm override
              </Button>
              <Button type="button" variant="outline" onClick={() => setOverrideOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogPortal>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Manual scan</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Label htmlFor="participantSearch">
                Participant name
                <Input
                  id="participantSearch"
                  name="participantSearch"
                  className="h-12 min-h-12"
                  value={manualSearch}
                  onChange={(value) => {
                    setManualSearch(value);
                    setManualSelected(null);
                  }}
                  placeholder="Search by name…"
                />
              </Label>
              {manualListEligible ? (
                <section className="relative" aria-label="Participant search results">
                  <ul className="absolute z-50 grid max-h-60 w-full gap-0 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                    {visibleManualResults.length === 0 ? (
                      <li>No participants found.</li>
                    ) : (
                      visibleManualResults.map((row) => (
                        <li key={row.applicationId}>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setManualSelected(row);
                            }}
                          >
                            {row.displayName}
                          </Button>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              ) : null}
              {manualSelected != null ? (
                <section className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <p className="min-w-0">{manualSelected.displayName}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Clear selection"
                    onClick={() => {
                      setManualSelected(null);
                      setManualSearch('');
                    }}
                  >
                    ×
                  </Button>
                </section>
              ) : null}
              <Label htmlFor="manual-notes">
                Notes (optional)
                <Textarea
                  id="manual-notes"
                  name="notes"
                  value={manualNotes}
                  onChange={(value) => setManualNotes(value)}
                  maxLength={500}
                  placeholder="Add a note for this scan."
                />
              </Label>
              {showManualNotesCounter ? (
                <output>
                  {manualNotes.length} / 500
                </output>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="default"
                disabled={manualSelected == null}
                onClick={() => {
                  void recordManualScan();
                }}
              >
                Record manual scan
              </Button>
              <Button type="button" variant="outline" onClick={() => setManualOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </main>
  );
}

export function ScanningRuntimePage() {
  const { organisationId, eventId, appId } = useResolvedScope();
  return (
    <PagePermissionGuard
      pageName="scanning"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <ScanningRuntimePageInner />
    </PagePermissionGuard>
  );
}
