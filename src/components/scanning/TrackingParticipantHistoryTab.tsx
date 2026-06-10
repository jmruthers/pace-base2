import {
  Button,
  DataTable,
  Input,
  Label,
  LoadingSpinner,
  TabsContent,
} from '@solvera/pace-core/components';
import type { ScanningTrackingPageController } from '@/hooks/scanning/useScanningTrackingPageController';
import { useTrackingHistoryColumns } from '@/hooks/scanning/useTrackingHistoryColumns';
import { TrackingQueryCapNotice, TrackingQueryErrorPanel } from '@/components/scanning/TrackingQueryPanels';

export function TrackingParticipantHistoryTab({ ctl }: { ctl: ScanningTrackingPageController }) {
  const historyColumns = useTrackingHistoryColumns();

  return (
    <TabsContent value="participant-history" className="grid gap-3">
      {ctl.showStepOneLoading ? (
        <section className="grid place-items-center py-8">
          <LoadingSpinner />
        </section>
      ) : (
        <>
          <Label htmlFor="participant-search">
            Search participant
            <Input
              id="participant-search"
              value={ctl.searchTerm}
              onChange={(value) => {
                ctl.setSearchTerm(value);
                if (value.trim().length < 2) {
                  ctl.setSelectedParticipant(null);
                }
              }}
              placeholder="Enter name or card identifier…"
            />
          </Label>

          {ctl.selectedParticipant != null ? (
            <section className="grid grid-cols-[1fr_auto] items-center gap-2">
              <small>
                {ctl.selectedParticipant.displayName}
                {ctl.selectedParticipant.cardIdentifier != null
                  ? ` (${ctl.selectedParticipant.cardIdentifier})`
                  : ''}
              </small>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Clear selected participant"
                onClick={() => {
                  ctl.setSelectedParticipant(null);
                  ctl.setSearchTerm('');
                  ctl.setDebouncedSearchTerm('');
                }}
              >
                ×
              </Button>
            </section>
          ) : null}

          {ctl.debouncedSearchTerm.length >= 2 ? (
            <section className="rounded-md border border-border p-2">
              {ctl.searchResultsQuery.isLoading ? (
                <LoadingSpinner />
              ) : ctl.searchResultsQuery.error != null ? (
                <TrackingQueryErrorPanel
                  error={ctl.searchResultsQuery.error}
                  onRetry={ctl.retrySearchResults}
                />
              ) : (ctl.searchResultsQuery.data ?? []).length === 0 ? (
                <small>No participants found.</small>
              ) : (
                <ul className="grid gap-1">
                  {(ctl.searchResultsQuery.data ?? []).map((row) => (
                    <li key={row.applicationId}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          ctl.setSelectedParticipant(row);
                          ctl.setSearchTerm(row.displayName);
                        }}
                      >
                        <section className="grid gap-0.5 text-left">
                          <span>{row.displayName}</span>
                          {row.cardIdentifier != null ? <small>{row.cardIdentifier}</small> : null}
                        </section>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {ctl.selectedParticipant == null ? (
            <small>Search for a participant to view their scan history.</small>
          ) : ctl.participantHistoryQuery.error != null ? (
            <TrackingQueryErrorPanel
              error={ctl.participantHistoryQuery.error}
              onRetry={ctl.retryParticipantHistory}
            />
          ) : ctl.participantHistoryQuery.isLoading ? (
            <section className="grid place-items-center py-8">
              <LoadingSpinner />
            </section>
          ) : (
            <>
              {ctl.participantHistoryQuery.data != null && ctl.participantHistoryQuery.data.length === 500 ? (
                <TrackingQueryCapNotice />
              ) : null}
              <DataTable
                data={ctl.historyRows as unknown as Array<Record<string, unknown>>}
                columns={historyColumns as never}
                rbac={{ pageName: 'ScanningPage' }}
                title="Participant history"
                isLoading={ctl.participantHistoryQuery.isLoading}
                emptyState={{
                  description: 'No scan events recorded for this participant in this event.',
                }}
                features={{
                  search: false,
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
                }}
              />
            </>
          )}
        </>
      )}
    </TabsContent>
  );
}
