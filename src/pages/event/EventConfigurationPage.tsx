import { useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Form,
  Input,
  Label,
  Textarea,
} from '@solvera/pace-core/components';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard, useSecureSupabase } from '@solvera/pace-core/rbac';

type RegistrationScope = 'public' | 'member' | 'invited' | '';

interface EventConfigurationFormState {
  event_name: string;
  event_date: string;
  event_days: number;
  event_venue: string;
  typical_unit_size: number;
  event_code: string;
  expected_participants: number;
  event_colours: string;
  event_email: string;
  is_visible: boolean;
  description: string;
  public_readable: boolean;
  registration_scope: RegistrationScope;
}

const DEFAULT_FORM_STATE: EventConfigurationFormState = {
  event_name: '',
  event_date: '',
  event_days: 1,
  event_venue: '',
  typical_unit_size: 0,
  event_code: '',
  expected_participants: 0,
  event_colours: '',
  event_email: '',
  is_visible: false,
  description: '',
  public_readable: false,
  registration_scope: '',
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function mapEventToFormState(eventRecord: Record<string, unknown>): EventConfigurationFormState {
  return {
    event_name: asString(eventRecord.event_name),
    event_date: asString(eventRecord.event_date),
    event_days: asNumber(eventRecord.event_days, 1),
    event_venue: asString(eventRecord.event_venue),
    typical_unit_size: asNumber(eventRecord.typical_unit_size, 0),
    event_code: asString(eventRecord.event_code),
    expected_participants: asNumber(eventRecord.expected_participants, 0),
    event_colours: asString(eventRecord.event_colours),
    event_email: asString(eventRecord.event_email),
    is_visible: asBoolean(eventRecord.is_visible),
    description: asString(eventRecord.description),
    public_readable: asBoolean(eventRecord.public_readable),
    registration_scope: asString(eventRecord.registration_scope) as RegistrationScope,
  };
}

export function EventConfigurationPage() {
  const secureSupabase = useSecureSupabase();
  const { selectedEvent } = useUnifiedAuth();
  const [statusMessage, setStatusMessage] = useState<string>('');

  const eventRecord = (selectedEvent ?? {}) as Record<string, unknown>;
  const [formState, setFormState] = useState<EventConfigurationFormState>(() =>
    selectedEvent == null ? DEFAULT_FORM_STATE : mapEventToFormState(eventRecord)
  );

  const canSave = selectedEvent != null && secureSupabase != null;

  const handleSubmit = async () => {
    setStatusMessage('');

    if (selectedEvent == null) {
      setStatusMessage('No selected event is available for configuration.');
      return;
    }

    if (secureSupabase == null) {
      setStatusMessage('Configuration service is unavailable.');
      return;
    }

    type SecureSupabaseClient = {
      from: (table: string) => {
        update: (payload: EventConfigurationFormState) => {
          eq: (
            column: string,
            value: string
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    };

    const eventId = (selectedEvent as Record<string, unknown>).id;
    if (typeof eventId !== 'string') {
      setStatusMessage('Configuration update failed: event id is unavailable.');
      return;
    }

    const typedClient = secureSupabase as SecureSupabaseClient;
    const { error } = await typedClient
      .from('core_events')
      .update(formState)
      .eq('id', eventId);

    if (error != null) {
      setStatusMessage(`Configuration update failed: ${error.message}`);
      return;
    }

    setStatusMessage('Configuration saved.');
  };

  return (
    <PagePermissionGuard pageName="configuration" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Event configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEvent == null ? (
              <p>Select an event before editing configuration.</p>
            ) : (
              <Form<EventConfigurationFormState>
                defaultValues={formState}
                onSubmit={() => {
                  void handleSubmit();
                }}
              >
                <Label htmlFor="event_name">
                  Event name
                  <Input
                    id="event_name"
                    value={formState.event_name}
                    onChange={(nextValue) =>
                      setFormState((previous) => ({ ...previous, event_name: String(nextValue) }))
                    }
                  />
                </Label>

                <Label htmlFor="event_date">
                  Event date
                  <Input
                    id="event_date"
                    value={formState.event_date}
                    onChange={(nextValue) =>
                      setFormState((previous) => ({ ...previous, event_date: String(nextValue) }))
                    }
                  />
                </Label>

              <Label htmlFor="event_days">
                Event days
                <Input
                  id="event_days"
                  type="number"
                  value={String(formState.event_days)}
                  onChange={(nextValue) =>
                    setFormState((previous) => ({
                      ...previous,
                      event_days: Number(nextValue),
                    }))
                  }
                />
              </Label>

              <Label htmlFor="event_venue">
                Event venue
                <Input
                  id="event_venue"
                  value={formState.event_venue}
                  onChange={(nextValue) =>
                    setFormState((previous) => ({ ...previous, event_venue: String(nextValue) }))
                  }
                />
              </Label>

              <Label htmlFor="typical_unit_size">
                Typical unit size
                <Input
                  id="typical_unit_size"
                  type="number"
                  value={String(formState.typical_unit_size)}
                  onChange={(nextValue) =>
                    setFormState((previous) => ({
                      ...previous,
                      typical_unit_size: Number(nextValue),
                    }))
                  }
                />
              </Label>

              <Label htmlFor="event_code">
                Event code
                <Input
                  id="event_code"
                  value={formState.event_code}
                  onChange={(nextValue) =>
                    setFormState((previous) => ({ ...previous, event_code: String(nextValue) }))
                  }
                />
              </Label>

              <Label htmlFor="expected_participants">
                Expected participants
                <Input
                  id="expected_participants"
                  type="number"
                  value={String(formState.expected_participants)}
                  onChange={(nextValue) =>
                    setFormState((previous) => ({
                      ...previous,
                      expected_participants: Number(nextValue),
                    }))
                  }
                />
              </Label>

              <Label htmlFor="event_colours">
                Event colours
                <Input
                  id="event_colours"
                  value={formState.event_colours}
                  onChange={(nextValue) =>
                    setFormState((previous) => ({
                      ...previous,
                      event_colours: String(nextValue),
                    }))
                  }
                />
              </Label>

              <Label htmlFor="event_email">
                Event email
                <Input
                  id="event_email"
                  value={formState.event_email}
                  onChange={(nextValue) =>
                    setFormState((previous) => ({ ...previous, event_email: String(nextValue) }))
                  }
                />
              </Label>

              <Label htmlFor="description">
                Description
                <Textarea
                  id="description"
                  value={formState.description}
                  onChange={(nextValue) =>
                    setFormState((previous) => ({ ...previous, description: String(nextValue) }))
                  }
                />
              </Label>

              <Label htmlFor="registration_scope">
                Registration scope
                <Input
                  id="registration_scope"
                  value={formState.registration_scope}
                  onChange={(nextValue) =>
                    setFormState((previous) => ({
                      ...previous,
                      registration_scope: String(nextValue) as RegistrationScope,
                    }))
                  }
                />
              </Label>

              <Label htmlFor="is_visible">
                Is visible
                <Checkbox
                  id="is_visible"
                  checked={formState.is_visible}
                  onChange={(checkedValue) =>
                    setFormState((previous) => ({
                      ...previous,
                      is_visible: Boolean(checkedValue),
                    }))
                  }
                />
              </Label>

              <Label htmlFor="public_readable">
                Public readable
                <Checkbox
                  id="public_readable"
                  checked={formState.public_readable}
                  onChange={(checkedValue) =>
                    setFormState((previous) => ({
                      ...previous,
                      public_readable: Boolean(checkedValue),
                    }))
                  }
                />
              </Label>

                <CardFooter>
                  <Button type="submit" disabled={!canSave}>
                    Save configuration
                  </Button>
                </CardFooter>
              </Form>
            )}

            {statusMessage.length > 0 && <p>{statusMessage}</p>}
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
