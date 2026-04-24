import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

export const eventRegistrationTypesQueryKey = (eventId: string | null) =>
  ['event-registration-types', eventId] as const;

type RegistrationTypesReadClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options?: { ascending?: boolean }
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
};

interface RegistrationTypeRow {
  id: string;
  name: string;
  is_active: boolean | null;
  sort_order: number | null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export interface RegistrationTypeListItem {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number | null;
}

export function useEventRegistrationTypesList(eventId: string | null) {
  const secureSupabase = useSecureSupabase();

  return useQuery<ReadonlyArray<RegistrationTypeListItem>, Error>({
    queryKey: eventRegistrationTypesQueryKey(eventId),
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      if (eventId == null || secureSupabase == null) {
        return [];
      }

      const client = secureSupabase as unknown as RegistrationTypesReadClient;
      const { data, error } = await client
        .from('base_registration_type')
        .select('id, name, is_active, sort_order')
        .eq('event_id', eventId)
        .order('name', { ascending: true });

      if (error != null) {
        throw new Error(error.message);
      }

      const rows = (Array.isArray(data) ? data : []) as ReadonlyArray<RegistrationTypeRow>;
      return rows.map((row) => ({
        id: asString(row.id),
        name: asString(row.name),
        is_active: row.is_active === true,
        sort_order: typeof row.sort_order === 'number' ? row.sort_order : null,
      }));
    },
  });
}
