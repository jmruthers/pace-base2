import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { ScanPointRecord } from '../types';

export function useScanPointRecord(scanPointId: string | undefined): {
  scanPoint: ScanPointRecord | null | undefined;
  isLoading: boolean;
} {
  const secureSupabase = useSecureSupabase();

  const query = useQuery({
    queryKey: ['ba13-scan-point', scanPointId],
    enabled: secureSupabase != null && scanPointId != null && scanPointId.length > 0,
    queryFn: async (): Promise<ScanPointRecord | null> => {
      if (secureSupabase == null || scanPointId == null) {
        return null;
      }
      const client = secureSupabase as unknown as SupabaseClient;
      const { data, error } = await client
        .from('base_scan_point')
        .select(
          'id, name, context_type, direction, resource_type, resource_id, is_active, event_id, organisation_id'
        )
        .eq('id', scanPointId)
        .maybeSingle();
      if (error != null) {
        throw error;
      }
      if (data == null || typeof data !== 'object') {
        return null;
      }
      return data as ScanPointRecord;
    },
  });

  return {
    scanPoint: query.data,
    isLoading: query.isLoading,
  };
}
