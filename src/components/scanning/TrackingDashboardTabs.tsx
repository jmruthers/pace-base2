import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingSpinner,
  TabsContent,
} from '@solvera/pace-core/components';
import type { ScanningTrackingPageController } from '@/pages/scanning/hooks/useScanningTrackingPageController';
import { TrackingExpandableGroupList, TrackingExpandablePointRows } from '@/pages/scanning/components/TrackingExpandableLists';
import { TrackingQueryCapNotice, TrackingQueryErrorPanel } from '@/pages/scanning/components/TrackingQueryPanels';

export function TrackingSitePresenceTab({ ctl }: { ctl: ScanningTrackingPageController }) {
  return (
    <TabsContent value="site-presence" className="grid gap-4">
      {ctl.showStepOneLoading ? (
        <section className="grid place-items-center py-8">
          <LoadingSpinner />
        </section>
      ) : ctl.approvedParticipantsQuery.error != null ? (
        <TrackingQueryErrorPanel
          error={ctl.approvedParticipantsQuery.error}
          onRetry={ctl.retryApprovedParticipants}
        />
      ) : ctl.allEventsQuery.error != null || ctl.acceptedEventsQuery.error != null ? (
        <TrackingQueryErrorPanel
          error={ctl.allEventsQuery.error ?? ctl.acceptedEventsQuery.error}
          onRetry={() => {
            ctl.retryAllEvents();
            ctl.retryAcceptedEvents();
          }}
        />
      ) : ctl.approvedParticipantsQuery.isLoading ||
        ctl.memberQuery.isLoading ||
        ctl.allEventsQuery.isLoading ||
        ctl.acceptedEventsQuery.isLoading ? (
        <section className="grid place-items-center py-8">
          <LoadingSpinner />
        </section>
      ) : (
        <>
          {ctl.allEventsQuery.data != null && ctl.allEventsQuery.data.length === 500 ? <TrackingQueryCapNotice /> : null}
          <section className="grid gap-3 sm:grid-cols-3">
            <article role="status" aria-label={`On-site: ${ctl.snapshot.onSiteCount} participants`}>
              <Card>
                <CardHeader>
                  <CardTitle>On-site</CardTitle>
                </CardHeader>
                <CardContent>{ctl.snapshot.onSiteCount}</CardContent>
              </Card>
            </article>
            <article role="status" aria-label={`Off-site: ${ctl.snapshot.offSiteCount} participants`}>
              <Card>
                <CardHeader>
                  <CardTitle>Off-site</CardTitle>
                </CardHeader>
                <CardContent>{ctl.snapshot.offSiteCount}</CardContent>
              </Card>
            </article>
            <article role="status" aria-label={`Never Scanned: ${ctl.snapshot.neverScannedCount} participants`}>
              <Card>
                <CardHeader>
                  <CardTitle>Never Scanned</CardTitle>
                </CardHeader>
                <CardContent>{ctl.snapshot.neverScannedCount}</CardContent>
              </Card>
            </article>
          </section>

          <section className="grid gap-2">
            <h2>On-site locations</h2>
            {ctl.snapshot.onSiteGroups.length === 0 ? (
              <small>No participants are currently on-site.</small>
            ) : (
              <TrackingExpandableGroupList
                groups={ctl.snapshot.onSiteGroups}
                expandedIds={ctl.onSiteExpanded}
                setExpandedIds={ctl.setOnSiteExpanded}
              />
            )}
          </section>

          <section className="grid gap-2">
            <h2>Off-site locations</h2>
            {ctl.snapshot.offSiteGroups.length === 0 ? (
              <small>No participants are currently off-site.</small>
            ) : (
              <TrackingExpandableGroupList
                groups={ctl.snapshot.offSiteGroups}
                expandedIds={ctl.offSiteExpanded}
                setExpandedIds={ctl.setOffSiteExpanded}
              />
            )}
          </section>
        </>
      )}
    </TabsContent>
  );
}

export function TrackingActivityTab({ ctl }: { ctl: ScanningTrackingPageController }) {
  return (
    <TabsContent value="activity" className="grid gap-4">
      {ctl.showStepOneLoading ? (
        <section className="grid place-items-center py-8">
          <LoadingSpinner />
        </section>
      ) : ctl.acceptedEventsQuery.error != null ? (
        <TrackingQueryErrorPanel error={ctl.acceptedEventsQuery.error} onRetry={ctl.retryAcceptedEvents} />
      ) : ctl.acceptedEventsQuery.isLoading ? (
        <section className="grid place-items-center py-8">
          <LoadingSpinner />
        </section>
      ) : (
        <>
          {ctl.acceptedEventsQuery.data != null && ctl.acceptedEventsQuery.data.length === 500 ? (
            <TrackingQueryCapNotice />
          ) : null}
          <TrackingExpandablePointRows
            rows={ctl.snapshot.activityRows}
            emptyCopy="No activity scan points are configured for this event."
            expandedIds={ctl.activityExpanded}
            setExpandedIds={ctl.setActivityExpanded}
          />
        </>
      )}
    </TabsContent>
  );
}

export function TrackingTransportTab({ ctl }: { ctl: ScanningTrackingPageController }) {
  return (
    <TabsContent value="transport" className="grid gap-4">
      {ctl.showStepOneLoading ? (
        <section className="grid place-items-center py-8">
          <LoadingSpinner />
        </section>
      ) : ctl.acceptedEventsQuery.error != null ? (
        <TrackingQueryErrorPanel error={ctl.acceptedEventsQuery.error} onRetry={ctl.retryAcceptedEvents} />
      ) : ctl.acceptedEventsQuery.isLoading ? (
        <section className="grid place-items-center py-8">
          <LoadingSpinner />
        </section>
      ) : (
        <>
          {ctl.acceptedEventsQuery.data != null && ctl.acceptedEventsQuery.data.length === 500 ? (
            <TrackingQueryCapNotice />
          ) : null}
          <TrackingExpandablePointRows
            rows={ctl.snapshot.transportRows}
            emptyCopy="No transport scan points are configured for this event."
            expandedIds={ctl.transportExpanded}
            setExpandedIds={ctl.setTransportExpanded}
          />
        </>
      )}
    </TabsContent>
  );
}