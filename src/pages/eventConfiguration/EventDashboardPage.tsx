import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FileDisplay,
} from '@solvera/pace-core/components';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { Calendar } from '@solvera/pace-core/icons';
import { PagePermissionGuard, useSecureSupabase } from '@solvera/pace-core/rbac';
import { formatDate } from '@solvera/pace-core/utils';
import { useDashboardCounts } from '@/features/eventConfiguration/dashboard';
import { computeEventEndDate, formatEventLogoFallback } from '@/features/eventConfiguration/shared';
import type { EventLike } from '@/features/eventConfiguration/types';
import { useEventLogoReference } from '@/features/eventConfiguration/useEventLogoReference';

interface DashboardNavCard {
  key: string;
  title: string;
  description: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  countKind: 'forms' | 'applications' | 'registrationTypes' | 'none';
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 3v18h18" />
      <path d="M7 15v3" />
      <path d="M12 10v8" />
      <path d="M17 6v12" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 22s7-5.7 7-12a7 7 0 1 0-14 0c0 6.3 7 12 7 12Z" />
      <circle
        cx="12"
        cy="10"
        r="2.5"
      />
    </svg>
  );
}

const NAV_CARDS: ReadonlyArray<DashboardNavCard> = [
  {
    key: 'forms',
    title: 'Forms',
    description: 'Design and manage event forms.',
    to: '/forms',
    icon: CheckIcon,
    countKind: 'forms',
  },
  {
    key: 'applications',
    title: 'Applications',
    description: 'Review and manage submitted applications.',
    to: '/applications',
    icon: FileTextIcon,
    countKind: 'applications',
  },
  {
    key: 'registration-types',
    title: 'Registration Types',
    description: 'Configure participant registration pathways.',
    to: '/registration-types',
    icon: Calendar,
    countKind: 'registrationTypes',
  },
  {
    key: 'reports',
    title: 'Reports',
    description: 'View reporting and operational snapshots.',
    to: '/reports',
    icon: BarChartIcon,
    countKind: 'none',
  },
  {
    key: 'communications',
    title: 'Communications',
    description: 'Prepare and send event communications.',
    to: '/communications',
    icon: MailIcon,
    countKind: 'none',
  },
];

function getCardCount(
  countKind: DashboardNavCard['countKind'],
  counts: ReturnType<typeof useDashboardCounts>
): string | null {
  if (countKind === 'none') {
    return null;
  }

  const value = counts[countKind];
  if (counts.isLoading && value == null) {
    return '…';
  }
  if (!counts.isLoading && value == null) {
    return '—';
  }
  return `${value ?? 0}`;
}

function eventField(selectedEvent: EventLike | null, fieldName: keyof EventLike): string | null {
  const value = selectedEvent?.[fieldName];
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

function eventNumberField(selectedEvent: EventLike | null, fieldName: keyof EventLike): number | null {
  const value = selectedEvent?.[fieldName];
  if (typeof value === 'number') {
    return value;
  }
  return null;
}

export function EventDashboardPage() {
  const { selectedEvent } = useEvents();
  const { selectedEventId, selectedOrganisationId, appId } = useUnifiedAuth();
  const secureSupabase = useSecureSupabase();
  const counts = useDashboardCounts(selectedEventId);
  const { data: logoRef } = useEventLogoReference(selectedEventId);

  if (selectedEvent == null || selectedEventId == null) {
    return (
      <main className="grid min-h-[40vh] place-items-center">
        <p>Select an event from the header to begin.</p>
      </main>
    );
  }

  const selectedEventLike = selectedEvent as EventLike;
  const eventName = eventField(selectedEventLike, 'event_name') ?? 'Event';
  const eventDate = eventField(selectedEventLike, 'event_date');
  const eventDays = eventNumberField(selectedEventLike, 'event_days') ?? 1;
  const eventVenue = eventField(selectedEventLike, 'event_venue');
  const eventEndDate = computeEventEndDate(eventDate, eventDays);
  const showEndDate = eventDate != null && eventDays > 1 && eventEndDate != null;
  const logoFallback = formatEventLogoFallback(eventName);

  return (
    <PagePermissionGuard
      pageName="event-dashboard"
      operation="read"
      scope={{
        organisationId: selectedOrganisationId,
        eventId: selectedEventId,
        appId: appId ?? undefined,
      }}
      fallback={null}
    >
    <main className="grid gap-4">
      <section className="grid gap-1">
        <h1>Event Dashboard</h1>
        <p>Manage this event&apos;s settings, forms, applications, and reporting.</p>
      </section>

      <Card>
        <CardHeader className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <section className="grid gap-2">
            <CardTitle>{eventName}</CardTitle>
            <CardDescription className="grid gap-2">
              <p className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
                <Calendar className="size-4" />
                {eventDate != null ? formatDate(eventDate) : 'No date set'}
              </p>
              {showEndDate ? <p>Ends: {formatDate(eventEndDate?.toISOString() ?? '')}</p> : null}
              <p className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
                <MapPinIcon className="size-4" />
                {eventVenue ?? 'No venue set'}
              </p>
            </CardDescription>
          </section>

          <section className="grid w-full place-items-center lg:w-64">
            {logoRef != null ? (
              <FileDisplay
                fileReference={logoRef}
                supabase={secureSupabase as never}
                variant="inline"
                className="h-48 w-full object-contain"
                label="Event logo"
              />
            ) : (
              <section className="grid h-48 w-full place-items-center rounded-md border border-dashed">
                <Badge>{logoFallback}</Badge>
              </section>
            )}
          </section>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {NAV_CARDS.map((card) => {
          const Icon = card.icon;
          const count = getCardCount(card.countKind, counts);
          return (
            <Link
              key={card.key}
              to={card.to}
              className="grid rounded-md border border-transparent transition-colors hover:border-main-400 focus-visible:outline-none"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
                    <Icon className="size-4" />
                    {card.title}
                  </CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                {count != null ? (
                  <CardContent>
                    <Badge variant="soft-acc-normal">{count}</Badge>
                  </CardContent>
                ) : null}
              </Card>
            </Link>
          );
        })}
      </section>
    </main>
    </PagePermissionGuard>
  );
}
