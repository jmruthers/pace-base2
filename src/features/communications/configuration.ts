import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

type QueryChain = {
  select: (columns: string) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  in: (column: string, values: unknown[]) => QueryChain;
  limit: (value: number) => QueryChain;
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

interface ApprovedApplicationRow {
  person_id: string | null;
  core_person: {
    preferred_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface MemberRow {
  id: string;
  person_id: string | null;
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

function resolveParticipantLabel(person: ApprovedApplicationRow['core_person']): string {
  const preferredName = person?.preferred_name?.trim() ?? '';
  if (preferredName.length > 0) {
    return preferredName;
  }

  const firstName = person?.first_name?.trim() ?? '';
  const lastName = person?.last_name?.trim() ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName.length > 0) {
    return fullName;
  }

  return 'Unnamed participant';
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

export function useSpecificParticipantOptions(
  eventId: string | null,
  organisationId: string | null,
  enabled = true
) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['ba17', 'specific-participant-options', organisationId, eventId],
    enabled: enabled && eventId != null && organisationId != null && secureSupabase != null,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data: approvedApplications, error: approvedApplicationsError } = await supabase
        .from('base_application')
        .select('person_id, core_person!inner(preferred_name, first_name, last_name)')
        .eq('event_id', eventId as string)
        .eq('organisation_id', organisationId as string)
        .eq('status', 'approved')
        .limit(500);

      if (approvedApplicationsError != null) {
        throw new Error(
          messageFromError(
            approvedApplicationsError,
            'Failed to load approved participants for manual selection.'
          )
        );
      }

      const participantRows = (approvedApplications as ApprovedApplicationRow[] | null) ?? [];
      const personIds = participantRows
        .map((row) => row.person_id)
        .filter((personId): personId is string => personId != null);

      if (personIds.length === 0) {
        return [];
      }

      const { data: members, error: membersError } = await supabase
        .from('core_member')
        .select('id, person_id')
        .eq('organisation_id', organisationId as string)
        .in('person_id', personIds);

      if (membersError != null) {
        throw new Error(
          messageFromError(membersError, 'Failed to resolve participants for manual selection.')
        );
      }

      const membersByPersonId = new Map<string, string>();
      for (const member of (members as MemberRow[] | null) ?? []) {
        if (member.person_id != null) {
          membersByPersonId.set(member.person_id, member.id);
        }
      }

      return participantRows
        .map((row) => {
          const personId = row.person_id;
          if (personId == null) {
            return null;
          }

          const memberId = membersByPersonId.get(personId);
          if (memberId == null) {
            return null;
          }

          return {
            value: memberId,
            label: resolveParticipantLabel(row.core_person),
          };
        })
        .filter((option): option is { value: string; label: string } => option != null);
    },
  });
}
