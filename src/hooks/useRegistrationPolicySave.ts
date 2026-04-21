import { useCallback } from 'react';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

interface PolicyRequirementPayload {
  requirement_type: string;
  sort_order: number;
  state: string;
}

interface PolicyPayload {
  event_id: string;
  registration_type_name: string;
  registration_scope: string;
  eligibility_summary: string;
  requirements: ReadonlyArray<PolicyRequirementPayload>;
}

interface PolicySaveResult {
  ok: boolean;
  errorMessage?: string;
}

export function useRegistrationPolicySave() {
  const secureSupabase = useSecureSupabase();

  const savePolicy = useCallback(
    async (payload: PolicyPayload): Promise<PolicySaveResult> => {
      if (secureSupabase == null) {
        return { ok: false, errorMessage: 'Configuration service is unavailable.' };
      }

      type RegistrationPolicyClient = {
        rpc: (
          name: string,
          params: Record<string, unknown>
        ) => Promise<{ error: { message: string } | null }>;
      };

      const typedClient = secureSupabase as RegistrationPolicyClient;
      const { error } = await typedClient.rpc(
        'app_base_registration_policy_upsert',
        payload as unknown as Record<string, unknown>
      );
      if (error != null) {
        return { ok: false, errorMessage: error.message };
      }

      return { ok: true };
    },
    [secureSupabase]
  );

  return { savePolicy };
}
