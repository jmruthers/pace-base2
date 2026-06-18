import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AttentionSection,
  Button,
  EmptyState,
  EventTile,
  LoadingSpinner,
  PageHeader,
} from '@solvera/pace-core/components';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { Calendar, MapPin } from '@solvera/pace-core/icons';
import type { EventStub } from '@solvera/pace-core/types';
import { formatDate } from '@solvera/pace-core/utils';
import { formatEventLogoFallback } from '@/features/eventConfiguration/shared';
import {
  eventDisplayName,
  orderEventsForShellLanding,
  readEventNumber,
  readEventString,
  SHELL_LANDING_DEFAULT_TILE_COUNT,
  toEventDateChip,
} from '@/features/shell/shellLandingHelpers';
import { useShellLandingAttentionItems } from '@/features/shell/useShellLandingAttentionItems';
import { useShellLandingTileCounts } from '@/features/shell/useShellLandingTileCounts';

function EventTileMeta({ event }: { event: EventStub }) {
  const eventDate = readEventString(event, ['event_date', 'date']);
  const eventDays = readEventNumber(event, ['event_days']) ?? 1;
  const venue = readEventString(event, ['event_venue', 'venue']);

  return (
    <>
      {eventDate != null ? (
        <p className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
          <Calendar className="size-4" aria-hidden />
          {formatDate(eventDate)}
          {eventDays > 1 ? ` · ${eventDays} days` : ''}
        </p>
      ) : null}
      {venue != null ? (
        <p className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
          <MapPin className="size-4" aria-hidden />
          {venue}
        </p>
      ) : null}
    </>
  );
}

function EventTileFoot({
  applications,
  forms,
  expectedParticipants,
  isLoading,
}: {
  applications: number | null;
  forms: number | null;
  expectedParticipants: number | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <section className="grid grid-flow-col auto-cols-max items-center gap-3">
        <span>Loading counts…</span>
      </section>
    );
  }

  return (
    <section className="grid grid-flow-col auto-cols-max items-center gap-3">
      <span>
        <strong>{applications ?? 0}</strong> apps
      </span>
      <span>
        <strong>{forms ?? 0}</strong> forms
      </span>
      <span>
        <strong>{expectedParticipants ?? 0}</strong> expected
      </span>
    </section>
  );
}

export function ShellLandingPage() {
  const navigate = useNavigate();
  const { events, isLoading, setSelectedEvent } = useEvents();
  const { selectedOrganisationId } = useUnifiedAuth();
  const [showAll, setShowAll] = useState(false);

  const orderedEvents = useMemo(() => orderEventsForShellLanding(events), [events]);
  const visibleEvents = showAll
    ? orderedEvents
    : orderedEvents.slice(0, SHELL_LANDING_DEFAULT_TILE_COUNT);
  const hasMore = orderedEvents.length > SHELL_LANDING_DEFAULT_TILE_COUNT;
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
              const name = eventDisplayName(event);
              const counts = tileCounts[index];

              return (
                <EventTile
                  key={event.id}
                  title={name}
                  dateChip={toEventDateChip(event)}
                  imageGlyph={formatEventLogoFallback(name)}
                  meta={<EventTileMeta event={event} />}
                  foot={
                    <EventTileFoot
                      applications={counts.applications}
                      forms={counts.forms}
                      expectedParticipants={counts.expectedParticipants}
                      isLoading={counts.isLoading}
                    />
                  }
                  onClick={() => openEvent(event)}
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
