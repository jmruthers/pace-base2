import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingSpinner,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@solvera/pace-core/components';
import { ChevronLeft } from '@solvera/pace-core/icons';
import { formatDateTime } from '@solvera/pace-core/utils';
import type { ScanningTrackingPageController } from '@/pages/scanning/hooks/useScanningTrackingPageController';
import {
  TrackingActivityTab,
  TrackingSitePresenceTab,
  TrackingTransportTab,
} from '@/pages/scanning/components/TrackingDashboardTabs';
import { TrackingParticipantHistoryTab } from '@/pages/scanning/components/TrackingParticipantHistoryTab';
import { TrackingQueryErrorPanel } from '@/pages/scanning/components/TrackingQueryPanels';

export function ScanningTrackingPageView({ ctl }: { ctl: ScanningTrackingPageController }) {
  return (
      <main className="grid gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-start">
          <section className="grid justify-start">
            <Button type="button" variant="ghost" onClick={() => ctl.navigate('/scanning')}>
              <ChevronLeft className="size-4" aria-hidden />
              Back to scanning setup
            </Button>
          </section>
          <section className="grid gap-1">
            <h1>Tracking Dashboard</h1>
            <p>Event: {ctl.eventName}</p>
            <small>Last updated: {ctl.lastUpdatedAt != null ? formatDateTime(ctl.lastUpdatedAt) : '—'}</small>
          </section>
          <section className="grid justify-items-end">
            <Button
              type="button"
              variant="outline"
              disabled={ctl.refreshing || !ctl.canQuery}
              onClick={() => void ctl.onRefresh()}
            >
              {ctl.refreshing ? <LoadingSpinner /> : null}
              Refresh
            </Button>
          </section>
        </header>

        {ctl.eventId == null || ctl.organisationId == null ? (
          <Card>
            <CardHeader>
              <CardTitle>No event selected</CardTitle>
              <CardDescription>Select an event from the header to view tracking data.</CardDescription>
            </CardHeader>
          </Card>
        ) : ctl.showStepOneError ? (
          <TrackingQueryErrorPanel error={ctl.scanPointsQuery.error} onRetry={ctl.retryScanPoints} />
        ) : (
          <section className="grid gap-4">
            <Tabs defaultValue="site-presence">
              <TabsList className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <TabsTrigger className="min-h-11 grow basis-1/2 sm:basis-auto sm:grow-0" value="site-presence">
                  Site Presence
                </TabsTrigger>
                <TabsTrigger className="min-h-11 grow basis-1/2 sm:basis-auto sm:grow-0" value="activity">
                  Activity
                </TabsTrigger>
                <TabsTrigger className="min-h-11 grow basis-1/2 sm:basis-auto sm:grow-0" value="transport">
                  Transport
                </TabsTrigger>
                <TabsTrigger
                  className="min-h-11 grow basis-1/2 sm:basis-auto sm:grow-0"
                  value="participant-history"
                >
                  Participant History
                </TabsTrigger>
              </TabsList>
              <TrackingSitePresenceTab ctl={ctl} />
              <TrackingActivityTab ctl={ctl} />
              <TrackingTransportTab ctl={ctl} />
              <TrackingParticipantHistoryTab ctl={ctl} />
            </Tabs>
          </section>
        )}
      </main>
  );
}
