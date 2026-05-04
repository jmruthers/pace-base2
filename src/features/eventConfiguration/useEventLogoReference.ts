import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { EventLogoReference } from './types';

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type SupabaseEventLogoPointerClient = {
  from: (table: string) => {
    select: (...args: unknown[]) => {
      eq: (...args: unknown[]) => {
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

type SupabaseFileReferenceClient = {
  from: (table: string) => {
    select: (...args: unknown[]) => {
      eq: (...args: unknown[]) => {
        eq: (...args: unknown[]) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
  };
};

async function fetchEventLogoReference(
  secureSupabase: ReturnType<typeof useSecureSupabase>,
  eventId: string
): Promise<ApiResult<EventLogoReference>> {
  if (secureSupabase == null) {
    return { ok: true, data: null };
  }

  const result = await (secureSupabase as unknown as SupabaseEventLogoPointerClient)
    .from('core_events')
    .select('logo_id')
    .eq('event_id', eventId)
    .single();

  if (result.error != null) {
    return { ok: false, error: { code: 'logo-pointer-read-error', message: String(result.error) } };
  }

  const logoId =
    result.data != null &&
    typeof result.data === 'object' &&
    'logo_id' in result.data &&
    typeof (result.data as { logo_id?: unknown }).logo_id === 'string'
      ? ((result.data as { logo_id: string }).logo_id ?? null)
      : null;

  if (logoId == null || logoId.trim().length === 0) {
    return { ok: true, data: null };
  }

  const logoReferenceResult = await (secureSupabase as unknown as SupabaseFileReferenceClient)
    .from('core_file_references')
    .select('*')
    .eq('id', logoId)
    .eq('is_public', true)
    .maybeSingle();

  if (logoReferenceResult.error != null) {
    return { ok: false, error: { code: 'logo-reference-read-error', message: String(logoReferenceResult.error) } };
  }

  return { ok: true, data: (logoReferenceResult.data as EventLogoReference) ?? null };
}

export function useEventLogoReference(eventId: string | null) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['event-logo-reference', eventId],
    enabled: eventId != null,
    queryFn: async () => {
      const result = await fetchEventLogoReference(secureSupabase, eventId as string);
      return result.ok ? result.data : null;
    },
  });
}
