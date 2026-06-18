import type { ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AttentionSection,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardGrid,
  CardHeader,
  CardTitle,
  EntityHero,
  FileDisplay,
  HeroLogo,
  PageHeader,
} from '@solvera/pace-core/components';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { Calendar, MapPin, Search, Settings, SquarePen } from '@solvera/pace-core/icons';
import {
  AccessDenied,
  PagePermissionGuard,
  useResolvedScope,
  useStorageCapableClient,
} from '@solvera/pace-core/rbac';
import { formatDate } from '@solvera/pace-core/utils';
import { useDashboardCounts } from '@/features/eventConfiguration/dashboard';
import { useEventDashboardMetrics } from '@/features/eventConfiguration/dashboardMetrics';
import { formatEventDateRange } from '@/features/eventConfiguration/eventDashboardDisplay';
import { formatEventLogoFallback } from '@/features/eventConfiguration/shared';
import type { DashboardCountState, EventLike } from '@/features/eventConfiguration/types';
import { useEventLogoReference } from '@/features/eventConfiguration/useEventLogoReference';

interface DashboardLauncherCard {
  key: string;
  title: string;
  description: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  countKind: 'registrationTypes' | 'forms' | 'units' | 'activities' | 'none';
}

function UsersIcon({ className }: { className?: string }) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

type CountKind = DashboardLauncherCard['countKind'];

function SparkleIcon({ className }: { className?: string }) {
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
      <path d="M12 3 13.5 8.5 19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
    </svg>
  );
}

const LAUNCHER_CARDS: ReadonlyArray<DashboardLauncherCard> = [
  {
    key: 'event-details',
    title: 'Event details',
    description: 'Name, dates, venue, and registration scope.',
    to: '/configuration',
    icon: Settings,
    countKind: 'none',
  },
  {
    key: 'registration-types',
    title: 'Registration types',
    description: 'Pathways, capacities, and fees.',
    to: '/registration-types',
    icon: Calendar,
    countKind: 'registrationTypes',
  },
  {
    key: 'forms',
    title: 'Forms',
    description: 'Author and publish event forms.',
    to: '/forms',
    icon: SquarePen,
    countKind: 'forms',
  },
  {
    key: 'units',
    title: 'Unit assignments',
    description: 'Allocate participants to operating units.',
    to: '/units',
    icon: UsersIcon,
    countKind: 'units',
  },
  {
    key: 'activities',
    title: 'Activities',
    description: 'Offerings, sessions, and bookings.',
    to: '/activities',
    icon: SparkleIcon,
    countKind: 'activities',
  },
  {
    key: 'scanning',
    title: 'Scanning',
    description: 'Set up scan points and run the gate.',
    to: '/scanning',
    icon: Search,
    countKind: 'none',
  },
];

function getLauncherCount(
  countKind: CountKind,
  counts: DashboardCountState
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

function formatMetricValue(value: number | null, isLoading: boolean): string {
  if (isLoading && value == null) {
    return '…';
  }
  if (!isLoading && value == null) {
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

const EVENT_LOGO_BUCKET = 'public-files';

export function EventDashboardPage() {
  const navigate = useNavigate();
  const { selectedEvent } = useEvents();
  const { selectedEventId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();
  const storageSupabase = useStorageCapableClient();
  const counts = useDashboardCounts(selectedEventId);
  const metrics = useEventDashboardMetrics(selectedEventId);
  const { data: logoRef } = useEventLogoReference(selectedEventId);
  const hasSelectedEvent = selectedEvent != null && selectedEventId != null;
  const selectedEventLike = selectedEvent as EventLike | null;
  const eventName = eventField(selectedEventLike, 'event_name') ?? 'Event';
  const eventDate = eventField(selectedEventLike, 'event_date');
  const eventDays = eventNumberField(selectedEventLike, 'event_days') ?? 1;
  const eventVenue = eventField(selectedEventLike, 'event_venue');
  const eventDescription = eventField(selectedEventLike, 'description');
  const expectedParticipants = eventNumberField(selectedEventLike, 'expected_participants') ?? 0;
  const logoFallback = formatEventLogoFallback(eventName);
  const totalApplications = counts.applications ?? 0;
  const approvedApplications = metrics.approvedApplications ?? 0;
  const awaitingApplications = metrics.awaitingApplications ?? 0;
  const publishedForms = metrics.publishedForms ?? 0;
  const placesLeft = Math.max(0, expectedParticipants - approvedApplications);
  const allocationPercent =
    expectedParticipants > 0 ? Math.round((approvedApplications / expectedParticipants) * 100) : 0;

  const attentionItems =
    awaitingApplications > 0
      ? [
          {
            id: 'event-dashboard-awaiting-applications',
            title: 'Applications awaiting approval',
            kind: 'Applications',
            sub: `${awaitingApplications} application${awaitingApplications === 1 ? '' : 's'} to review`,
            tone: 'warn' as const,
            onClick: () => navigate('/applications'),
          },
        ]
      : [];

  return (
    <PagePermissionGuard
      pageName="EventDashboardPage"
      operation="read"
      scope={{
        organisationId,
        eventId,
        appId: appId ?? undefined,
      }}
      fallback={<AccessDenied />}
    >
      {!hasSelectedEvent ? (
        <main className="grid min-h-[40vh] place-items-center">
          <p>Select an event from the header to begin.</p>
        </main>
      ) : (
        <main className="grid gap-6">
          <PageHeader
            breadcrumbItems={[
              { label: 'pace-base', href: '/' },
              { label: eventName },
            ]}
            title={eventName}
            subtitle="Event-level configuration, applications, and operations."
          />

          <EntityHero
            media={
              logoRef != null ? (
                <FileDisplay
                  fileReference={logoRef}
                  supabase={storageSupabase}
                  bucket={EVENT_LOGO_BUCKET}
                  variant="inline"
                  className="h-16 w-16 object-contain"
                  label="Event logo"
                />
              ) : (
                <HeroLogo code={logoFallback} alt={`${eventName} logo`} />
              )
            }
            title={<h2>{eventName}</h2>}
            meta={[
              {
                icon: <Calendar className="size-4" aria-hidden />,
                text: formatEventDateRange(eventDate, eventDays, formatDate),
              },
              {
                icon: <MapPin className="size-4" aria-hidden />,
                text: eventVenue ?? 'No venue set',
              },
              {
                icon: <UsersIcon className="size-4" />,
                text: `${expectedParticipants} expected participants`,
              },
            ]}
            description={eventDescription ?? undefined}
            actions={
              <>
                <Button variant="default" type="button" onClick={() => navigate('/applications')}>
                  Review applications
                </Button>
                <Button variant="secondary" type="button" onClick={() => navigate('/forms')}>
                  Edit forms
                </Button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Applications</CardTitle>
                <CardDescription>
                  {formatMetricValue(approvedApplications, metrics.isLoading)} approved ·{' '}
                  {formatMetricValue(awaitingApplications, metrics.isLoading)} waiting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="soft-main-normal">
                  {formatMetricValue(totalApplications, counts.isLoading)}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Awaiting approval</CardTitle>
                <CardDescription>
                  {awaitingApplications === 0 ? 'All caught up' : 'Review pending applications'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant={awaitingApplications > 0 ? 'soft-acc-normal' : 'soft-main-normal'}>
                  {formatMetricValue(awaitingApplications, metrics.isLoading)}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Places left</CardTitle>
                <CardDescription>{allocationPercent}% allocated</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="soft-main-normal">{placesLeft}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Forms published</CardTitle>
                <CardDescription>
                  {formatMetricValue(counts.forms, counts.isLoading)} total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="soft-main-normal">
                  {formatMetricValue(publishedForms, metrics.isLoading)}
                </Badge>
              </CardContent>
            </Card>
          </section>

          <AttentionSection
            title="Needs attention"
            items={attentionItems}
            emptyTitle="Nothing needs attention"
            emptyDescription="You are all caught up — nothing to action right now."
          />

          <CardGrid heading="Event setup" columns={{ md: 2, lg: 3 }}>
            {LAUNCHER_CARDS.map((card) => {
              const Icon = card.icon;
              const count = getLauncherCount(card.countKind, counts);
              return (
                <Link key={card.key} to={card.to} className="contents no-underline">
                  <Card fill>
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
          </CardGrid>
        </main>
      )}
    </PagePermissionGuard>
  );
}
