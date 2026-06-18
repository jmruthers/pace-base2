import { useCallback, useMemo, useState } from 'react';
import {
  CommComposer,
  useCommDraft,
  useCommSendAdapter,
  type CommRbacContext,
  type CommScheduleCompletePayload,
  type CommSendResult,
} from '@solvera/pace-core/comms';
import {
  Button,
  Card,
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
  useSpecificParticipantOptions,
  useUnitFilterOptions,
} from '@/features/communications/configuration';
import {
  DEFAULT_COMMUNICATION_POOL_MODE,
  EMPTY_COMMUNICATION_FILTERS,
  buildRecipientPool,
  hasActiveCommunicationFilters,
  type CommunicationPoolMode,
  type CommunicationFilters,
} from '@/features/communications/shared';
import { APP_NAME } from '@/config/appName';

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
    'CommunicationsPage',
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
      pageName="CommunicationsPage"
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
  const [poolMode, setPoolMode] = useState<CommunicationPoolMode>(DEFAULT_COMMUNICATION_POOL_MODE);
  const [filters, setFilters] = useState<CommunicationFilters>(EMPTY_COMMUNICATION_FILTERS);
  const [manualMemberIds, setManualMemberIds] = useState<string[]>([]);
  const registrationTypeOptionsQuery = useRegistrationTypeFilterOptions(selectedEventId);
  const unitOptionsQuery = useUnitFilterOptions(selectedEventId);
  const specificParticipantOptionsQuery = useSpecificParticipantOptions(
    selectedEventId,
    effectiveOrganisationId,
    poolMode === 'specific_participants'
  );

  const adapter = useCommSendAdapter({
    organisationId: effectiveOrganisationId,
    sourceApp: APP_NAME,
    sourceContextType: 'event',
    sourceContextId: selectedEventId,
  });
  const draftState = useCommDraft({ channel: 'email' });

  const recipientPool = useMemo(
    () => buildRecipientPool(selectedEventId, poolMode, filters, manualMemberIds),
    [filters, manualMemberIds, poolMode, selectedEventId]
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

  const emitWarningToasts = useCallback(
    (result: CommSendResult) => {
      for (const warning of result.warnings) {
        toast({
          description: warning.message,
        });
      }
    },
    [toast]
  );

  const wrappedAdapter = useMemo(
    () => ({
      ...adapter,
      send: async (request: Parameters<typeof adapter.send>[0]) => {
        const result = await adapter.send(request);
        if (result.ok) {
          emitWarningToasts(result.data);
        }
        return result;
      },
      sendTest: async (request: Parameters<typeof adapter.sendTest>[0]) => {
        const result = await adapter.sendTest(request);
        if (result.ok) {
          toast({
            title: 'Test email sent to your email address.',
            variant: 'success',
          });
          emitWarningToasts(result.data);
        }
        return result;
      },
    }),
    [adapter, emitWarningToasts, toast]
  );

  const registrationTypeOptions = registrationTypeOptionsQuery.data ?? [];
  const specificParticipantOptions = specificParticipantOptionsQuery.data ?? [];
  const unitOptions = unitOptionsQuery.data ?? [];

  const isEventParticipantsMode = poolMode === 'event_participants';

  function resetCompositionState() {
    setPoolMode(DEFAULT_COMMUNICATION_POOL_MODE);
    setFilters(EMPTY_COMMUNICATION_FILTERS);
    setManualMemberIds([]);
    draftState.setDraft({ channel: 'email' });
    draftState.commitDraft({ channel: 'email' });
  }

  return (
    <main className="grid gap-4">
      <header>
        <h1>Communications</h1>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Recipient pool</CardTitle>
            <CardDescription>For the current filter selection</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              {isEventParticipantsMode
                ? hasActiveCommunicationFilters(filters)
                  ? 'Filtered pool'
                  : 'Full event pool'
                : manualMemberIds.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pool mode</CardTitle>
            <CardDescription>Current audience scope</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{isEventParticipantsMode ? 'Event participants' : 'Specific participants'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Registration types</CardTitle>
            <CardDescription>Available filter options</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{registrationTypeOptions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active filters</CardTitle>
            <CardDescription>Applied audience constraints</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{hasActiveCommunicationFilters(filters) ? 'Yes' : 'None'}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant={isEventParticipantsMode ? 'default' : 'outline'}
          onClick={() => {
            setPoolMode('event_participants');
            setManualMemberIds([]);
            setFilters(EMPTY_COMMUNICATION_FILTERS);
          }}
        >
          Event participants
        </Button>
        <Button
          type="button"
          variant={isEventParticipantsMode ? 'outline' : 'default'}
          onClick={() => {
            setPoolMode('specific_participants');
            setFilters(EMPTY_COMMUNICATION_FILTERS);
          }}
        >
          Specific participants
        </Button>
      </section>

      {isEventParticipantsMode ? (
        <>
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
            <section className="justify-self-end">
              <Button
                type="button"
                variant="link"
                onClick={() => setFilters(EMPTY_COMMUNICATION_FILTERS)}
              >
                Clear filters
              </Button>
            </section>
          ) : null}
        </>
      ) : (
        <section>
          <MultiSelect
            value={manualMemberIds}
            options={specificParticipantOptions}
            placeholder="Search or select participants..."
            onValueChange={setManualMemberIds}
            clearable
            disabled={specificParticipantOptionsQuery.isLoading}
          />
        </section>
      )}

      {(isEventParticipantsMode &&
        (registrationTypeOptionsQuery.isError || unitOptionsQuery.isError)) ||
      (!isEventParticipantsMode && specificParticipantOptionsQuery.isError) ? (
        <Card>
          <CardHeader>
            <CardTitle>Filter data unavailable</CardTitle>
            <CardDescription>
              {(registrationTypeOptionsQuery.error as Error | null)?.message ??
                (unitOptionsQuery.error as Error | null)?.message ??
                (specificParticipantOptionsQuery.error as Error | null)?.message ??
                'Could not load participant options.'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {isEventParticipantsMode &&
      registrationTypeOptions.length === 0 &&
      !registrationTypeOptionsQuery.isLoading ? (
        <Card>
          <CardContent>
            <p>No registration types available for this event.</p>
          </CardContent>
        </Card>
      ) : null}

      {isEventParticipantsMode && unitOptions.length === 0 && !unitOptionsQuery.isLoading ? (
        <Card>
          <CardContent>
            <p>No units available.</p>
          </CardContent>
        </Card>
      ) : null}

      <CommComposer
        adapter={wrappedAdapter}
        organisationId={effectiveOrganisationId}
        sourceApp={APP_NAME}
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
          emitWarningToasts(result);
          resetCompositionState();
        }}
        onScheduleComplete={(payload: CommScheduleCompletePayload) => {
          const scheduledAtIso = payload.scheduledAtIso ?? '';
          toast({
            title:
              scheduledAtIso.length > 0
                ? `Message scheduled for ${scheduledAtIso}.`
                : 'Message scheduled for the selected date and time.',
            variant: 'success',
          });
          resetCompositionState();
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
