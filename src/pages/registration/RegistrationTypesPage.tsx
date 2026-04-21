import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@solvera/pace-core/components';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard, useSecureSupabase } from '@solvera/pace-core/rbac';
import { useRegistrationPolicySave } from '@/hooks/useRegistrationPolicySave';

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
  const { savePolicy } = useRegistrationPolicySave();
  const [draft, setDraft] = useState<RegistrationTypeDraft>(DEFAULT_REGISTRATION_DRAFT);
  const [statusMessage, setStatusMessage] = useState('');

  const eventId =
    selectedEvent != null && typeof selectedEvent.id === 'string' ? selectedEvent.id : null;

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
                <p>Event scope: {eventId}</p>
                <Label htmlFor="registration-type-name">
                  Registration type
                  <Input
                    id="registration-type-name"
                    value={draft.name}
                    onChange={(nextValue) =>
                      setDraft((previous) => ({ ...previous, name: String(nextValue) }))
                    }
                  />
                </Label>
                <Label htmlFor="registration-type-scope">
                  Registration scope
                  <Input
                    id="registration-type-scope"
                    value={draft.registration_scope}
                    onChange={(nextValue) =>
                      setDraft((previous) => ({
                        ...previous,
                        registration_scope: String(nextValue),
                      }))
                    }
                  />
                </Label>
                <Label htmlFor="registration-type-eligibility">
                  Eligibility summary
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
                </Label>
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
                <Button onClick={() => void handleSave()} disabled={!canSave}>
                  Save registration policy
                </Button>
                {statusMessage.length > 0 && <p>{statusMessage}</p>}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
