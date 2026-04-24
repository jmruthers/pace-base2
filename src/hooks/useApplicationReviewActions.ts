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

      type UpdateClient = {
        from: (table: string) => {
          update: (values: Record<string, unknown>) => {
            eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };

      const typedClient = secureSupabase as UpdateClient;
      const { error } = await typedClient
        .from('base_application')
        .update({
          status: input.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.applicationId);
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
      // BA06: organiser reissue is expected to be a dedicated SECURITY DEFINER RPC when published in pace-core2.
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
