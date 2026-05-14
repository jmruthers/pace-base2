/* eslint-disable max-lines-per-function, complexity -- BA16 tracking surface */
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Input,
  Label,
  LoadingSpinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@solvera/pace-core/components';
import { ChevronLeft } from '@solvera/pace-core/icons';
import { useEvents } from '@solvera/pace-core/hooks';
import {
  AccessDenied,
  PagePermissionGuard,
  useResolvedScope,
  useSecureSupabase,
} from '@solvera/pace-core/rbac';
import { formatDateTime, NormalizeSupabaseError } from '@solvera/pace-core/utils';
import {
  deriveTrackingSnapshot,
  type PointSummaryRow,
  type PresenceGroup,
  type SupabaseLike,
  type TrackingSearchResult,
  type TrackingValidationResult,
} from '@/features/scanningTracking/configuration';
import { useTrackingDashboardData } from '@/features/scanningTracking/useTrackingDashboardData';

type ScopeSelection = {
  id?: unknown;
  name?: unknown;
};

function selectedId(value: unknown): string | null {
  if (value != null && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }
  return null;
}

function selectedName(value: unknown): string {
  if (value != null && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim().length > 0) {
      return name;
    }
  }
  return 'selected event';
}

function directionBadge(direction: 'in' | 'out' | 'both' | 'neutral') {
  if (direction === 'in') {
    return 'In';
  }
  if (direction === 'out') {
    return 'Out';
  }
  if (direction === 'both') {
    return 'Both';
  }
  return 'Neutral';
}

function resultBadge(result: TrackingValidationResult): { label: string; variant: string; ariaLabel?: string } {
  if (result === 'accepted') {
    return { label: 'Accepted', variant: 'solid-main-normal' };
  }
  if (result === 'accepted_override') {
    return { label: 'Accepted (override)', variant: 'solid-acc-normal' };
  }
  if (result === 'rejected') {
    return { label: 'Rejected', variant: 'solid-sec-muted' };
  }
  return {
    label: 'Upload conflict',
    variant: 'outline-acc-muted',
    ariaLabel: 'Upload conflict — see participant history for details',
  };
}

function QueryErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{NormalizeSupabaseError(error).message}</AlertDescription>
      <section>
        <Button type="button" variant="outline" size="small" onClick={onRetry}>
          Retry
        </Button>
      </section>
    </Alert>
  );
}

function QueryCapNotice() {
  return (
    <Alert variant="default">
      <AlertDescription>
        Result set capped at 500 rows. Some data may be omitted. Consider narrowing the event scope.
      </AlertDescription>
    </Alert>
  );
}

function ExpandableGroupList({
  groups,
  expandedIds,
  setExpandedIds,
}: {
  groups: PresenceGroup[];
  expandedIds: Record<string, boolean>;
  setExpandedIds: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <ul className="grid gap-2">
      {groups.map((group) => {
        const expanded = expandedIds[group.key] === true;
        const participantListId = `${group.key}-participants`;
        return (
          <li key={group.key} className="rounded-md border border-border">
            <section className="grid gap-2 p-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setExpandedIds((state) => ({
                    ...state,
                    [group.key]: !expanded,
                  }))
                }
                aria-expanded={expanded}
                aria-controls={participantListId}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.label} — ${group.count} participants`}
              >
                {group.unknownLocation ? (
                  <small>
                    {group.label} — {group.count}
                  </small>
                ) : (
                  <span>
                    {group.label} — {group.count}
                  </span>
                )}
              </Button>
              {expanded ? (
                <ul id={participantListId} className="grid gap-1">
                  {group.participants.map((participant) => (
                    <li key={`${group.key}:${participant.memberId ?? participant.displayName}`}>
                      <section className="grid grid-cols-[1fr_auto] gap-2">
                        <span>{participant.displayName}</span>
                        <small>{participant.scannedAt != null ? formatDateTime(participant.scannedAt) : '—'}</small>
                      </section>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </li>
        );
      })}
    </ul>
  );
}

function ExpandablePointRows({
  rows,
  emptyCopy,
  expandedIds,
  setExpandedIds,
}: {
  rows: PointSummaryRow[];
  emptyCopy: string;
  expandedIds: Record<string, boolean>;
  setExpandedIds: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
  if (rows.length === 0) {
    return <small>{emptyCopy}</small>;
  }
  return (
    <ul className="grid gap-2">
      {rows.map((row) => {
        const expanded = expandedIds[row.pointId] === true;
        const participantListId = `${row.pointId}-participants`;
        return (
          <li key={row.pointId} className="rounded-md border border-border">
            <section className="grid gap-2 p-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setExpandedIds((state) => ({
                    ...state,
                    [row.pointId]: !expanded,
                  }))
                }
                aria-expanded={expanded}
                aria-controls={participantListId}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${row.name} — ${row.count} participants`}
              >
                <section className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <span>{row.name}</span>
                  <Badge variant="solid-sec-muted">{directionBadge(row.direction)}</Badge>
                  <span>{row.count}</span>
                </section>
              </Button>
              {expanded ? (
                <ul id={participantListId} className="grid gap-1">
                  {row.participants.length === 0 ? (
                    <li>
                      <small>No accepted scans at this scan point.</small>
                    </li>
                  ) : (
                    row.participants.map((participant) => (
                      <li key={`${row.pointId}:${participant.memberId ?? participant.displayName}`}>
                        <section className="grid grid-cols-[1fr_auto] gap-2">
                          <span>{participant.displayName}</span>
                          <small>{participant.scannedAt != null ? formatDateTime(participant.scannedAt) : '—'}</small>
                        </section>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </section>
          </li>
        );
      })}
    </ul>
  );
}

export function ScanningTrackingPage() {
  const navigate = useNavigate();
  const secureSupabase = useSecureSupabase();
  const eventsContext = useEvents() as unknown as {
    selectedEvent: ScopeSelection | null;
    selectedOrganisation?: ScopeSelection | null;
  };
  const selectedEvent = eventsContext.selectedEvent;
  const selectedOrganisation = eventsContext.selectedOrganisation ?? null;
  const { organisationId: scopeOrganisationId, eventId: scopeEventId, appId } = useResolvedScope();

  const eventId = selectedId(selectedEvent);
  const eventName = selectedName(selectedEvent);
  const organisationId = selectedId(selectedOrganisation);
  const canQuery = secureSupabase != null && eventId != null && organisationId != null;
  const supabase = secureSupabase as unknown as SupabaseLike;

  const [offSiteExpanded, setOffSiteExpanded] = useState<Record<string, boolean>>({});
  const [onSiteExpanded, setOnSiteExpanded] = useState<Record<string, boolean>>({});
  const [activityExpanded, setActivityExpanded] = useState<Record<string, boolean>>({});
  const [transportExpanded, setTransportExpanded] = useState<Record<string, boolean>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<TrackingSearchResult | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const selectedMemberId = selectedParticipant?.memberId ?? null;

  const {
    scanPointsQuery,
    approvedParticipantsQuery,
    memberQuery,
    allEventsQuery,
    acceptedEventsQuery,
    searchResultsQuery,
    participantHistoryQuery,
    refreshing,
    lastUpdatedAt,
    refreshTrackingData,
    retryScanPoints,
    retryApprovedParticipants,
    retryAcceptedEvents,
    retryAllEvents,
    retrySearchResults,
    retryParticipantHistory,
  } = useTrackingDashboardData({
    supabase,
    canQuery,
    eventId,
    organisationId,
    debouncedSearchTerm,
    selectedMemberId,
  });

  const snapshot = useMemo(() => {
    return deriveTrackingSnapshot({
      scanPoints: scanPointsQuery.data ?? [],
      approvedApplications: approvedParticipantsQuery.data ?? [],
      memberRows: memberQuery.data ?? [],
      allEvents: allEventsQuery.data ?? [],
      acceptedEvents: acceptedEventsQuery.data ?? [],
    });
  }, [
    acceptedEventsQuery.data,
    allEventsQuery.data,
    approvedParticipantsQuery.data,
    memberQuery.data,
    scanPointsQuery.data,
  ]);

  const onRefresh = async () => {
    if (!canQuery) {
      return;
    }
    try {
      const success = await refreshTrackingData();
      if (!success) {
        throw new Error('Failed to refresh tracking data.');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        description: NormalizeSupabaseError(error).message,
      });
    }
  };

  const historyRows = useMemo(() => {
    const events = participantHistoryQuery.data ?? [];
    return events.map((event) => ({
      ...event,
      scan_point_name: snapshot.pointById[event.scan_point_id]?.name ?? '—',
      direction: snapshot.pointById[event.scan_point_id]?.direction ?? 'neutral',
    }));
  }, [participantHistoryQuery.data, snapshot.pointById]);

  const historyColumns = useMemo<unknown[]>(
    () => [
      {
        id: 'scan_point_name',
        accessorKey: 'scan_point_name',
        header: 'Scan point',
        sortable: true,
        cell: ({ row }: { row: { scan_point_name: string } }) => row.scan_point_name,
      },
      {
        id: 'direction',
        accessorKey: 'direction',
        header: 'Direction',
        sortable: true,
        cell: ({ row }: { row: { direction: 'in' | 'out' | 'both' | 'neutral' } }) => (
          <Badge variant="solid-sec-muted">{directionBadge(row.direction)}</Badge>
        ),
      },
      {
        id: 'result',
        accessorKey: 'validation_result',
        header: 'Result',
        sortable: true,
        cell: ({ row }: { row: { validation_result: TrackingValidationResult } }) => {
          const badge = resultBadge(row.validation_result);
          return (
            <Badge variant={badge.variant as never} aria-label={badge.ariaLabel}>
              {badge.label}
            </Badge>
          );
        },
      },
      {
        id: 'reason',
        accessorKey: 'validation_reason',
        header: 'Reason',
        sortable: true,
        cell: ({ row }: { row: { validation_reason: string | null } }) => row.validation_reason ?? '—',
      },
      {
        id: 'scanned_at',
        accessorKey: 'scanned_at',
        header: 'Scanned at',
        sortable: true,
        cell: ({ row }: { row: { scanned_at: string } }) => formatDateTime(row.scanned_at),
      },
      {
        id: 'device_id',
        accessorKey: 'device_id',
        header: 'Device',
        sortable: true,
        cell: ({ row }: { row: { device_id: string | null } }) => row.device_id ?? '—',
      },
    ],
    []
  );

  const showStepOneError = scanPointsQuery.error != null;
  const showStepOneLoading = scanPointsQuery.isLoading || scanPointsQuery.isFetching;

  if (secureSupabase == null) {
    return (
      <main className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <PagePermissionGuard
      pageName="scanning"
      operation="read"
      scope={{
        organisationId: scopeOrganisationId ?? undefined,
        eventId: scopeEventId ?? undefined,
        appId: appId ?? undefined,
      }}
      fallback={<AccessDenied />}
    >
      <main className="grid gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-start">
          <section className="grid justify-start">
            <Button type="button" variant="ghost" onClick={() => navigate('/scanning')}>
              <ChevronLeft className="size-4" aria-hidden />
              Back to scanning setup
            </Button>
          </section>
          <section className="grid gap-1">
            <h1>Tracking Dashboard</h1>
            <p>Event: {eventName}</p>
            <small>
              Last updated: {lastUpdatedAt != null ? formatDateTime(lastUpdatedAt) : '—'}
            </small>
          </section>
          <section className="grid justify-items-end">
            <Button
              type="button"
              variant="outline"
              disabled={refreshing || !canQuery}
              onClick={() => void onRefresh()}
            >
              {refreshing ? <LoadingSpinner /> : null}
              Refresh
            </Button>
          </section>
        </header>

        {eventId == null || organisationId == null ? (
          <Card>
            <CardHeader>
              <CardTitle>No event selected</CardTitle>
              <CardDescription>
                Select an event from the header to view tracking data.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : showStepOneError ? (
          <QueryErrorPanel
            error={scanPointsQuery.error}
            onRetry={retryScanPoints}
          />
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

            <TabsContent value="site-presence" className="grid gap-4">
              {showStepOneLoading ? (
                <section className="grid place-items-center py-8">
                  <LoadingSpinner />
                </section>
              ) : approvedParticipantsQuery.error != null ? (
                <QueryErrorPanel
                  error={approvedParticipantsQuery.error}
                  onRetry={retryApprovedParticipants}
                />
              ) : allEventsQuery.error != null || acceptedEventsQuery.error != null ? (
                <QueryErrorPanel
                  error={allEventsQuery.error ?? acceptedEventsQuery.error}
                  onRetry={() => {
                    retryAllEvents();
                    retryAcceptedEvents();
                  }}
                />
              ) : approvedParticipantsQuery.isLoading ||
                memberQuery.isLoading ||
                allEventsQuery.isLoading ||
                acceptedEventsQuery.isLoading ? (
                <section className="grid place-items-center py-8">
                  <LoadingSpinner />
                </section>
              ) : (
                <>
                  {allEventsQuery.data != null && allEventsQuery.data.length === 500 ? <QueryCapNotice /> : null}
                  <section className="grid gap-3 sm:grid-cols-3">
                    <article role="status" aria-label={`On-site: ${snapshot.onSiteCount} participants`}>
                      <Card>
                      <CardHeader>
                        <CardTitle>On-site</CardTitle>
                      </CardHeader>
                      <CardContent>{snapshot.onSiteCount}</CardContent>
                      </Card>
                    </article>
                    <article role="status" aria-label={`Off-site: ${snapshot.offSiteCount} participants`}>
                      <Card>
                      <CardHeader>
                        <CardTitle>Off-site</CardTitle>
                      </CardHeader>
                      <CardContent>{snapshot.offSiteCount}</CardContent>
                      </Card>
                    </article>
                    <article role="status" aria-label={`Never Scanned: ${snapshot.neverScannedCount} participants`}>
                      <Card>
                      <CardHeader>
                        <CardTitle>Never Scanned</CardTitle>
                      </CardHeader>
                      <CardContent>{snapshot.neverScannedCount}</CardContent>
                      </Card>
                    </article>
                  </section>

                  <section className="grid gap-2">
                    <h2>On-site locations</h2>
                    {snapshot.onSiteGroups.length === 0 ? (
                      <small>No participants are currently on-site.</small>
                    ) : (
                      <ExpandableGroupList
                        groups={snapshot.onSiteGroups}
                        expandedIds={onSiteExpanded}
                        setExpandedIds={setOnSiteExpanded}
                      />
                    )}
                  </section>

                  <section className="grid gap-2">
                    <h2>Off-site locations</h2>
                    {snapshot.offSiteGroups.length === 0 ? (
                      <small>No participants are currently off-site.</small>
                    ) : (
                      <ExpandableGroupList
                        groups={snapshot.offSiteGroups}
                        expandedIds={offSiteExpanded}
                        setExpandedIds={setOffSiteExpanded}
                      />
                    )}
                  </section>
                </>
              )}
            </TabsContent>

            <TabsContent value="activity" className="grid gap-4">
              {showStepOneLoading ? (
                <section className="grid place-items-center py-8">
                  <LoadingSpinner />
                </section>
              ) : acceptedEventsQuery.error != null ? (
                <QueryErrorPanel
                  error={acceptedEventsQuery.error}
                  onRetry={retryAcceptedEvents}
                />
              ) : acceptedEventsQuery.isLoading ? (
                <section className="grid place-items-center py-8">
                  <LoadingSpinner />
                </section>
              ) : (
                <>
                  {acceptedEventsQuery.data != null && acceptedEventsQuery.data.length === 500 ? (
                    <QueryCapNotice />
                  ) : null}
                  <ExpandablePointRows
                    rows={snapshot.activityRows}
                    emptyCopy="No activity scan points are configured for this event."
                    expandedIds={activityExpanded}
                    setExpandedIds={setActivityExpanded}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="transport" className="grid gap-4">
              {showStepOneLoading ? (
                <section className="grid place-items-center py-8">
                  <LoadingSpinner />
                </section>
              ) : acceptedEventsQuery.error != null ? (
                <QueryErrorPanel
                  error={acceptedEventsQuery.error}
                  onRetry={retryAcceptedEvents}
                />
              ) : acceptedEventsQuery.isLoading ? (
                <section className="grid place-items-center py-8">
                  <LoadingSpinner />
                </section>
              ) : (
                <>
                  {acceptedEventsQuery.data != null && acceptedEventsQuery.data.length === 500 ? (
                    <QueryCapNotice />
                  ) : null}
                  <ExpandablePointRows
                    rows={snapshot.transportRows}
                    emptyCopy="No transport scan points are configured for this event."
                    expandedIds={transportExpanded}
                    setExpandedIds={setTransportExpanded}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="participant-history" className="grid gap-3">
              {showStepOneLoading ? (
                <section className="grid place-items-center py-8">
                  <LoadingSpinner />
                </section>
              ) : (
                <>
                  <Label htmlFor="participant-search">
                    Search participant
                    <Input
                      id="participant-search"
                      value={searchTerm}
                      onChange={(value) => {
                        setSearchTerm(value);
                        if (value.trim().length < 2) {
                          setSelectedParticipant(null);
                        }
                      }}
                      placeholder="Enter name or card identifier…"
                    />
                  </Label>

                  {selectedParticipant != null ? (
                    <section className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <small>
                        {selectedParticipant.displayName}
                        {selectedParticipant.cardIdentifier != null
                          ? ` (${selectedParticipant.cardIdentifier})`
                          : ''}
                      </small>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Clear selected participant"
                        onClick={() => {
                          setSelectedParticipant(null);
                          setSearchTerm('');
                          setDebouncedSearchTerm('');
                        }}
                      >
                        ×
                      </Button>
                    </section>
                  ) : null}

                  {debouncedSearchTerm.length >= 2 ? (
                    <section className="rounded-md border border-border p-2">
                      {searchResultsQuery.isLoading ? (
                        <LoadingSpinner />
                      ) : searchResultsQuery.error != null ? (
                        <QueryErrorPanel
                          error={searchResultsQuery.error}
                          onRetry={retrySearchResults}
                        />
                      ) : (searchResultsQuery.data ?? []).length === 0 ? (
                        <small>No participants found.</small>
                      ) : (
                        <ul className="grid gap-1">
                          {(searchResultsQuery.data ?? []).map((row) => (
                            <li key={row.applicationId}>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedParticipant(row);
                                  setSearchTerm(row.displayName);
                                }}
                              >
                                <section className="grid gap-0.5 text-left">
                                  <span>{row.displayName}</span>
                                  {row.cardIdentifier != null ? (
                                    <small>{row.cardIdentifier}</small>
                                  ) : null}
                                </section>
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ) : null}

                  {selectedParticipant == null ? (
                    <small>
                      Search for a participant to view their scan history.
                    </small>
                  ) : participantHistoryQuery.error != null ? (
                    <QueryErrorPanel
                      error={participantHistoryQuery.error}
                      onRetry={retryParticipantHistory}
                    />
                  ) : participantHistoryQuery.isLoading ? (
                    <section className="grid place-items-center py-8">
                      <LoadingSpinner />
                    </section>
                  ) : (
                    <>
                      {participantHistoryQuery.data != null && participantHistoryQuery.data.length === 500 ? (
                        <QueryCapNotice />
                      ) : null}
                      <DataTable
                        data={historyRows as unknown as Array<Record<string, unknown>>}
                        columns={historyColumns as never}
                        rbac={{ pageName: 'scanning' }}
                        title="Participant history"
                        isLoading={participantHistoryQuery.isLoading}
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
            </Tabs>
          </section>
        )}
      </main>
    </PagePermissionGuard>
  );
}
