import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import { getQueueSyncBadge } from '@/features/scanningSetup/scanningBadges';
import type { ScanningSetupController } from '@/pages/scanning/hooks/useScanningSetupController';
import { SCAN_SETUP_MANIFEST_TYPES, queueFailureReasonLabel } from '@/pages/scanning/components/scanSetupHelpers';

const STANDARD_DATA_TABLE_FEATURES = {
  search: true,
  pagination: true,
  sorting: true,
  filtering: false,
  export: false,
  import: false,
  grouping: false,
  columnVisibility: false,
  editing: false,
  creation: false,
  selection: false,
  deletion: false,
  deleteSelected: false,
  columnReordering: false,
  hierarchical: false,
} as const;

export function ScanningSetupConfiguredContent({ ctl }: { ctl: ScanningSetupController }) {
  return (
    <>
      <ScanningSetupScanPointsSection ctl={ctl} />

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Manifests</CardTitle>
            <CardDescription>Download on-demand participant manifests for offline scanning.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
            {SCAN_SETUP_MANIFEST_TYPES.map((contextType) => (
              <Button
                key={contextType}
                type="button"
                variant="outline"
                disabled={ctl.manifestLoading[contextType]}
                onClick={() => void ctl.onManifestDownload(contextType)}
              >
                {ctl.manifestLoading[contextType] ? (
                  <LoadingSpinner />
                ) : (
                  `Download ${contextType[0].toUpperCase()}${contextType.slice(1)} Manifest`
                )}
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      <ScanningSetupQueueSection ctl={ctl} />
      <ScanningSetupConflictsSection ctl={ctl} />
      <ScanningSetupHistorySection ctl={ctl} />
    </>
  );
}

function ScanningSetupScanPointsSection({ ctl }: { ctl: ScanningSetupController }) {
  return (
    <section className="grid gap-2">
      {ctl.canCreate && !ctl.createLoading ? (
        <section className="grid justify-end">
          <Button type="button" onClick={ctl.openCreateDialog}>
            Create scan point
          </Button>
        </section>
      ) : null}

      {ctl.scanPointsQuery.error != null ? (
        <Alert variant="destructive">
          <AlertDescription>{NormalizeSupabaseError(ctl.scanPointsQuery.error).message}</AlertDescription>
          <section>
            <Button type="button" variant="outline" size="small" onClick={ctl.retryScanPointsQuery}>
              Retry
            </Button>
          </section>
        </Alert>
      ) : (
        <>
          <DataTable
            data={ctl.scanPoints as unknown as Array<Record<string, unknown>>}
            columns={ctl.scanPointColumns as never}
            rbac={{ pageName: 'scanning' }}
            title="Scan Points"
            isLoading={ctl.scanPointsQuery.isLoading}
            emptyState={{
              title: 'No scan points configured',
              description: 'No scan points have been configured for this event.',
            }}
            features={{ ...STANDARD_DATA_TABLE_FEATURES }}
          />
          {ctl.scanPoints.length === 0 && ctl.canCreate && !ctl.createLoading ? (
            <section className="grid justify-start">
              <Button type="button" onClick={ctl.openCreateDialog}>
                Create scan point
              </Button>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}

function ScanningSetupQueueSection({ ctl }: { ctl: ScanningSetupController }) {
  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Queue upload status</CardTitle>
          <CardDescription>Shows local upload state for queue entries in this event.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <nav className="grid grid-flow-col auto-cols-max gap-2" aria-label="Queue upload summary">
            <Badge variant={getQueueSyncBadge('pending').variant} role="status">
              {getQueueSyncBadge('pending').label}: {ctl.queueCounts.pending}
            </Badge>
            <Badge
              variant={getQueueSyncBadge('syncing').variant}
              className={getQueueSyncBadge('syncing').className}
              role="status"
            >
              {getQueueSyncBadge('syncing').label}: {ctl.queueCounts.syncing}
            </Badge>
            <Badge variant={getQueueSyncBadge('synced').variant} role="status">
              {getQueueSyncBadge('synced').label}: {ctl.queueCounts.synced}
            </Badge>
            <Badge variant={getQueueSyncBadge('failed').variant} role="status">
              {getQueueSyncBadge('failed').label}: {ctl.queueCounts.failed}
            </Badge>
          </nav>
          {ctl.canUpdate && ctl.queueCounts.failed > 0 ? (
            <ul className="grid gap-2">
              {ctl.queueFailedEntries.map((entry) => (
                <li key={entry.local_id} className="rounded-md border border-border">
                  <section className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2">
                    <article className="grid">
                      <small>Queue entry {entry.local_id}</small>
                      <small>{queueFailureReasonLabel(entry.failure_reason)}</small>
                    </article>
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      onClick={() => void ctl.onRetryFailedEntry(entry)}
                      aria-label={`Retry failed queue entry ${entry.local_id}`}
                    >
                      Retry
                    </Button>
                  </section>
                </li>
              ))}
            </ul>
          ) : null}
          {ctl.queueSummaryQuery.isLoading ? <small>Refreshing queue status...</small> : null}
        </CardContent>
      </Card>
    </section>
  );
}

function ScanningSetupConflictsSection({ ctl }: { ctl: ScanningSetupController }) {
  return (
    <section>
      {ctl.conflictsQuery.error != null ? (
        <Alert variant="destructive">
          <AlertDescription>{NormalizeSupabaseError(ctl.conflictsQuery.error).message}</AlertDescription>
          <section>
            <Button type="button" variant="outline" size="small" onClick={ctl.retryConflictsQuery}>
              Retry
            </Button>
          </section>
        </Alert>
      ) : (
        <DataTable
          data={(ctl.conflictsQuery.data ?? []) as unknown as Array<Record<string, unknown>>}
          columns={ctl.conflictColumns as never}
          rbac={{ pageName: 'scanning' }}
          title="Sync Conflicts"
          isLoading={ctl.conflictsQuery.isLoading}
          emptyState={{ description: 'No unresolved sync conflicts.' }}
          features={{ ...STANDARD_DATA_TABLE_FEATURES }}
        />
      )}
    </section>
  );
}

function ScanningSetupHistorySection({ ctl }: { ctl: ScanningSetupController }) {
  return (
    <section>
      {ctl.historyQuery.error != null ? (
        <Alert variant="destructive">
          <AlertDescription>{NormalizeSupabaseError(ctl.historyQuery.error).message}</AlertDescription>
          <section>
            <Button type="button" variant="outline" size="small" onClick={ctl.retryHistoryQuery}>
              Retry
            </Button>
          </section>
        </Alert>
      ) : (
        <DataTable
          data={(ctl.historyQuery.data ?? []) as unknown as Array<Record<string, unknown>>}
          columns={ctl.historyColumns as never}
          rbac={{ pageName: 'scanning' }}
          title="Scan History"
          isLoading={ctl.historyQuery.isLoading}
          emptyState={{ description: 'No scan events recorded yet.' }}
          features={{ ...STANDARD_DATA_TABLE_FEATURES }}
        />
      )}
    </section>
  );
}
