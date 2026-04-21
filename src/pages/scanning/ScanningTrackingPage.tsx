import { useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';

interface TrackingRecord {
  participantId: string;
  latestSiteState: 'on_site' | 'off_site' | 'never_scanned';
  hasActivityBooking: boolean;
  hasActivityScan: boolean;
  hasTransportAssignment: boolean;
  hasTransportScan: boolean;
}

const TRACKING_FIXTURES: ReadonlyArray<TrackingRecord> = [
  {
    participantId: 'person-1',
    latestSiteState: 'on_site',
    hasActivityBooking: true,
    hasActivityScan: true,
    hasTransportAssignment: false,
    hasTransportScan: false,
  },
  {
    participantId: 'person-2',
    latestSiteState: 'off_site',
    hasActivityBooking: true,
    hasActivityScan: false,
    hasTransportAssignment: true,
    hasTransportScan: false,
  },
  {
    participantId: 'person-3',
    latestSiteState: 'never_scanned',
    hasActivityBooking: false,
    hasActivityScan: false,
    hasTransportAssignment: true,
    hasTransportScan: true,
  },
];

export function ScanningTrackingPage() {
  const [refreshCount, setRefreshCount] = useState(1);

  const headcounts = useMemo(() => {
    const onSite = TRACKING_FIXTURES.filter((record) => record.latestSiteState === 'on_site').length;
    const offSite = TRACKING_FIXTURES.filter((record) => record.latestSiteState === 'off_site').length;
    const neverScanned = TRACKING_FIXTURES.filter(
      (record) => record.latestSiteState === 'never_scanned'
    ).length;
    return { onSite, offSite, neverScanned };
  }, []);

  const activityComparison = useMemo(
    () =>
      TRACKING_FIXTURES.filter((record) => record.hasActivityBooking).map((record) => ({
        participantId: record.participantId,
        state: record.hasActivityScan ? 'attended' : 'missing_scan',
      })),
    []
  );

  const transportComparison = useMemo(
    () =>
      TRACKING_FIXTURES.filter((record) => record.hasTransportAssignment).map((record) => ({
        participantId: record.participantId,
        state: record.hasTransportScan ? 'boarded' : 'not_boarded',
      })),
    []
  );

  return (
    <PagePermissionGuard
      pageName="scanning-tracking"
      operation="read"
      fallback={<AccessDenied />}
    >
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Scanning tracking dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Refresh count: {refreshCount}</p>
            <Button onClick={() => setRefreshCount((previous) => previous + 1)}>Refresh</Button>
            <p>On-site: {headcounts.onSite}</p>
            <p>Off-site: {headcounts.offSite}</p>
            <p>Never scanned: {headcounts.neverScanned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Activity attendance compare</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              {activityComparison.map((entry) => (
                <li key={entry.participantId}>
                  <p>{entry.participantId}</p>
                  <p>{entry.state}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transport boarding compare</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              {transportComparison.map((entry) => (
                <li key={entry.participantId}>
                  <p>{entry.participantId}</p>
                  <p>{entry.state}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
