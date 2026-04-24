import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  LoadingSpinner,
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
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import {
  BASE_ACCESS_MODES,
  BASE_WORKFLOW_TYPES,
  validateFieldKey,
} from '@/forms/contracts/baseFormsContracts';
import { eventFormsQueryKey, useEventFormsList } from '@/hooks/useEventFormsList';
import { useFormBuilderSave } from '@/hooks/useFormBuilderSave';
import { getEventScopedFormBySlug } from './eventScopedForms';

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

function mapSelectedFormToBuilderState(
  selectedForm: ReturnType<typeof getEventScopedFormBySlug>
): BuilderState {
  if (selectedForm == null) {
    return DEFAULT_BUILDER_STATE;
  }

  return {
    title: selectedForm.title,
    slug: selectedForm.slug,
    workflow_type: selectedForm.workflowType,
    access_mode: selectedForm.accessMode,
    field_key: selectedForm.fieldKey,
  };
}

interface BuilderEditorProps {
  initialState: BuilderState;
  canSubmit: (state: BuilderState) => boolean;
  onSubmit: (state: BuilderState) => Promise<void>;
}

function BuilderEditor({ initialState, canSubmit, onSubmit }: BuilderEditorProps) {
  const [builderState, setBuilderState] = useState<BuilderState>(initialState);
  const canSave = canSubmit(builderState);

  return (
    <Form<BuilderState>
      defaultValues={builderState}
      className="grid gap-4"
      onSubmit={() => {
        void onSubmit(builderState);
      }}
    >
      <section className="grid gap-4 md:grid-cols-2">
        <fieldset className="grid gap-2">
          <Label htmlFor="builder-title">Form title</Label>
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
        </fieldset>
        <fieldset className="grid gap-2">
          <Label htmlFor="builder-slug">Form slug</Label>
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
        </fieldset>
        <fieldset className="grid gap-2">
          <Label htmlFor="builder-workflow-type">Workflow type</Label>
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
        </fieldset>
        <fieldset className="grid gap-2">
          <Label>Access mode</Label>
          <Select
            value={builderState.access_mode}
            onValueChange={(nextValue) =>
              setBuilderState((previous) => ({
                ...previous,
                access_mode: nextValue ?? '',
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select access mode" />
            </SelectTrigger>
            <SelectContent>
              {BASE_ACCESS_MODES.map((accessMode) => (
                <SelectItem key={accessMode} value={accessMode}>
                  {accessMode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </fieldset>
        <fieldset className="grid gap-2">
          <Label htmlFor="builder-field-key">Semantic field key</Label>
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
        </fieldset>
      </section>
      <SaveActions saveDisabled={!canSave} />
    </Form>
  );
}

export function FormBuilderPage() {
  const { slug: formSlug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { selectedEvent } = useUnifiedAuth();
  const queryClient = useQueryClient();
  const { saveBuilder } = useFormBuilderSave();
  const [statusMessage, setStatusMessage] = useState('');

  const eventId =
    selectedEvent != null && typeof selectedEvent.id === 'string' ? selectedEvent.id : null;
  const formsQuery = useEventFormsList(eventId);

  const selectedForm = useMemo(() => {
    if (formSlug == null) {
      return undefined;
    }
    return getEventScopedFormBySlug(formsQuery.data ?? [], formSlug);
  }, [formsQuery.data, formSlug]);

  const isKnownSlug =
    formSlug == null || formsQuery.isLoading || formsQuery.isError || selectedForm != null;

  const handleSave = async (builderState: BuilderState) => {
    setStatusMessage('');
    const canSave =
      eventId != null &&
      isKnownSlug &&
      builderState.title.trim().length > 0 &&
      builderState.slug.trim().length > 0 &&
      validateFieldKey(builderState.field_key);
    if (!canSave || eventId == null) {
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
      form_id: selectedForm?.id,
    };

    const saveResult = await saveBuilder(builderPayload);
    if (!saveResult.ok) {
      setStatusMessage(
        `Unable to save form builder state: ${saveResult.errorMessage ?? 'unknown error'}`
      );
      return;
    }

    setStatusMessage('Form definition saved.');
    await queryClient.invalidateQueries({ queryKey: eventFormsQueryKey(eventId) });
    if (formSlug !== builderPayload.slug) {
      navigate(`/form-builder/${builderPayload.slug}`, { replace: true });
    }
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
                {formsQuery.isLoading && (
                  <p>
                    <LoadingSpinner />
                  </p>
                )}
                {formsQuery.isError && <p>Unable to load forms: {formsQuery.error.message}</p>}
                {formSlug != null && !formsQuery.isLoading && !formsQuery.isError && selectedForm == null && (
                  <p>Selected form could not be found for this event.</p>
                )}
                <BuilderEditor
                  key={`${formSlug ?? '__new__'}:${selectedForm?.id ?? '__none__'}`}
                  initialState={mapSelectedFormToBuilderState(selectedForm)}
                  canSubmit={(state) =>
                    eventId != null &&
                    isKnownSlug &&
                    state.title.trim().length > 0 &&
                    state.slug.trim().length > 0 &&
                    validateFieldKey(state.field_key)
                  }
                  onSubmit={handleSave}
                />
                {statusMessage.length > 0 && <p>{statusMessage}</p>}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
