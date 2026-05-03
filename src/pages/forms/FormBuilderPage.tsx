import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DatePickerWithTimezone,
  Input,
  Label,
  LoadingSpinner,
  Textarea,
} from '@solvera/pace-core/components';
import { WorkflowFormAuthoringShell, type WorkflowAuthoringState } from '@solvera/pace-core/forms';
import { useEvents, useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { HandleMutationError, NormalizeSupabaseError, ShowSuccessMessage } from '@solvera/pace-core/utils';
import {
  isPublishedForm,
  useFormBuilderRecord,
  useRegistrationTypes,
  useSaveWorkflowFormMutation,
} from '@/features/formsAuthoring/configuration';
import {
  BASE_WORKFLOW_TYPES,
  createInitialAuthoringState,
  deriveFormSlug,
  mapBuilderRecordToState,
  resolveEventSlug,
  toDateValue,
  toUtcMidnightIso,
} from '@/features/formsAuthoring/shared';
import {
  ensureSingleDefaultBinding,
  parseNullableNumber,
  updateBindingCheckedState,
} from '@/features/formsAuthoring/stateHelpers';
import type { RegistrationBindingDraft, RegistrationTypeRow } from '@/features/formsAuthoring/types';

interface EditorProps {
  initialState: WorkflowAuthoringState;
  initialBindings: RegistrationBindingDraft[];
  eventSlug: string;
  scope: {
    organisationId: string | null;
    eventId: string | null;
    appId?: string;
  };
  registrationTypes: RegistrationTypeRow[];
  registrationTypesLoading: boolean;
  registrationTypesError: Error | null;
}

function SaveHiddenShellWrapper({ children }: { children: React.ReactNode }) {
  return <section className="[&>section>fieldset]:hidden">{children}</section>;
}

function FormBuilderEditor({
  initialState,
  initialBindings,
  eventSlug,
  scope,
  registrationTypes,
  registrationTypesLoading,
  registrationTypesError,
}: EditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedEventId, selectedOrganisationId, user } = useUnifiedAuth();
  const saveMutation = useSaveWorkflowFormMutation();

  const [state, setState] = useState<WorkflowAuthoringState>(initialState);
  const [bindings, setBindings] = useState<RegistrationBindingDraft[]>(initialBindings);
  const [isSaving, setIsSaving] = useState(false);
  const lastAutoGenSlugRef = useRef(initialState.metadata.slug);

  const shellHeading = state.metadata.id != null ? 'Edit Form' : 'Create Form';
  const workflowConfig = (state.metadata.workflowConfig ?? {}) as Record<string, unknown>;
  const maxSubmissions = workflowConfig.max_submissions;
  const confirmationMessage = workflowConfig.confirmation_message;
  const showRegistrationPanel = state.metadata.workflowType === 'base_registration';

  const visibleBindings = useMemo(
    () =>
      registrationTypes.map((registrationType) => {
        const existing = bindings.find((binding) => binding.typeId === registrationType.id);
        return (
          existing ?? {
            typeId: registrationType.id,
            checked: false,
            isDefault: false,
          }
        );
      }),
    [bindings, registrationTypes]
  );

  const handleStateChange = (nextState: WorkflowAuthoringState) => {
    if (state.metadata.workflowType === 'base_registration' && nextState.metadata.workflowType !== 'base_registration') {
      setBindings([]);
    }
    if (!nextState.metadata.id && nextState.metadata.name !== state.metadata.name) {
      if (
        nextState.metadata.slug === lastAutoGenSlugRef.current ||
        nextState.metadata.slug.trim().length === 0
      ) {
        const autoSlug = deriveFormSlug(nextState.metadata.name);
        lastAutoGenSlugRef.current = autoSlug;
        nextState = {
          ...nextState,
          metadata: {
            ...nextState.metadata,
            slug: autoSlug,
          },
        };
      }
    }
    setState(nextState);
  };

  const handleSave = async (nextState: WorkflowAuthoringState) => {
    if (selectedEventId == null || selectedOrganisationId == null) {
      return;
    }

    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        state: nextState,
        bindings,
        eventId: selectedEventId,
        organisationId: selectedOrganisationId,
        userId: user?.id ?? null,
      });
      await queryClient.invalidateQueries({ queryKey: ['forms-authoring', 'forms-list', selectedEventId] });
      await queryClient.invalidateQueries({ queryKey: ['forms-authoring', 'field-counts', selectedEventId] });
      ShowSuccessMessage('Form saved successfully.', toast);
      navigate('/forms');
    } catch (error) {
      HandleMutationError(error, 'form-builder-save', toast);
    } finally {
      setIsSaving(false);
    }
  };

  const renderShell = (disabled: boolean) => (
    <WorkflowFormAuthoringShell
      state={state}
      onStateChange={handleStateChange}
      onSave={(nextState) => void handleSave(nextState)}
      heading={shellHeading}
      subheading="Define this form's metadata, fields, and submission settings."
      allowedWorkflowTypes={BASE_WORKFLOW_TYPES}
      slugReadOnly={isPublishedForm(state)}
      eventSlug={eventSlug}
      saveLabel="Save Form"
      disabled={disabled || isSaving}
      middleContent={
        <section className="grid gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <section className="grid gap-1">
                <Label>Opens at</Label>
                <DatePickerWithTimezone
                  value={toDateValue(state.metadata.opensAt)}
                  onChange={(value) => {
                    handleStateChange({
                      ...state,
                      metadata: {
                        ...state.metadata,
                        opensAt: toUtcMidnightIso(value),
                      },
                    });
                  }}
                />
              </section>
              <section className="grid gap-1">
                <Label>Closes at</Label>
                <DatePickerWithTimezone
                  value={toDateValue(state.metadata.closesAt)}
                  onChange={(value) => {
                    handleStateChange({
                      ...state,
                      metadata: {
                        ...state.metadata,
                        closesAt: toUtcMidnightIso(value),
                      },
                    });
                  }}
                />
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submission Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <section className="grid gap-1">
                <Label>Max submissions</Label>
                <Input
                  type="number"
                  min={1}
                  value={typeof maxSubmissions === 'number' ? String(maxSubmissions) : ''}
                  onChange={(value) => {
                    handleStateChange({
                      ...state,
                      metadata: {
                        ...state.metadata,
                        workflowConfig: {
                          ...workflowConfig,
                          max_submissions: parseNullableNumber(value),
                        },
                      },
                    });
                  }}
                />
              </section>
              <section className="grid gap-1">
                <Label>Confirmation message</Label>
                <Textarea
                  rows={3}
                  value={typeof confirmationMessage === 'string' ? confirmationMessage : ''}
                  onChange={(value) => {
                    handleStateChange({
                      ...state,
                      metadata: {
                        ...state.metadata,
                        workflowConfig: {
                          ...workflowConfig,
                          confirmation_message: value.trim().length > 0 ? value : null,
                        },
                      },
                    });
                  }}
                />
              </section>
              <p>Shown to participants after successful form submission.</p>
            </CardContent>
          </Card>

          {showRegistrationPanel ? (
            <Card>
              <CardHeader>
                <CardTitle>Registration Type Bindings</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {registrationTypesLoading ? (
                  <section className="grid min-h-[12vh] place-items-center">
                    <LoadingSpinner />
                  </section>
                ) : registrationTypesError != null ? (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{NormalizeSupabaseError(registrationTypesError).message}</AlertDescription>
                  </Alert>
                ) : registrationTypes.map((registrationType) => {
                  const binding = visibleBindings.find((entry) => entry.typeId === registrationType.id) ?? {
                    typeId: registrationType.id,
                    checked: false,
                    isDefault: false,
                  };
                  return (
                    <article key={registrationType.id} className="grid gap-2 rounded-md border p-3">
                      <section className="grid gap-1">
                        <Label>{registrationType.name}</Label>
                        <Checkbox
                          checked={binding.checked}
                          onChange={(checked: boolean) => {
                            setBindings(
                              updateBindingCheckedState(
                                visibleBindings,
                                registrationType.id,
                                checked
                              )
                            );
                          }}
                        />
                      </section>
                      <section className="grid gap-1">
                        <Label>Set as default</Label>
                        <Input
                          type="radio"
                          name="registration-default"
                          checked={binding.checked && binding.isDefault}
                          disabled={!binding.checked}
                          readOnly
                          onClick={() => {
                            setBindings(ensureSingleDefaultBinding(visibleBindings, registrationType.id));
                          }}
                        />
                      </section>
                    </article>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </section>
      }
    />
  );

  return (
    <PagePermissionGuard
      pageName="form-builder"
      operation="update"
      scope={scope}
      fallback={<SaveHiddenShellWrapper>{renderShell(true)}</SaveHiddenShellWrapper>}
    >
      {renderShell(false)}
    </PagePermissionGuard>
  );
}

export function FormBuilderPage() {
  const [searchParams] = useSearchParams();
  const { selectedEvent } = useEvents();
  const { selectedEventId, selectedOrganisationId, appId } = useUnifiedAuth();

  const formId = searchParams.get('formId');
  const isEditMode = formId != null;
  const builderQuery = useFormBuilderRecord(selectedEventId, formId);
  const registrationTypeState = useRegistrationTypes(selectedEventId, selectedEventId != null);

  const scope = {
    organisationId: selectedOrganisationId,
    eventId: selectedEventId ?? null,
    appId: appId ?? undefined,
  };

  const eventSlug = useMemo(() => resolveEventSlug(selectedEvent), [selectedEvent]);
  const initialState = useMemo(() => {
    if (isEditMode && builderQuery.data != null) {
      return mapBuilderRecordToState(builderQuery.data);
    }
    return createInitialAuthoringState({
      eventId: selectedEventId,
      organisationId: selectedOrganisationId,
    });
  }, [builderQuery.data, isEditMode, selectedEventId, selectedOrganisationId]);

  const initialBindings = useMemo(() => {
    if (
      !isEditMode ||
      builderQuery.data == null ||
      builderQuery.data.form.workflow_type !== 'base_registration'
    ) {
      return [] as RegistrationBindingDraft[];
    }
    return builderQuery.data.bindings.map((binding) => ({
      typeId: binding.registration_type_id,
      checked: true,
      isDefault: binding.is_default,
    }));
  }, [builderQuery.data, isEditMode]);

  const editorKey = useMemo(() => {
    if (isEditMode) {
      return `edit-${formId ?? 'none'}-${builderQuery.data?.form.id ?? 'pending'}`;
    }
    return `create-${selectedEventId ?? 'none'}-${selectedOrganisationId ?? 'none'}`;
  }, [builderQuery.data?.form.id, formId, isEditMode, selectedEventId, selectedOrganisationId]);

  return (
    <PagePermissionGuard pageName="form-builder" operation="read" scope={scope}>
      <main className="grid gap-4">
        {selectedEventId == null || selectedEvent == null ? (
          <Card>
            <CardContent>
              <p>Select an event from the header before creating or editing a form.</p>
            </CardContent>
          </Card>
        ) : isEditMode && builderQuery.isLoading ? (
          <section className="grid min-h-[30vh] place-items-center gap-2">
            <LoadingSpinner />
            <p>Loading form…</p>
          </section>
        ) : isEditMode && builderQuery.error != null ? (
          <section className="grid gap-3">
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{NormalizeSupabaseError(builderQuery.error).message}</AlertDescription>
            </Alert>
            <Link to="/forms">Back to Forms</Link>
          </section>
        ) : (
          <FormBuilderEditor
            key={editorKey}
            initialState={initialState}
            initialBindings={initialBindings}
            eventSlug={eventSlug}
            scope={scope}
            registrationTypes={registrationTypeState.data ?? []}
            registrationTypesLoading={registrationTypeState.isLoading}
            registrationTypesError={registrationTypeState.error}
          />
        )}
      </main>
    </PagePermissionGuard>
  );
}
