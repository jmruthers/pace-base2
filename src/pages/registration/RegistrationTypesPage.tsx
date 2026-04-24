import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  Input,
  Label,
  SaveActions,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard, useSecureSupabase } from '@solvera/pace-core/rbac';
import {
  eventRegistrationTypesQueryKey,
  useEventRegistrationTypesList,
} from '@/hooks/useEventRegistrationTypesList';
import { useRegistrationPolicySave } from '@/hooks/useRegistrationPolicySave';

/** Values aligned with `core_events.registration_scope` and `app_base_registration_policy_upsert`. */
const REGISTRATION_SCOPE_OPTIONS = [
  'open',
  'hierarchy',
  'org_only',
  'invite_only',
  'closed',
] as const;

interface RequirementDraft {
  requirement_type: string;
  sort_order: number;
  state: 'active' | 'disabled' | 'pending_backend_support';
}

interface RegistrationTypeDraft {
  name: string;
  registration_scope: string;
  eligibility_summary: string;
  requirements: ReadonlyArray<RequirementDraft>;
}

const DEFAULT_REGISTRATION_DRAFT: RegistrationTypeDraft = {
  name: '',
  registration_scope: '',
  eligibility_summary: '',
  requirements: [
    {
      requirement_type: 'guardian_approval',
      sort_order: 1,
      state: 'active',
    },
  ],
};

export function RegistrationTypesPage() {
  const { selectedEvent } = useUnifiedAuth();
  const secureSupabase = useSecureSupabase();
  const queryClient = useQueryClient();
  const { savePolicy } = useRegistrationPolicySave();
  const [draft, setDraft] = useState<RegistrationTypeDraft>(DEFAULT_REGISTRATION_DRAFT);
  const [statusMessage, setStatusMessage] = useState('');

  const eventId =
    selectedEvent != null && typeof selectedEvent.id === 'string' ? selectedEvent.id : null;

  const {
    data: registrationTypes = [],
    isPending: registrationTypesPending,
    isError: registrationTypesError,
    error: registrationTypesErrorValue,
  } = useEventRegistrationTypesList(eventId);

  const canSave =
    secureSupabase != null &&
    eventId != null &&
    draft.name.trim().length > 0 &&
    draft.registration_scope.trim().length > 0;

  const handleSave = async () => {
    setStatusMessage('');
    if (!canSave || eventId == null || secureSupabase == null) {
      setStatusMessage('Complete required policy fields before saving.');
      return;
    }

    const policyPayload = {
      event_id: eventId,
      registration_type_name: draft.name.trim(),
      registration_scope: draft.registration_scope.trim(),
      eligibility_summary: draft.eligibility_summary.trim(),
      requirements: draft.requirements,
    };

    const saveResult = await savePolicy(policyPayload);
    if (!saveResult.ok) {
      setStatusMessage(
        `Unable to save registration policy: ${saveResult.errorMessage ?? 'unknown error'}`
      );
      return;
    }

    await queryClient.invalidateQueries({ queryKey: eventRegistrationTypesQueryKey(eventId) });
    setStatusMessage('Registration policy saved.');
  };

  return (
    <PagePermissionGuard
      pageName="registration-types"
      operation="read"
      fallback={<AccessDenied />}
    >
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Registration types</CardTitle>
          </CardHeader>
          <CardContent>
            {eventId == null ? (
              <p>Select an event before configuring registration policy.</p>
            ) : (
              <>
                {registrationTypesPending ? (
                  <p>Loading registration types…</p>
                ) : registrationTypesError ? (
                  <p>{registrationTypesErrorValue.message}</p>
                ) : registrationTypes.length === 0 ? (
                  <p>No registration types for this event yet. Save a policy below to create one.</p>
                ) : (
                  <section>
                    <p>Registration types for this event</p>
                    <ul>
                      {registrationTypes.map((registrationType) => (
                        <li key={registrationType.id}>
                          <p>
                            {registrationType.name}
                            {registrationType.is_active ? '' : ' (inactive)'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <Form<RegistrationTypeDraft>
                  defaultValues={draft}
                  className="grid gap-4"
                  onSubmit={() => {
                    void handleSave();
                  }}
                >
                  <section className="grid gap-4 md:grid-cols-2">
                    <fieldset className="grid gap-2">
                      <Label htmlFor="registration-type-name">Registration type</Label>
                      <Input
                        id="registration-type-name"
                        value={draft.name}
                        onChange={(nextValue) =>
                          setDraft((previous) => ({ ...previous, name: String(nextValue) }))
                        }
                      />
                    </fieldset>
                    <fieldset className="grid gap-2" aria-label="Registration scope">
                      <Label>Registration scope</Label>
                      <Select
                        value={draft.registration_scope}
                        onValueChange={(nextValue) =>
                          setDraft((previous) => ({
                            ...previous,
                            registration_scope: nextValue ?? '',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select registration scope" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGISTRATION_SCOPE_OPTIONS.map((scope) => (
                            <SelectItem key={scope} value={scope}>
                              {scope}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </fieldset>
                    <fieldset className="grid gap-2 md:col-span-2">
                      <Label htmlFor="registration-type-eligibility">Eligibility summary</Label>
                      <Input
                        id="registration-type-eligibility"
                        value={draft.eligibility_summary}
                        onChange={(nextValue) =>
                          setDraft((previous) => ({
                            ...previous,
                            eligibility_summary: String(nextValue),
                          }))
                        }
                      />
                    </fieldset>
                  </section>
                  <section className="grid gap-2">
                    <p>Approval workflow order:</p>
                    <ul>
                      {draft.requirements
                        .slice()
                        .sort((left, right) => left.sort_order - right.sort_order)
                        .map((requirement) => (
                          <li key={`${requirement.requirement_type}-${requirement.sort_order}`}>
                            <p>{requirement.requirement_type}</p>
                            <p>Order: {requirement.sort_order}</p>
                            <p>State: {requirement.state}</p>
                          </li>
                        ))}
                    </ul>
                  </section>
                  <SaveActions saveDisabled={!canSave} />
                </Form>
                {statusMessage.length > 0 && <p>{statusMessage}</p>}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
