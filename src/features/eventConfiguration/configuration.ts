import { useMutation, useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import type { EventConfigurationFormValues, EventConfigurationRecord } from './types';
import {
  normaliseOptionalString,
  parseEventColours,
  serialiseAddressToVenue,
  toEventDateIso,
} from './shared';

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; original: unknown } };

type ErrorLike = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  status?: unknown;
  statusText?: unknown;
};

function asErrorLike(value: unknown): ErrorLike | null {
  if (value == null || typeof value !== 'object') {
    return null;
  }
  return value as ErrorLike;
}

function normaliseMutationErrorMessage(error: unknown): string {
  const normalized = NormalizeSupabaseError(error);
  const normalizedMessage = normalized.message.trim();
  const rawError = asErrorLike(error);
  const details = typeof rawError?.details === 'string' ? rawError.details.trim() : '';
  const hint = typeof rawError?.hint === 'string' ? rawError.hint.trim() : '';

  if (normalizedMessage.length > 0) {
    if (details.length > 0 || hint.length > 0) {
      const suffix = [details, hint].filter((value) => value.length > 0).join(' ');
      return `${normalizedMessage} ${suffix}`.trim();
    }
    return normalizedMessage;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  let serialized = '';
  try {
    serialized = JSON.stringify(error);
  } catch (serializationError) {
    if (serializationError instanceof Error && serializationError.message.trim().length > 0) {
      return serializationError.message.trim();
    }
  }
  if (serialized.length > 0 && serialized !== '{}') {
    return serialized;
  }

  if (normalizedMessage.length > 0) {
    return normalizedMessage;
  }
  return 'Unknown Supabase error.';
}

type SupabaseQueryClient = {
  rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
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
    const error = new Error('Supabase client is not available');
    return {
      ok: false,
      error: {
        code: 'configuration-read-client-missing',
        message: error.message,
        original: error,
      },
    };
  }

  const result = await (secureSupabase as unknown as SupabaseQueryClient)
    .from('core_events')
    .select(
      'event_id, logo_id, event_name, event_code, event_email, event_date, event_days, event_venue, expected_participants, typical_unit_size, event_colours, is_visible, organisation_id, description, registration_scope, created_at, created_by, updated_at, updated_by'
    )
    .eq('event_id', eventId)
    .single();

  if (result.error != null) {
    return {
      ok: false,
      error: {
        code: 'configuration-read-error',
        message: normaliseMutationErrorMessage(result.error),
        original: result.error,
      },
    };
  }

  return { ok: true, data: (result.data as EventConfigurationRecord | null) ?? null };
}

interface SaveConfigurationParams {
  eventId: string;
  userId: string | null;
  values: EventConfigurationFormValues;
  organisationId?: string | null;
  scopeEventId?: string | null;
  appId?: string | null;
}

interface SaveEventLogoPointerParams {
  eventId: string;
  logoId: string;
  userId: string | null;
  organisationId?: string | null;
  scopeEventId?: string | null;
  appId?: string | null;
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
    const error = new Error('Supabase client is not available');
    return {
      ok: false,
      error: {
        code: 'configuration-mutation-client-missing',
        message: error.message,
        original: error,
      },
    };
  }

  const payload = buildEventConfigurationUpdatePayload(params);

  const result = await (secureSupabase as unknown as SupabaseQueryClient)
    .rpc('app_event_configuration_update', {
      p_event_id: params.eventId,
      p_organisation_id: params.organisationId ?? null,
      p_app_id: params.appId ?? null,
      p_user_id: params.userId ?? null,
      p_event_name: payload.event_name,
      p_event_code: payload.event_code,
      p_event_email: payload.event_email,
      p_event_date: payload.event_date,
      p_event_days: payload.event_days,
      p_event_venue: payload.event_venue,
      p_expected_participants: payload.expected_participants,
      p_typical_unit_size: payload.typical_unit_size,
      p_registration_scope: payload.registration_scope,
      p_event_colours: payload.event_colours,
      p_is_visible: payload.is_visible,
      p_description: payload.description,
    });

  if (result.error != null) {
    return {
      ok: false,
      error: {
        code: 'configuration-save-error',
        message: normaliseMutationErrorMessage(result.error),
        original: result.error,
      },
    };
  }

  const updatedRow = Array.isArray(result.data) ? (result.data[0] as Record<string, unknown> | null) : (result.data as Record<string, unknown> | null);

  if (updatedRow == null) {
    return {
      ok: false,
      error: {
        code: 'configuration-save-no-row',
        message:
          'Save could not be completed for this record in the current permission scope. The update affected zero rows.',
        original: {
          code: 'configuration-save-no-row',
          details: {
            eventId: params.eventId,
            organisationId: params.organisationId ?? null,
            scopeEventId: params.scopeEventId ?? null,
            appId: params.appId ?? null,
          },
          category: 'permission_or_policy',
        },
      },
    };
  }

  return { ok: true, data: updatedRow };
}

async function saveEventLogoPointer(
  secureSupabase: ReturnType<typeof useSecureSupabase>,
  params: SaveEventLogoPointerParams
): Promise<ApiResult<Record<string, unknown> | null>> {
  if (secureSupabase == null) {
    const error = new Error('Supabase client is not available');
    return {
      ok: false,
      error: {
        code: 'configuration-logo-pointer-client-missing',
        message: error.message,
        original: error,
      },
    };
  }

  const result = await (secureSupabase as unknown as SupabaseQueryClient)
    .rpc('app_event_logo_pointer_update', {
      p_event_id: params.eventId,
      p_organisation_id: params.organisationId ?? null,
      p_app_id: params.appId ?? null,
      p_logo_id: params.logoId,
      p_user_id: params.userId ?? null,
    })

  if (result.error != null) {
    return {
      ok: false,
      error: {
        code: 'configuration-logo-pointer-save-error',
        message: normaliseMutationErrorMessage(result.error),
        original: result.error,
      },
    };
  }

  const updatedLogoRow = Array.isArray(result.data) ? (result.data[0] as Record<string, unknown> | null) : (result.data as Record<string, unknown> | null);

  if (updatedLogoRow == null) {
    return {
      ok: false,
      error: {
        code: 'configuration-logo-pointer-save-no-row',
        message:
          'Logo pointer save could not be completed in the current permission scope. The update affected zero rows.',
        original: {
          code: 'configuration-logo-pointer-save-no-row',
          details: {
            eventId: params.eventId,
            organisationId: params.organisationId ?? null,
            scopeEventId: params.scopeEventId ?? null,
            appId: params.appId ?? null,
          },
          category: 'permission_or_policy',
        },
      },
    };
  }

  return { ok: true, data: updatedLogoRow };
}

function useEventConfigurationRecordQuery(
  eventId: string | null,
  secureSupabase: ReturnType<typeof useSecureSupabase>,
  scopeKey?: { organisationId: string | null; eventId: string | null; appId: string | null }
) {
  return useQuery({
    queryKey: [
      'event-configuration-record',
      eventId,
      scopeKey?.organisationId ?? null,
      scopeKey?.eventId ?? null,
      scopeKey?.appId ?? null,
    ],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const result = await fetchEventConfigurationRecord(secureSupabase, eventId as string);
      if (!result.ok) {
        throw result.error.original;
      }
      return result.data;
    },
  });
}

export function useEventConfigurationRecord(
  eventId: string | null,
  scopeKey?: { organisationId: string | null; eventId: string | null; appId: string | null }
) {
  const secureSupabase = useSecureSupabase();
  return useEventConfigurationRecordQuery(eventId, secureSupabase, scopeKey);
}

function useEventConfigurationMutation(
  secureSupabase: ReturnType<typeof useSecureSupabase>
) {
  return useMutation({
    mutationFn: async (params: SaveConfigurationParams) => {
      const result = await saveEventConfigurationRecord(secureSupabase, params);
      if (!result.ok) {
        throw result.error.original;
      }
      return result.data;
    },
  });
}

export function useSaveEventConfiguration() {
  const secureSupabase = useSecureSupabase();
  return useEventConfigurationMutation(secureSupabase);
}

function useEventLogoPointerMutation(
  secureSupabase: ReturnType<typeof useSecureSupabase>
) {
  return useMutation({
    mutationFn: async (params: SaveEventLogoPointerParams) => {
      const result = await saveEventLogoPointer(secureSupabase, params);
      if (!result.ok) {
        throw result.error.original;
      }
      return result.data;
    },
  });
}

export function useSaveEventLogoPointer() {
  const secureSupabase = useSecureSupabase();
  return useEventLogoPointerMutation(secureSupabase);
}
