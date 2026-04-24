import { useCallback } from 'react';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

interface BuilderPayload {
  event_id: string;
  title: string;
  slug: string;
  workflow_type: string;
  access_mode: string;
  field_key: string;
  form_id?: string;
}

interface BuilderSaveResult {
  ok: boolean;
  errorMessage?: string;
}

export function useFormBuilderSave() {
  const secureSupabase = useSecureSupabase();

  const saveBuilder = useCallback(
    async (payload: BuilderPayload): Promise<BuilderSaveResult> => {
      if (secureSupabase == null) {
        return { ok: false, errorMessage: 'Configuration service is unavailable.' };
      }

      type BuilderRpcClient = {
        rpc: (
          name: string,
          params: Record<string, unknown>
        ) => Promise<{ error: { message: string } | null }>;
      };

      const typedClient = secureSupabase as BuilderRpcClient;
      const { error } = await typedClient.rpc(
        'app_base_forms_builder_upsert',
        payload as unknown as Record<string, unknown>
      );
      if (error != null) {
        return { ok: false, errorMessage: error.message };
      }

      return { ok: true };
    },
    [secureSupabase]
  );

  return { saveBuilder };
}
