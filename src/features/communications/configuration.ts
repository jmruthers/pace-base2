import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

type QueryChain = {
  select: (columns: string) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  order: (column: string, options?: { ascending?: boolean }) => QueryChain;
} & PromiseLike<{ data: unknown; error: unknown }>;

type SupabaseLike = {
  from: (table: string) => QueryChain;
};

interface RegistrationTypeRow {
  id: string;
  name: string | null;
}

interface UnitOptionRow {
  id: string;
  unit_name: string | null;
  unit_number: number;
}

function asSupabaseClient(client: ReturnType<typeof useSecureSupabase>): SupabaseLike {
  return client as unknown as SupabaseLike;
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return fallback;
}

export function useRegistrationTypeFilterOptions(eventId: string | null) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['ba17', 'registration-type-options', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_registration_type')
        .select('id, name')
        .eq('event_id', eventId as string)
        .order('name', { ascending: true });
      if (error != null) {
        throw new Error(messageFromError(error, 'Failed to load registration type options.'));
      }

      return ((data as RegistrationTypeRow[] | null) ?? []).map((row) => ({
        value: row.id,
        label: row.name?.trim() || 'Unnamed registration type',
      }));
    },
  });
}

export function useUnitFilterOptions(eventId: string | null) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['ba17', 'unit-options', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_units')
        .select('id, unit_name, unit_number')
        .eq('event_id', eventId as string)
        .order('unit_number', { ascending: true });
      if (error != null) {
        throw new Error(messageFromError(error, 'Failed to load unit options.'));
      }

      return ((data as UnitOptionRow[] | null) ?? []).map((row) => ({
        value: row.id,
        label:
          row.unit_name?.trim().length != null && row.unit_name?.trim().length > 0
            ? row.unit_name.trim()
            : `Unit ${row.unit_number}`,
      }));
    },
  });
}
