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
import {
  BASE_ACCESS_MODES,
  BASE_WORKFLOW_TYPES,
  validateFieldKey,
} from '@/forms/contracts/baseFormsContracts';
import { useFormBuilderSave } from '@/hooks/useFormBuilderSave';

interface BuilderState {
  title: string;
  slug: string;
  workflow_type: string;
  access_mode: string;
  field_key: string;
}

const DEFAULT_BUILDER_STATE: BuilderState = {
  title: '',
  slug: '',
  workflow_type: BASE_WORKFLOW_TYPES[0],
  access_mode: BASE_ACCESS_MODES[0],
  field_key: '',
};

export function FormBuilderPage() {
  const { selectedEvent } = useUnifiedAuth();
  const secureSupabase = useSecureSupabase();
  const { saveBuilder } = useFormBuilderSave();
  const [builderState, setBuilderState] = useState<BuilderState>(DEFAULT_BUILDER_STATE);
  const [statusMessage, setStatusMessage] = useState('');

  const eventId =
    selectedEvent != null && typeof selectedEvent.id === 'string' ? selectedEvent.id : null;

  const canSave =
    secureSupabase != null &&
    eventId != null &&
    builderState.title.trim().length > 0 &&
    builderState.slug.trim().length > 0 &&
    validateFieldKey(builderState.field_key);

  const handleSave = async () => {
    setStatusMessage('');
    if (!canSave || eventId == null || secureSupabase == null) {
      setStatusMessage('Complete all required builder fields before saving.');
      return;
    }

    const builderPayload = {
      event_id: eventId,
      title: builderState.title.trim(),
      slug: builderState.slug.trim(),
      workflow_type: builderState.workflow_type,
      access_mode: builderState.access_mode,
      field_key: builderState.field_key.trim(),
    };

    const saveResult = await saveBuilder(builderPayload);
    if (!saveResult.ok) {
      setStatusMessage(
        `Unable to save form builder state: ${saveResult.errorMessage ?? 'unknown error'}`
      );
      return;
    }

    setStatusMessage('Form definition saved.');
  };

  return (
    <PagePermissionGuard pageName="form-builder" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Form builder</CardTitle>
          </CardHeader>
          <CardContent>
            {eventId == null ? (
              <p>Select an event before opening the form builder.</p>
            ) : (
              <>
                <p>Event scope: {eventId}</p>
                <Label htmlFor="builder-title">
                  Form title
                  <Input
                    id="builder-title"
                    value={builderState.title}
                    onChange={(nextValue) =>
                      setBuilderState((previous) => ({
                        ...previous,
                        title: String(nextValue),
                      }))
                    }
                  />
                </Label>
                <Label htmlFor="builder-slug">
                  Form slug
                  <Input
                    id="builder-slug"
                    value={builderState.slug}
                    onChange={(nextValue) =>
                      setBuilderState((previous) => ({
                        ...previous,
                        slug: String(nextValue),
                      }))
                    }
                  />
                </Label>
                <Label htmlFor="builder-workflow-type">
                  Workflow type
                  <Input
                    id="builder-workflow-type"
                    value={builderState.workflow_type}
                    onChange={(nextValue) =>
                      setBuilderState((previous) => ({
                        ...previous,
                        workflow_type: String(nextValue),
                      }))
                    }
                  />
                </Label>
                <Label htmlFor="builder-access-mode">
                  Access mode
                  <Input
                    id="builder-access-mode"
                    value={builderState.access_mode}
                    onChange={(nextValue) =>
                      setBuilderState((previous) => ({
                        ...previous,
                        access_mode: String(nextValue),
                      }))
                    }
                  />
                </Label>
                <Label htmlFor="builder-field-key">
                  Semantic field key
                  <Input
                    id="builder-field-key"
                    value={builderState.field_key}
                    onChange={(nextValue) =>
                      setBuilderState((previous) => ({
                        ...previous,
                        field_key: String(nextValue),
                      }))
                    }
                  />
                </Label>
                <Button onClick={() => void handleSave()} disabled={!canSave}>
                  Save form definition
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
