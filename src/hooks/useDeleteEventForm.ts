import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { eventFormsQueryKey } from './useEventFormsList';

type DeleteRpcClient = {
  rpc: (
    name: string,
    params: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function parseDependencyCount(
  row: Record<string, unknown>,
  key: 'response_count' | 'registration_binding_count'
): number {
  const value = row[key];
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function useDeleteEventForm(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (formId: string) => {
      if (eventId == null || secureSupabase == null) {
        throw new Error('Event and secure database client are required.');
      }

      const typedClient = secureSupabase as unknown as DeleteRpcClient;
      const { data, error } = await typedClient.rpc('app_base_form_delete', {
        p_event_id: eventId,
        p_form_id: formId,
      });
      if (error != null) {
        throw new Error(error.message);
      }

      const firstRow = Array.isArray(data) ? data[0] : null;
      const deleted =
        firstRow != null &&
        typeof firstRow === 'object' &&
        (firstRow as Record<string, unknown>).deleted === true;
      if (!deleted) {
        const row = firstRow != null && typeof firstRow === 'object' ? (firstRow as Record<string, unknown>) : {};
        const responseCount = parseDependencyCount(row, 'response_count');
        const registrationBindingCount = parseDependencyCount(row, 'registration_binding_count');
        throw new Error(
          `Form cannot be deleted because it has ${responseCount} responses and ${registrationBindingCount} registration bindings.`
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eventFormsQueryKey(eventId) });
    },
  });
}
