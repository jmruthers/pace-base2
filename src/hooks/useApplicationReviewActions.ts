import { useCallback } from 'react';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

interface ReviewActionResult {
  ok: boolean;
  errorMessage?: string;
}

export function useApplicationReviewActions() {
  const secureSupabase = useSecureSupabase();

  const setApplicationStatus = useCallback(
    async (input: {
      applicationId: string;
      status: 'approved' | 'rejected' | 'under_review';
    }): Promise<ReviewActionResult> => {
      if (secureSupabase == null) {
        return { ok: false, errorMessage: 'Configuration service is unavailable.' };
      }

      type ReviewClient = {
        rpc: (
          name: string,
          payload: Record<string, unknown>
        ) => Promise<{ error: { message: string } | null }>;
      };

      const typedClient = secureSupabase as ReviewClient;
      const { error } = await typedClient.rpc('app_base_application_set_status', {
        p_application_id: input.applicationId,
        p_status: input.status,
      });
      if (error != null) {
        return { ok: false, errorMessage: error.message };
      }
      return { ok: true };
    },
    [secureSupabase]
  );

  const reissueApprovalToken = useCallback(
    async (input: { checkId: string }): Promise<ReviewActionResult> => {
      if (secureSupabase == null) {
        return { ok: false, errorMessage: 'Configuration service is unavailable.' };
      }

      type ReviewClient = {
        rpc: (
          name: string,
          payload: Record<string, unknown>
        ) => Promise<{ error: { message: string } | null }>;
      };
      const typedClient = secureSupabase as ReviewClient;
      const { error } = await typedClient.rpc('app_base_application_reissue_token', {
        p_check_id: input.checkId,
      });
      if (error != null) {
        return { ok: false, errorMessage: error.message };
      }
      return { ok: true };
    },
    [secureSupabase]
  );

  return { setApplicationStatus, reissueApprovalToken };
}
