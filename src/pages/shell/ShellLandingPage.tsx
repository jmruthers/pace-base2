import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AttentionSection,
  Button,
  EmptyState,
  LoadingSpinner,
  PageHeader,
} from '@solvera/pace-core/components';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import {
  LANDING_DEFAULT_TILE_COUNT,
  orderEventsForLanding,
  shouldShowLandingEventToggle,
  sliceLandingEventTiles,
} from '@solvera/pace-core/events';
import type { EventStub } from '@solvera/pace-core/types';
import { BaseShellEventCard } from '@/features/shell/BaseShellEventCard';
import { useShellLandingAttentionItems } from '@/features/shell/useShellLandingAttentionItems';
import { useShellLandingTileCounts } from '@/features/shell/useShellLandingTileCounts';

export function ShellLandingPage() {
  const navigate = useNavigate();
  const { events, isLoading, setSelectedEvent } = useEvents();
  const { selectedOrganisationId } = useUnifiedAuth();
  const [showAll, setShowAll] = useState(false);

  const orderedEvents = useMemo(() => orderEventsForLanding(events), [events]);
  const visibleEvents = useMemo(
    () => sliceLandingEventTiles(orderedEvents, showAll, LANDING_DEFAULT_TILE_COUNT),
    [orderedEvents, showAll]
  );
  const hasMore = shouldShowLandingEventToggle(orderedEvents.length, LANDING_DEFAULT_TILE_COUNT);
  const tileCounts = useShellLandingTileCounts(visibleEvents);

  const openEvent = useCallback(
    (event: EventStub) => {
      setSelectedEvent(event);
      navigate('/event-dashboard');
    },
    [navigate, setSelectedEvent]
  );

  const openEventApplications = useCallback(
    (event: EventStub) => {
      setSelectedEvent(event);
      navigate('/applications');
    },
    [navigate, setSelectedEvent]
  );

  const attentionItems = useShellLandingAttentionItems(orderedEvents, openEventApplications);

  const eventCountLabel =
    orderedEvents.length === 1 ? '1 event' : `${orderedEvents.length} events`;

  if (isLoading) {
    return (
      <main className="grid min-h-[40vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="grid gap-6">
      <PageHeader
        title="Choose an event"
        subtitle={
          selectedOrganisationId != null
            ? `You operate ${eventCountLabel} for this organisation. Pick one to configure forms, review applications, plan units, and run the gate.`
            : `You operate ${eventCountLabel}. Pick one to configure forms, review applications, plan units, and run the gate.`
        }
        breadcrumbItems={[
          { label: 'pace-base', href: '/' },
          { label: 'Events' },
        ]}
        actions={
          <>
            <Button variant="secondary" type="button" onClick={() => navigate('/configuration')}>
              Find by code
            </Button>
            <Button variant="default" type="button" onClick={() => navigate('/configuration')}>
              New event
            </Button>
          </>
        }
      />

      {orderedEvents.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Create an event to start configuring forms, applications, and operations."
          action={
            <Button variant="default" type="button" onClick={() => navigate('/configuration')}>
              New event
            </Button>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleEvents.map((event, index) => {
              const counts = tileCounts[index];

              return (
                <BaseShellEventCard
                  key={event.id}
                  event={event}
                  onSelect={openEvent}
                  applications={counts.applications}
                  forms={counts.forms}
                  expectedParticipants={counts.expectedParticipants}
                  isLoading={counts.isLoading}
                />
              );
            })}
          </section>

          {hasMore ? (
            <section className="grid justify-items-start">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? 'Show fewer' : `Show all (${orderedEvents.length})`}
              </Button>
            </section>
          ) : null}
        </>
      )}

      <AttentionSection
        title="Needs attention"
        items={attentionItems}
        emptyTitle="Nothing needs attention"
        emptyDescription="You are all caught up — nothing to action right now."
      />
    </main>
  );
}
