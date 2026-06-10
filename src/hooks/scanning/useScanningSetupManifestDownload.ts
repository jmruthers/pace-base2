import { useCallback, useState } from 'react';
import { toast } from '@solvera/pace-core/components';
import { isOk } from '@solvera/pace-core/types';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import { persistManifestToIdb } from '@/features/scanningSetup/manifestIdb';
import type { ManifestContextType } from '@/features/scanningSetup/scanEventTypes';
import { loadManifestByContext } from '@/features/scanningSetup/scanningManifestApi';

export function useScanningSetupManifestDownload(
  secureSupabase: unknown,
  eventId: string | null,
  organisationId: string | null
) {
  const [manifestLoading, setManifestLoading] = useState<Record<ManifestContextType, boolean>>({
    site: false,
    activity: false,
    transport: false,
    meal: false,
  });

  const onManifestDownload = useCallback(
    async (contextType: ManifestContextType) => {
      if (secureSupabase == null || eventId == null || organisationId == null) {
        return;
      }
      setManifestLoading((state) => ({ ...state, [contextType]: true }));
      try {
        const rows = await loadManifestByContext(
          secureSupabase as unknown as Parameters<typeof loadManifestByContext>[0],
          contextType,
          eventId,
          organisationId
        );
        const persist = await persistManifestToIdb({ eventId, manifestType: contextType, rows });
        if (!isOk(persist)) {
          toast({
            title: 'Error',
            description: persist.error.message,
            variant: 'destructive',
          });
          return;
        }
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const date = new Date();
        const yyyy = `${date.getFullYear()}`;
        const mm = `${date.getMonth() + 1}`.padStart(2, '0');
        const dd = `${date.getDate()}`.padStart(2, '0');
        anchor.href = url;
        anchor.download = `${contextType}-manifest-${eventId}-${yyyy}-${mm}-${dd}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        toast({
          title: 'Error',
          description: NormalizeSupabaseError(error).message,
          variant: 'destructive',
        });
      } finally {
        setManifestLoading((state) => ({ ...state, [contextType]: false }));
      }
    },
    [eventId, organisationId, secureSupabase]
  );

  return { manifestLoading, onManifestDownload };
}
