import type { RefObject } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from '@solvera/pace-core/components';
import { ChevronLeft } from '@solvera/pace-core/icons';

import { directionBadgeLabel } from '@/features/scanningRuntime/labels';
import { getQueueSyncBadge } from '@/features/scanningSetup/scanningBadges';
import type { ScanningRuntimeReadySurface } from '@/pages/scanning/scanningRuntimeControllerTypes';

import { ScanningRuntimeFailedUploadsCard } from './ScanningRuntimeFailedUploadsCard';
import { ScanningRuntimeManualScanDialog } from './ScanningRuntimeManualScanDialog';
import { ScanningRuntimeOverrideDialog } from './ScanningRuntimeOverrideDialog';
import { ScanningRuntimeResultCard } from './ScanningRuntimeResultCard';

type Props = {
  surface: ScanningRuntimeReadySurface;
  cardInputRef: RefObject<HTMLInputElement | null>;
};

export function ScanningRuntimeReadyView({ surface, cardInputRef }: Props) {
  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr]">
      <header className="grid h-12 w-full grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-card px-4">
        <nav className="justify-self-start" aria-label="Scan point navigation">
          <Button type="button" variant="ghost" size="small" onClick={() => surface.navigate('/scanning')}>
            <ChevronLeft className="size-4" aria-hidden />
            Back to scanning setup
          </Button>
        </nav>
        <section className="grid justify-items-center gap-0.5">
          <strong>{surface.scanPoint.name}</strong>
          <small>{surface.eventName}</small>
          <Badge variant="solid-sec-muted">{directionBadgeLabel(surface.scanPoint.direction)}</Badge>
          <nav className="grid grid-flow-col auto-cols-max gap-2" aria-label="Queue upload status">
            <Badge variant={getQueueSyncBadge('pending').variant} role="status">
              {getQueueSyncBadge('pending').label}: {surface.queueCounts.pending}
            </Badge>
            <span className={getQueueSyncBadge('syncing').className}>
              <Badge variant={getQueueSyncBadge('syncing').variant} role="status">
                {getQueueSyncBadge('syncing').label}: {surface.queueCounts.syncing}
              </Badge>
            </span>
            <Badge variant={getQueueSyncBadge('failed').variant} role="status">
              {getQueueSyncBadge('failed').label}: {surface.queueCounts.failed}
            </Badge>
          </nav>
        </section>
        <section className="h-0 w-24" aria-hidden />
      </header>

      <section className="mx-auto grid w-full max-w-[480px] gap-6 px-4 py-4 sm:px-4 sm:py-6">
        <Card>
          <CardContent className="grid gap-4 pt-6">
            <Label htmlFor="cardInput">
              Scan card
              <Input
                ref={cardInputRef}
                id="cardInput"
                name="cardInput"
                className="h-12 min-h-12"
                value={surface.cardValue}
                disabled={surface.validationDisabled}
                onChange={(value) => surface.setCardValue(value)}
                onKeyDown={surface.onKeyDown}
                placeholder="Awaiting card scan…"
              />
            </Label>
          </CardContent>
        </Card>

        {surface.showResultPanel ? (
          <ScanningRuntimeResultCard
            panel={surface.panel}
            formatScanned={surface.formatScanned}
            handleDismiss={surface.handleDismiss}
            canUpdateScanning={surface.canUpdateScanning}
            pendingOverride={surface.pendingOverride}
            overrideDialogOpenChange={surface.overrideDialogOpenChange}
          />
        ) : null}

        {surface.canUpdateScanning ? (
          <Button type="button" variant="outline" onClick={() => surface.setManualOpen(true)}>
            Manual scan
          </Button>
        ) : null}

        {surface.canUpdateScanning ? (
          <ScanningRuntimeFailedUploadsCard
            failedQueueEntries={surface.failedQueueEntries}
            handleRetryFailed={surface.handleRetryFailed}
          />
        ) : null}
      </section>

      <ScanningRuntimeOverrideDialog
        overrideOpen={surface.overrideOpen}
        overrideDialogOpenChange={surface.overrideDialogOpenChange}
        pendingOverride={surface.pendingOverride}
        overrideNotes={surface.overrideNotes}
        setOverrideNotes={surface.setOverrideNotes}
        handleConfirmOverride={surface.handleConfirmOverride}
        showNotesCounter={surface.showNotesCounter}
      />
      <ScanningRuntimeManualScanDialog
        manualOpen={surface.manualOpen}
        setManualOpen={surface.setManualOpen}
        manualSearch={surface.manualSearch}
        setManualSearch={surface.setManualSearch}
        manualNotes={surface.manualNotes}
        setManualNotes={surface.setManualNotes}
        manualSelected={surface.manualSelected}
        setManualSelected={surface.setManualSelected}
        visibleManualResults={surface.visibleManualResults}
        manualListEligible={surface.manualListEligible}
        recordManualScan={surface.recordManualScan}
        showManualNotesCounter={surface.showManualNotesCounter}
      />
    </main>
  );
}
