import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { deriveParticipantName } from '@/features/scanningSetup/shared';
import type { ManualParticipantSearchRow } from '@/features/scanningRuntime/types';

type AppRow = {
  id: string;
  person_id: string;
  core_person:
    | {
        preferred_name: string | null;
        first_name: string | null;
        last_name: string | null;
      }
    | Array<{
        preferred_name: string | null;
        first_name: string | null;
        last_name: string | null;
      }>;
};

export function useManualParticipantSearch(params: {
  manualOpen: boolean;
  manualSearch: string;
  eventId: string | null;
  organisationId: string | null;
  secureSupabase: SupabaseClient | null;
}) {
  const { manualOpen, manualSearch, eventId, organisationId, secureSupabase } = params;

  const [manualResults, setManualResults] = useState<ManualParticipantSearchRow[]>([]);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!manualOpen || secureSupabase == null || eventId == null) {
      return undefined;
    }
    const term = manualSearch.trim();
    if (term.length < 2) {
      return undefined;
    }
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void (async () => {
        if (organisationId == null) {
          return;
        }
        const pattern = `%${term.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        const client = secureSupabase as unknown as SupabaseClient;
        const { data, error } = await client
          .from('base_application')
          .select('id, person_id, core_person!inner(preferred_name, first_name, last_name)')
          .eq('event_id', eventId)
          .eq('organisation_id', organisationId)
          .eq('status', 'approved')
          .or(
            `preferred_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
            { foreignTable: 'core_person' }
          )
          .limit(20);
        if (error != null) {
          setManualResults([]);
          return;
        }
        const rows: ManualParticipantSearchRow[] = [];
        for (const row of ((data as unknown) as AppRow[] | null) ?? []) {
          const cp = Array.isArray(row.core_person) ? row.core_person[0] : row.core_person;
          const name = deriveParticipantName(cp) ?? row.person_id;
          rows.push({ applicationId: row.id, personId: row.person_id, displayName: name });
        }
        setManualResults(rows);
      })();
    }, 200);
    return () => window.clearTimeout(debounceRef.current);
  }, [eventId, manualOpen, manualSearch, organisationId, secureSupabase]);

  return { manualResults, setManualResults };
}
