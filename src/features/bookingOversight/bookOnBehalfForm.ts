import { z } from '@solvera/pace-core/utils';
import { participantDisplayName, sessionDisplayLabel } from './display';
import type { ActivitySessionOptionRow, ApprovedApplicationOptionRow } from './types';

export const bookingCreateOnBehalfSchema = z.object({
  application_id: z.string().min(1, 'Participant is required.'),
  session_id: z.string().min(1, 'Session is required.'),
  override_capacity: z.boolean(),
  override_window: z.boolean(),
  override_conflict: z.boolean(),
});

export type CreateBookingOnBehalfFormValues = z.infer<typeof bookingCreateOnBehalfSchema>;

export function buildDefaultCreateBookingOnBehalfValues(): CreateBookingOnBehalfFormValues {
  return {
    application_id: '',
    session_id: '',
    override_capacity: false,
    override_window: false,
    override_conflict: false,
  };
}

export type BookingOverrideIntent =
  | {
      kind: 'create';
      title: string;
      confirmationBody: string;
      confirmLabel: string;
      eventId: string;
      organisationId: string;
      applicationId: string;
      sessionId: string;
      p_override_capacity: boolean;
      p_override_window: boolean;
      p_override_conflict: boolean;
    }
  | {
      kind: 'promote';
      title: string;
      confirmationBody: string;
      confirmLabel: string;
      eventId: string;
      organisationId: string;
      applicationId: string;
      sessionId: string;
      p_override_capacity: boolean;
    };

export function resolveApplicationParticipantLabel(
  apps: ApprovedApplicationOptionRow[] | undefined,
  applicationId: string
): string {
  const row = apps?.find((a) => a.id === applicationId);
  return row != null ? participantDisplayName(row.person) : applicationId;
}

export function resolveSessionDisplay(
  sessions: ActivitySessionOptionRow[] | undefined,
  sessionId: string,
  eventTimezone: string | null
): string {
  const row = sessions?.find((s) => s.id === sessionId);
  return row != null ? sessionDisplayLabel(row, eventTimezone) : sessionId;
}
