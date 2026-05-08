import { useMemo, useState } from 'react';
import {
  CommComposer,
  useCommDraft,
  useCommSendAdapter,
  type CommRbacContext,
} from '@solvera/pace-core/comms';
import {
  Card,
  Button,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingSpinner,
  MultiSelect,
} from '@solvera/pace-core/components';
import { useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import {
  AccessDenied,
  PagePermissionGuard,
  useResolvedScope,
  useResourcePermissions,
} from '@solvera/pace-core/rbac';
import {
  COMMUNICATION_STATUS_OPTIONS,
  type CommunicationStatusFilter,
} from '@/features/communications/constants';
import {
  useRegistrationTypeFilterOptions,
  useUnitFilterOptions,
} from '@/features/communications/configuration';
import {
  EMPTY_COMMUNICATION_FILTERS,
  buildEventParticipantsPool,
  hasActiveCommunicationFilters,
  type CommunicationFilters,
} from '@/features/communications/shared';

export function CommunicationsPage() {
  const { selectedEventId, selectedOrganisationId } = useUnifiedAuth();
  const { organisationId, appId } = useResolvedScope();

  const effectiveOrganisationId = organisationId ?? selectedOrganisationId ?? null;

  const permissionScope = useMemo(
    () => ({
      organisationId: effectiveOrganisationId ?? undefined,
      eventId: selectedEventId ?? undefined,
      appId: appId ?? undefined,
    }),
    [appId, effectiveOrganisationId, selectedEventId]
  );

  const communicationsPermissions = useResourcePermissions(
    'communications',
    ['read', 'create', 'update'],
    permissionScope
  );

  if (communicationsPermissions.isLoading || effectiveOrganisationId == null) {
    return (
      <main className="grid min-h-[40vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <PagePermissionGuard
      pageName="communications"
      operation="read"
      scope={permissionScope}
      fallback={<AccessDenied />}
      loading={
        <main className="grid min-h-[40vh] place-items-center">
          <LoadingSpinner />
        </main>
      }
    >
      {selectedEventId == null ? (
        <main className="grid gap-4">
          <header>
            <h1>Communications</h1>
          </header>
          <p>Select an event to compose a communication.</p>
        </main>
      ) : (
        <CommunicationsPageContent
          key={selectedEventId}
          selectedEventId={selectedEventId}
          effectiveOrganisationId={effectiveOrganisationId}
          canCreate={communicationsPermissions.canCreate}
          canUpdate={communicationsPermissions.canUpdate}
        />
      )}
    </PagePermissionGuard>
  );
}

interface CommunicationsPageContentProps {
  selectedEventId: string;
  effectiveOrganisationId: string;
  canCreate: boolean;
  canUpdate: boolean;
}

function CommunicationsPageContent({
  selectedEventId,
  effectiveOrganisationId,
  canCreate,
  canUpdate,
}: CommunicationsPageContentProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<CommunicationFilters>(EMPTY_COMMUNICATION_FILTERS);
  const registrationTypeOptionsQuery = useRegistrationTypeFilterOptions(selectedEventId);
  const unitOptionsQuery = useUnitFilterOptions(selectedEventId);

  const adapter = useCommSendAdapter({
    organisationId: effectiveOrganisationId,
    sourceApp: 'base',
    sourceContextType: 'event',
    sourceContextId: selectedEventId,
  });
  const draftState = useCommDraft({ channel: 'email' });

  const recipientPool = useMemo(
    () => buildEventParticipantsPool(selectedEventId, filters),
    [filters, selectedEventId]
  );
  const commRbacContext = useMemo<CommRbacContext>(
    () => ({
      canCompose: canCreate,
      canSend: canUpdate,
      canSchedule: canUpdate,
      scopeType: 'event',
      scopeId: selectedEventId,
    }),
    [canCreate, canUpdate, selectedEventId]
  );

  const wrappedAdapter = useMemo(
    () => ({
      ...adapter,
      sendTest: async (request: Parameters<typeof adapter.sendTest>[0]) => {
        const result = await adapter.sendTest(request);
        if (result.ok) {
          toast({
            title: 'Test email sent to your email address.',
            variant: 'success',
          });
        }
        return result;
      },
    }),
    [adapter, toast]
  );

  const registrationTypeOptions = registrationTypeOptionsQuery.data ?? [];
  const unitOptions = unitOptionsQuery.data ?? [];

  return (
    <main className="grid gap-4">
      <header>
        <h1>Communications</h1>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <MultiSelect
          value={filters.registrationTypeIds}
          options={registrationTypeOptions}
          placeholder="Registration type"
          onValueChange={(registrationTypeIds) =>
            setFilters((previous) => ({ ...previous, registrationTypeIds }))
          }
          clearable
          disabled={registrationTypeOptionsQuery.isLoading}
        />
        <MultiSelect
          value={filters.statuses}
          options={COMMUNICATION_STATUS_OPTIONS}
          placeholder="Status"
          onValueChange={(nextStatuses) =>
            setFilters((previous) => ({
              ...previous,
              statuses: nextStatuses as CommunicationStatusFilter[],
            }))
          }
          clearable
        />
        <MultiSelect
          value={filters.unitIds}
          options={unitOptions}
          placeholder="Unit"
          onValueChange={(unitIds) => setFilters((previous) => ({ ...previous, unitIds }))}
          clearable
          disabled={unitOptionsQuery.isLoading}
        />
      </section>

      {hasActiveCommunicationFilters(filters) ? (
        <Button type="button" variant="outline" className="justify-self-end" onClick={() => setFilters(EMPTY_COMMUNICATION_FILTERS)}>
          Clear filters
        </Button>
      ) : null}

      {registrationTypeOptionsQuery.isError || unitOptionsQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Filter data unavailable</CardTitle>
            <CardDescription>
              {(registrationTypeOptionsQuery.error as Error | null)?.message ??
                (unitOptionsQuery.error as Error | null)?.message ??
                'Could not load filter options.'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {registrationTypeOptions.length === 0 && !registrationTypeOptionsQuery.isLoading ? (
        <Card>
          <CardContent>
            <p>No registration types available for this event.</p>
          </CardContent>
        </Card>
      ) : null}

      {unitOptions.length === 0 && !unitOptionsQuery.isLoading ? (
        <Card>
          <CardContent>
            <p>No units available.</p>
          </CardContent>
        </Card>
      ) : null}

      <CommComposer
        adapter={wrappedAdapter}
        organisationId={effectiveOrganisationId}
        sourceApp="base"
        recipientPool={recipientPool}
        rbac={commRbacContext}
        draft={draftState.draft}
        onDraftChange={draftState.setDraft}
        blockSendOnUnresolvedTokens
        onSendComplete={(result) => {
          toast({
            title: `Message sent to ${result.total_recipients} participants.`,
            variant: 'success',
          });
          if (result.suppression_skipped > 0) {
            toast({
              description: `${result.suppression_skipped} recipients were suppressed and skipped.`,
            });
          }
          setFilters(EMPTY_COMMUNICATION_FILTERS);
          draftState.setDraft({ channel: 'email' });
          draftState.commitDraft({ channel: 'email' });
        }}
        onScheduleComplete={() => {
          toast({
            title: 'Message scheduled.',
            variant: 'success',
          });
          setFilters(EMPTY_COMMUNICATION_FILTERS);
          draftState.setDraft({ channel: 'email' });
          draftState.commitDraft({ channel: 'email' });
        }}
        onSendError={(message) => {
          toast({
            description: message,
            variant: 'destructive',
          });
        }}
      />
    </main>
  );
}
