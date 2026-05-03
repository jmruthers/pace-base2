import { useMutation, useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { EventConfigurationFormValues, EventConfigurationRecord } from './types';
import {
  normaliseOptionalString,
  parseEventColours,
  serialiseAddressToVenue,
  toEventDateIso,
} from './shared';

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type SupabaseQueryClient = {
  from: (table: string) => {
    select: (...args: unknown[]) => {
      eq: (...args: unknown[]) => {
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
    update: (payload: Record<string, unknown>) => {
      eq: (...args: unknown[]) => {
        select: (...args: unknown[]) => {
          single: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
  };
};

async function fetchEventConfigurationRecord(
  secureSupabase: ReturnType<typeof useSecureSupabase>,
  eventId: string
): Promise<ApiResult<EventConfigurationRecord | null>> {
  if (secureSupabase == null) {
    return { ok: true, data: null };
  }

  const result = await (secureSupabase as unknown as SupabaseQueryClient)
    .from('core_events')
    .select(
      'event_id, event_name, event_code, event_email, event_date, event_days, event_venue, expected_participants, typical_unit_size, event_colours, is_visible, organisation_id, description, registration_scope, created_at, created_by, updated_at, updated_by'
    )
    .eq('event_id', eventId)
    .single();

  if (result.error != null) {
    return { ok: false, error: { code: 'configuration-read-error', message: String(result.error) } };
  }

  return { ok: true, data: (result.data as EventConfigurationRecord | null) ?? null };
}

interface SaveConfigurationParams {
  eventId: string;
  userId: string | null;
  values: EventConfigurationFormValues;
}

export function buildEventConfigurationUpdatePayload(params: SaveConfigurationParams) {
  return {
    event_name: params.values.event_name.trim(),
    event_code: normaliseOptionalString(params.values.event_code),
    event_email: normaliseOptionalString(params.values.event_email),
    event_date: toEventDateIso(params.values.event_date),
    event_days: params.values.event_days,
    event_venue: serialiseAddressToVenue(params.values.event_venue),
    expected_participants: params.values.expected_participants,
    typical_unit_size: params.values.typical_unit_size,
    registration_scope: params.values.registration_scope,
    event_colours: parseEventColours(params.values.event_colours),
    is_visible: params.values.is_visible,
    description: normaliseOptionalString(params.values.description),
    updated_at: new Date().toISOString(),
    updated_by: params.userId,
  };
}

async function saveEventConfigurationRecord(
  secureSupabase: ReturnType<typeof useSecureSupabase>,
  params: SaveConfigurationParams
): Promise<ApiResult<Record<string, unknown> | null>> {
  if (secureSupabase == null) {
    return { ok: false, error: { code: 'configuration-mutation-client-missing', message: 'Supabase client is not available' } };
  }

  const payload = buildEventConfigurationUpdatePayload(params);

  const result = await (secureSupabase as unknown as SupabaseQueryClient)
    .from('core_events')
    .update(payload)
    .eq('event_id', params.eventId)
    .select(
      'event_name, event_code, event_email, event_date, event_days, event_venue, expected_participants, typical_unit_size, registration_scope, event_colours, is_visible, description, updated_at, updated_by'
    )
    .single();

  if (result.error != null) {
    return { ok: false, error: { code: 'configuration-save-error', message: String(result.error) } };
  }

  return { ok: true, data: (result.data as Record<string, unknown> | null) ?? null };
}

export function useEventConfigurationRecord(eventId: string | null) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['event-configuration-record', eventId],
    enabled: eventId != null,
    queryFn: async () => {
      const result = await fetchEventConfigurationRecord(secureSupabase, eventId as string);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useSaveEventConfiguration() {
  const secureSupabase = useSecureSupabase();

  return useMutation({
    mutationFn: async (params: SaveConfigurationParams) => {
      const result = await saveEventConfigurationRecord(secureSupabase, params);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
