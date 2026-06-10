import { Button, Card, CardDescription, CardHeader, CardTitle } from '@solvera/pace-core/components';
import type { ScanningSetupController } from '@/hooks/scanning/useScanningSetupController';
import { ScanningSetupConfiguredContent } from '@/components/scanning/ScanningSetupConfiguredContent';
import {
  ScanningSetupConflictDialogs,
  ScanningSetupScanDialogs,
} from '@/components/scanning/ScanningSetupDialogs';

export function ScanningSetupPageView({ ctl }: { ctl: ScanningSetupController }) {
  return (
      <>
        <main className="grid gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <ScanningSetupPageHeader ctl={ctl} />

          {ctl.eventId == null || ctl.organisationId == null ? (
            <Card>
              <CardHeader>
                <CardTitle>No event selected</CardTitle>
                <CardDescription>Select an event from the header to configure scanning.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <ScanningSetupConfiguredContent ctl={ctl} />
          )}
        </main>

        <ScanningSetupScanDialogs ctl={ctl} />
        <ScanningSetupConflictDialogs ctl={ctl} />
      </>
  );
}

function ScanningSetupPageHeader({ ctl }: { ctl: ScanningSetupController }) {
  return (
    <header className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
      <section className="grid gap-2">
        <h1>Scanning Setup</h1>
        <p>Configure scan points and review scanning activity for {ctl.eventName}.</p>
      </section>
      {ctl.canReadPage ? (
        <section className="grid justify-items-stretch sm:justify-items-end">
          <Button type="button" variant="default" onClick={() => ctl.navigate('/scanning/tracking')}>
            View Tracking Dashboard
          </Button>
        </section>
      ) : null}
    </header>
  );
}
