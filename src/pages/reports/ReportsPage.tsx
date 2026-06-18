import { useMemo } from 'react';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { ReportBuilder } from '@solvera/pace-core/reporting';
import { useResourcePermissions, useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import {
  createReportingExecutionAdapter,
  createReportingMetadataProvider,
  createReportingTemplateStore,
} from '@/features/reporting/configuration';

type EventLike = {
  id?: unknown;
  event_id?: unknown;
};

function selectedEventId(value: unknown): string | null {
  if (value == null || typeof value !== 'object') {
    return null;
  }
  const eventLike = value as EventLike;
  if (typeof eventLike.event_id === 'string' && eventLike.event_id.length > 0) {
    return eventLike.event_id;
  }
  if (typeof eventLike.id === 'string' && eventLike.id.length > 0) {
    return eventLike.id;
  }
  return null;
}

export function ReportsPage() {
  const secureSupabase = useSecureSupabase();
  const { selectedEvent } = useEvents();
  const { user } = useUnifiedAuth();
  const { organisationId, eventId: resolvedEventId, appId } = useResolvedScope();
  const { canCreate } = useResourcePermissions('ReportsPage');
  const eventId = selectedEventId(selectedEvent);
  const userId = user?.id ?? null;
  const reportingSupabase = secureSupabase as unknown as Parameters<
    typeof createReportingMetadataProvider
  >[0]['supabase'] | null;

  const metadataProvider = useMemo(() => {
    if (reportingSupabase == null) {
      return null;
    }
    return createReportingMetadataProvider({
      supabase: reportingSupabase,
    });
  }, [reportingSupabase]);

  const executionAdapter = useMemo(() => {
    if (reportingSupabase == null || eventId == null) {
      return null;
    }
    return createReportingExecutionAdapter({
      supabase: reportingSupabase,
      scopeValue: eventId,
    });
  }, [reportingSupabase, eventId]);

  const templateStore = useMemo(() => {
    if (reportingSupabase == null || eventId == null || organisationId == null || userId == null) {
      return null;
    }
    return createReportingTemplateStore({
      supabase: reportingSupabase,
      eventId,
      organisationId,
      userId,
    });
  }, [reportingSupabase, eventId, organisationId, userId]);

  if (secureSupabase == null) {
    return (
      <main className="grid min-h-[30vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  if (eventId == null) {
    return (
      <main className="grid min-h-[40vh] place-items-center">
        <section className="grid place-items-center gap-2 text-center">
          <small aria-hidden>⊚</small>
          <p>Select an event to run reports</p>
        </section>
      </main>
    );
  }

  if (metadataProvider == null || executionAdapter == null || templateStore == null || userId == null) {
    return (
      <main className="grid min-h-[30vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <PagePermissionGuard
      pageName="ReportsPage"
      operation="read"
      scope={{
        organisationId: organisationId ?? undefined,
        eventId: resolvedEventId ?? undefined,
        appId: appId ?? undefined,
      }}
      fallback={<AccessDenied />}
    >
      <main className="grid gap-4">
        <header>
          <h1>Reports</h1>
        </header>
        <ReportBuilder
          metadataProvider={metadataProvider}
          executionAdapter={executionAdapter}
          templateStore={templateStore}
          currentUserId={userId}
          initialExploreKey="base.participant"
          availableExploreKeys={['base.participant', 'base.unit', 'base.activity', 'base.scan']}
          scopeValue={eventId}
          reportResultsRbac={{ pageName: 'ReportsPage' }}
          visibilityLabels={{
            private: 'Private (only me)',
            shared: 'Event-shared (all with access)',
          }}
          canCreateTemplates={canCreate}
        />
      </main>
    </PagePermissionGuard>
  );
}
