import { useCallback } from 'react';

interface RefetchableQuery {
  refetch: () => Promise<unknown>;
}

export async function retryRefetch(query: RefetchableQuery): Promise<void> {
  await query.refetch();
}

export function useRetryRefetchHandler(query: RefetchableQuery): () => void {
  return useCallback(() => {
    void retryRefetch(query);
  }, [query]);
}
