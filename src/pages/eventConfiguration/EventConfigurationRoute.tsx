import { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DatePickerWithTimezone,
  FileDisplay,
  FileUpload,
  Form,
  FormField,
  Input,
  Label,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@solvera/pace-core/components';
import { Calendar } from '@solvera/pace-core/icons';
import {
  AddressField,
  createGoogleMapsJsAddressProviderAdapter,
  type UseFormReturn,
} from '@solvera/pace-core/forms';
import { useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { PagePermissionGuard, useResolvedScope, useStorageCapableClient } from '@solvera/pace-core/rbac';
import { HandleMutationError, NormalizeSupabaseError, ShowSuccessMessage } from '@solvera/pace-core/utils';
import {
  useEventConfigurationRecord,
  useSaveEventConfiguration,
  useSaveEventLogoPointer,
} from '@/features/eventConfiguration/configuration';
import {
  eventConfigurationSchema,
  formatEventLogoFallback,
  mapRecordToFormValues,
} from '@/features/eventConfiguration/shared';
import type { EventConfigurationFormValues } from '@/features/eventConfiguration/types';
import { useEventLogoReference } from '@/features/eventConfiguration/useEventLogoReference';

interface ConfigurationFieldsProps {
  methods: UseFormReturn<EventConfigurationFormValues>;
  readOnly: boolean;
}

interface EventStylingFieldsProps {
  readOnly: boolean;
}

function numberFromInput(value: string, fallback: number): number {
  const next = Number(value);
  return Number.isNaN(next) ? fallback : next;
}

function toValidationSummary(errors: Record<string, unknown>): string {
  const messages = Object.values(errors)
    .map((error) =>
      error != null &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : null
    )
    .filter((message): message is string => message != null);
  return messages.join('; ') || 'Please correct the highlighted fields.';
}

function isEventColoursValidationError(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.startsWith('Invalid JSON in Event Colours field:') ||
    error.message === 'Event Colours JSON exceeds maximum length of 5000 characters'
  );
}

function ConfigurationFields({ methods, readOnly }: ConfigurationFieldsProps) {
  const errors = methods.formState.errors as Record<string, unknown>;
  const registrationScopeValue = (methods.watch('registration_scope') as string | null) ?? null;
  const registrationScopeLabel =
    registrationScopeValue === 'org_only'
      ? 'Org only'
      : registrationScopeValue === 'hierarchy'
        ? 'Hierarchy'
        : registrationScopeValue === 'open'
          ? 'Open'
          : '';

  return (
    <section className="grid gap-3">
      <fieldset className="grid grid-cols-1 gap-3 border-0 p-0 md:grid-cols-2">
        <FormField<EventConfigurationFormValues>
          name="event_name"
          label="Event Name"
          required
          render={({ field }) => (
            <Input id="event_name" value={String(field.value ?? '')} onChange={field.onChange} disabled={readOnly} />
          )}
        />
        <FormField<EventConfigurationFormValues>
          name="event_code"
          label="Event Code"
          render={({ field }) => (
            <Input
              id="event_code"
              value={String(field.value ?? '')}
              onChange={(value) => field.onChange(value.toUpperCase())}
              disabled={readOnly}
            />
          )}
        />
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 border-0 p-0 md:grid-cols-2">
        <article className="grid gap-1">
          <Label htmlFor="event_date">Event Date</Label>
          <DatePickerWithTimezone
            value={(methods.watch('event_date') as Date | null) ?? null}
            onChange={(value) => methods.setValue('event_date', value)}
            disabled={readOnly}
          />
        </article>
        <FormField<EventConfigurationFormValues>
          name="event_days"
          label="Event Days"
          render={({ field }) => (
            <Input
              id="event_days"
              type="number"
              value={`${field.value ?? 1}`}
              onChange={(value) => field.onChange(numberFromInput(value, 1))}
              disabled={readOnly}
            />
          )}
        />
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 border-0 p-0 md:grid-cols-2">
        <FormField<EventConfigurationFormValues>
          name="event_email"
          label="Event Email"
          render={({ field }) => (
            <Input
              id="event_email"
              type="email"
              value={String(field.value ?? '')}
              onChange={field.onChange}
              disabled={readOnly}
            />
          )}
        />
        {readOnly ? (
          <Label className="grid gap-1">
            Event Venue
            <Input
              value={
                (methods.watch('event_venue') as { formattedAddress?: string } | undefined)?.formattedAddress ?? ''
              }
              disabled
            />
          </Label>
        ) : (
          <AddressField
            control={methods.control as never}
            name="event_venue"
            provider={createGoogleMapsJsAddressProviderAdapter()}
            meta={{ id: 'event_venue', fieldType: 'address', label: 'Event Venue', required: false }}
          />
        )}
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 border-0 p-0 md:grid-cols-2">
        <FormField<EventConfigurationFormValues>
          name="expected_participants"
          label="Expected Participants"
          render={({ field }) => (
            <Input
              id="expected_participants"
              type="number"
              value={`${field.value ?? 0}`}
              onChange={(value) => field.onChange(numberFromInput(value, 0))}
              disabled={readOnly}
            />
          )}
        />
        <FormField<EventConfigurationFormValues>
          name="typical_unit_size"
          label="Typical Unit Size"
          render={({ field }) => (
            <Input
              id="typical_unit_size"
              type="number"
              value={`${field.value ?? 0}`}
              onChange={(value) => field.onChange(numberFromInput(value, 0))}
              disabled={readOnly}
            />
          )}
        />
      </fieldset>

      <FormField<EventConfigurationFormValues>
        name="description"
        label="Event Description"
        render={({ field }) => (
          <Textarea
            id="description"
            rows={4}
            value={String(field.value ?? '')}
            onChange={field.onChange}
            disabled={readOnly}
          />
        )}
      />

      <fieldset className="grid grid-cols-1 gap-3 border-0 p-0 md:grid-cols-2">
        <article className="grid gap-1">
          <Label htmlFor="registration_scope">Registration Scope</Label>
          {readOnly ? (
            <Input id="registration_scope" value={registrationScopeLabel} disabled />
          ) : (
            <Select
              value={registrationScopeValue}
              onValueChange={(value) =>
                methods.setValue(
                  'registration_scope',
                  value as EventConfigurationFormValues['registration_scope']
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select registration scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org_only">Org only</SelectItem>
                <SelectItem value="hierarchy">Hierarchy</SelectItem>
                <SelectItem value="open">Open</SelectItem>
              </SelectContent>
            </Select>
          )}
          {errors.registration_scope != null ? (
            <small>
              {(errors.registration_scope as { message?: string }).message ??
                'Registration scope is required'}
            </small>
          ) : null}
        </article>

        <article className="grid gap-1">
          <Label htmlFor="is_visible">Event is visible</Label>
          <Switch
            id="is_visible"
            checked={Boolean(methods.watch('is_visible'))}
            onChange={(checked) => methods.setValue('is_visible', checked)}
            disabled={readOnly}
          />
        </article>
      </fieldset>
    </section>
  );
}

function EventStylingFields({ readOnly }: EventStylingFieldsProps) {
  return (
    <section className="grid gap-3">
      <FormField<EventConfigurationFormValues>
        name="event_colours"
        label="Event Colours (JSON)"
        render={({ field }) => (
          <Textarea
            id="event_colours"
            rows={4}
            value={String(field.value ?? '')}
            onChange={field.onChange}
            disabled={readOnly}
            placeholder='{"primary": "#000000", "secondary": "#ffffff"}'
          />
        )}
      />
      <p>Enter valid JSON format for event colours</p>
    </section>
  );
}

export function EventConfigurationRoute() {
  const { toast } = useToast();
  const storageSupabase = useStorageCapableClient();
  const { selectedEventId, user } = useUnifiedAuth();
  const { organisationId, eventId, appId, isLoading: isScopeLoading } = useResolvedScope();
  const eventQuery = useEventConfigurationRecord(selectedEventId);
  const { data: logoRefFromQuery, refetch: refetchLogo } = useEventLogoReference(selectedEventId);
  const saveMutation = useSaveEventConfiguration();
  const saveLogoPointerMutation = useSaveEventLogoPointer();
  const [uploadedLogoRef, setUploadedLogoRef] = useState<typeof logoRefFromQuery>(null);
  const updateScope = {
    organisationId,
    eventId,
    appId: appId ?? undefined,
  };

  const eventName = useMemo(() => eventQuery.data?.event_name ?? 'Event', [eventQuery.data?.event_name]);

  if (selectedEventId == null) {
    return (
      <main className="grid min-h-[40vh] place-items-center">
        <p>No event selected. Choose an event from the header to begin.</p>
      </main>
    );
  }

  if (eventQuery.isLoading) {
    return (
      <main className="grid min-h-[40vh] place-items-center gap-2">
        <LoadingSpinner />
        <p>Loading event data…</p>
      </main>
    );
  }

  if (eventQuery.error != null || eventQuery.data == null) {
    const message = NormalizeSupabaseError(eventQuery.error).message;
    return (
      <main className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
              <Calendar className="size-4" />
              Event Configuration
            </CardTitle>
          </CardHeader>
        </Card>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </main>
    );
  }

  const logoRef = uploadedLogoRef ?? logoRefFromQuery;
  const logoFallback = formatEventLogoFallback(eventName);
  const uploadOrganisationId = eventQuery.data.organisation_id ?? organisationId;

  return (
    <main className="grid gap-4">
      <Form<EventConfigurationFormValues>
        key={`${selectedEventId}-${eventQuery.data.updated_at ?? 'form'}`}
        schema={eventConfigurationSchema}
        defaultValues={mapRecordToFormValues(eventQuery.data)}
        onSubmit={async (values) => {
          try {
            await saveMutation.mutateAsync({
              eventId: selectedEventId,
              userId: user?.id ?? null,
              values,
            });
            ShowSuccessMessage('Event saved successfully!', toast);
          } catch (error) {
            if (isEventColoursValidationError(error)) {
              toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
              });
              return;
            }
            HandleMutationError(error, 'event-configuration-save', toast);
          }
        }}
        onError={(invalidErrors) => {
          toast({
            title: 'Validation Error',
            description: toValidationSummary(invalidErrors as Record<string, unknown>),
            variant: 'destructive',
          });
        }}
        className="grid gap-4"
      >
        {(methods) => (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
                  <Calendar className="size-4" />
                  Event Configuration
                </CardTitle>
                <CardDescription>Editing: {eventName}</CardDescription>
              </CardHeader>
              <CardContent>
                <PagePermissionGuard
                  pageName="configuration"
                  operation="update"
                  scope={updateScope}
                  fallback={<ConfigurationFields methods={methods} readOnly />}
                >
                  <ConfigurationFields methods={methods} readOnly={false} />
                </PagePermissionGuard>
              </CardContent>
              <CardFooter className="text-right">
                <PagePermissionGuard pageName="configuration" operation="update" scope={updateScope} fallback={null}>
                  <Button type="submit" disabled={saveMutation.isPending} className="min-w-32">
                    {saveMutation.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </PagePermissionGuard>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Styling</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <article className="grid h-48 place-items-center rounded-md border border-dashed">
                    {logoRef != null ? (
                      <FileDisplay
                        fileReference={logoRef}
                        supabase={storageSupabase}
                        bucket="files"
                        variant="inline"
                        className="h-48 w-full object-contain"
                        label="Event logo"
                      />
                    ) : (
                      <p>{logoFallback}</p>
                    )}
                  </article>
                  <article className="grid gap-2">
                    <PagePermissionGuard pageName="configuration" operation="update" scope={updateScope} fallback={null}>
                      {isScopeLoading ? (
                        <p>Loading app configuration…</p>
                      ) : appId == null ? (
                        <p>App configuration unavailable.</p>
                      ) : storageSupabase == null ? (
                        <p>Storage client unavailable.</p>
                      ) : (
                        <FileUpload
                          supabase={storageSupabase}
                          bucket="files"
                          table_name="core_events"
                          record_id={selectedEventId}
                          organisation_id={uploadOrganisationId ?? ''}
                          app_id={appId}
                          category="event_logos"
                          folder="event_logos"
                          pageContext="configuration"
                          event_id={selectedEventId}
                          is_public
                          accept="image/*"
                          maxSize={5 * 1024 * 1024}
                          onUploadSuccess={(result) => {
                            const logoId = result.file_reference?.id ?? null;
                            const isPublic = result.file_reference?.is_public === true;

                            if (logoId == null || !isPublic) {
                              HandleMutationError(
                                new Error('Uploaded logo reference is invalid or not public.'),
                                'event-logo-pointer-save',
                                toast
                              );
                              return;
                            }

                            void saveLogoPointerMutation
                              .mutateAsync({
                                eventId: selectedEventId,
                                logoId,
                                userId: user?.id ?? null,
                              })
                              .then(() => {
                                setUploadedLogoRef(result.file_reference);
                                toast({
                                  title: 'Success',
                                  description: 'Logo uploaded successfully!',
                                  variant: 'success',
                                });
                                return refetchLogo();
                              })
                              .catch((error) => {
                                HandleMutationError(error, 'event-logo-pointer-save', toast);
                              });
                          }}
                          onUploadError={(error) => {
                            toast({
                              title: 'Error',
                              description: `Failed to upload logo: ${error.message}`,
                              variant: 'destructive',
                            });
                          }}
                          label="Upload logo"
                        />
                      )}
                    </PagePermissionGuard>
                  </article>
                </section>
                <PagePermissionGuard
                  pageName="configuration"
                  operation="update"
                  scope={updateScope}
                  fallback={<EventStylingFields readOnly />}
                >
                  <EventStylingFields readOnly={false} />
                </PagePermissionGuard>
              </CardContent>
            </Card>
          </>
        )}
      </Form>
    </main>
  );
}
