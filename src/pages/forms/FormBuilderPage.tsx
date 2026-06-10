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
import {
  AuthoringIssueAlerts,
  validateWorkflowAuthoringState,
  WorkflowFormAuthoringShell,
  type WorkflowAuthoringState,
  type WorkflowAuthoringValidationIssue,
} from '@solvera/pace-core/forms';
import { useEvents, useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { HandleMutationError, NormalizeSupabaseError, ShowSuccessMessage } from '@solvera/pace-core/utils';
import {
  useFormBuilderRecord,
  useRegistrationTypes,
  invalidateFormsAuthoringAfterSave,
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
import { formatCurrencyFromCents } from '@/features/registrationSetup/presentation';
import {
  ensureSingleDefaultBinding,
  isPublishedForm,
  parseNullableNumber,
  updateBindingCheckedState,
} from '@/features/formsAuthoring/stateHelpers';
import type { RegistrationBindingDraft, RegistrationTypeRow } from '@/features/formsAuthoring/types';

function registrationTypeCostLabel(cost: number | null): string {
  if (cost == null) {
    return 'No cost set';
  }
  return formatCurrencyFromCents(cost);
}

function eligibilityRulesLabel(count: number): string {
  return count === 1 ? '1 eligibility rule' : `${count} eligibility rules`;
}

function approvalsLabel(count: number): string {
  return count === 1 ? '1 approval' : `${count} approvals`;
}

function registrationTypeRulesAndApprovalsLabel(
  eligibilityRuleCount: number,
  approvalCount: number
): string {
  return `${eligibilityRulesLabel(eligibilityRuleCount)}, ${approvalsLabel(approvalCount)}`;
}

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
  const [saveValidationVisible, setSaveValidationVisible] = useState(false);
  const lastAutoGenSlugRef = useRef(initialState.metadata.slug);
  const persistedBindingsRef = useRef<RegistrationBindingDraft[]>(initialBindings);

  const shellHeading = state.metadata.id != null ? 'Edit Form' : 'Create Form';
  const workflowConfig = (state.metadata.workflowConfig ?? {}) as Record<string, unknown>;
  const maxSubmissions = workflowConfig.max_submissions;
  const confirmationMessage = workflowConfig.confirmation_message;
  const showRegistrationPanel = state.metadata.workflowType === 'base_registration';

  const scheduleValidationIssues = useMemo((): WorkflowAuthoringValidationIssue[] => {
    if (!saveValidationVisible) {
      return [];
    }
    const result = validateWorkflowAuthoringState(state);
    return [...result.errors, ...result.warnings].filter(
      (issue) => issue.path === 'metadata.opensAt' || issue.path === 'metadata.closesAt'
    );
  }, [saveValidationVisible, state]);

  const issuesAtSchedulePath = (path: 'metadata.opensAt' | 'metadata.closesAt') =>
    scheduleValidationIssues.filter((issue) => issue.path === path);

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
    if (
      state.metadata.workflowType !== 'base_registration' &&
      nextState.metadata.workflowType === 'base_registration'
    ) {
      setBindings(persistedBindingsRef.current.map((binding) => ({ ...binding })));
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
      const { formId } = await saveMutation.mutateAsync({
        state: nextState,
        bindings,
        eventId: selectedEventId,
        organisationId: selectedOrganisationId,
        userId: user?.id ?? null,
      });
      await invalidateFormsAuthoringAfterSave(queryClient, {
        eventId: selectedEventId,
        formId,
      });
      ShowSuccessMessage('Form saved successfully.', toast);
      navigate('/forms');
    } catch (error) {
      HandleMutationError(error, 'form-builder-save', toast);
    } finally {
      setIsSaving(false);
    }
  };

  const submissionSettingsAside = (
    <Card>
      <CardHeader>
        <CardTitle>Submission settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
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

        <section className="grid gap-3 md:grid-cols-2">
          <fieldset className="grid min-w-0 gap-1 border-0 p-0">
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
            <AuthoringIssueAlerts issues={issuesAtSchedulePath('metadata.opensAt')} />
          </fieldset>
          <fieldset className="grid min-w-0 gap-1 border-0 p-0">
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
            <AuthoringIssueAlerts issues={issuesAtSchedulePath('metadata.closesAt')} />
          </fieldset>
        </section>
      </CardContent>
    </Card>
  );

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
      onSaveValidationAttempted={() => {
        setSaveValidationVisible(true);
      }}
      metadataAside={submissionSettingsAside}
      middleContent={
        <section className="grid gap-3">
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
                ) : registrationTypes.length === 0 ? (
                  <section className="grid gap-2">
                    <p>There are no registration types defined yet for this event. You must have registration types defined for members to be able to apply for the event.</p>
                    <PagePermissionGuard
                      pageName="RegistrationTypesPage"
                      operation="create"
                      scope={scope}
                      fallback={null}
                    >
                      <Link to="/registration-type-builder">Create registration type</Link>
                    </PagePermissionGuard>
                  </section>
                ) : (
                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {registrationTypes.map((registrationType) => {
                      const binding = visibleBindings.find((entry) => entry.typeId === registrationType.id) ?? {
                        typeId: registrationType.id,
                        checked: false,
                        isDefault: false,
                      };
                      return (
                        <Card key={registrationType.id}>
                          <CardHeader>
                            <CardTitle>{registrationType.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="grid gap-2">
                            <p>{registrationTypeCostLabel(registrationType.cost)}</p>
                            <p>
                              {registrationTypeRulesAndApprovalsLabel(
                                registrationType.eligibilityRuleCount,
                                registrationType.approvalCount
                              )}
                            </p>
                            <Label
                              htmlFor={`binding-${registrationType.id}`}
                              className="grid grid-flow-col auto-cols-max items-center gap-2"
                            >
                              <Checkbox
                                id={`binding-${registrationType.id}`}
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
                              Include on this form
                            </Label>
                            <Label
                              htmlFor={`default-${registrationType.id}`}
                              className="grid grid-flow-col auto-cols-max items-center gap-2"
                            >
                              <Checkbox
                                id={`default-${registrationType.id}`}
                                checked={binding.checked && binding.isDefault}
                                disabled={!binding.checked}
                                onChange={() => {
                                  setBindings(
                                    ensureSingleDefaultBinding(visibleBindings, registrationType.id)
                                  );
                                }}
                              />
                              Set as default
                            </Label>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </section>
                )}
              </CardContent>
            </Card>
          ) : null}
        </section>
      }
    />
  );

  return (
    <PagePermissionGuard
      pageName="FormBuilderPage"
      operation="update"
      scope={scope}
      fallback={renderShell(true)}
    >
      {renderShell(false)}
    </PagePermissionGuard>
  );
}

export function FormBuilderPage() {
  const [searchParams] = useSearchParams();
  const { selectedEvent } = useEvents();
  const { selectedEventId, selectedOrganisationId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();

  const formId = searchParams.get('formId');
  const isEditMode = formId != null;
  const builderQuery = useFormBuilderRecord(selectedEventId, formId);
  const registrationTypeState = useRegistrationTypes(selectedEventId, selectedEventId != null);

  const scope = {
    organisationId,
    eventId,
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
      return `edit-${formId ?? 'none'}-${builderQuery.dataUpdatedAt}`;
    }
    return `create-${selectedEventId ?? 'none'}-${selectedOrganisationId ?? 'none'}`;
  }, [builderQuery.dataUpdatedAt, formId, isEditMode, selectedEventId, selectedOrganisationId]);

  return (
    <PagePermissionGuard
      pageName="FormBuilderPage"
      operation="read"
      scope={scope}
      fallback={<AccessDenied />}
    >
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
