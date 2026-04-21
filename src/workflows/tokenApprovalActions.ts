export type TokenApprovalDecision = 'approve' | 'reject';

export type TokenResolutionState =
  | 'valid'
  | 'expired'
  | 'reused'
  | 'resolved'
  | 'invalid';

interface RpcClient {
  rpc: (
    name: string,
    payload: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

export function validateTokenDecisionInput(input: {
  decision: TokenApprovalDecision;
  comments: string;
}): { ok: true } | { ok: false; reason: 'reject_requires_comments' } {
  if (input.decision === 'reject' && input.comments.trim().length === 0) {
    return { ok: false, reason: 'reject_requires_comments' };
  }
  return { ok: true };
}

export async function resolveToken(
  client: RpcClient,
  token: string
): Promise<{ state: TokenResolutionState; checkId?: string }> {
  const { data, error } = await client.rpc('data_base_application_check_token_resolve', {
    p_token: token,
  });
  if (error != null || data == null) {
    return { state: 'invalid' };
  }

  const resolved = data as { state: TokenResolutionState; check_id?: string };
  return { state: resolved.state, checkId: resolved.check_id };
}

export async function submitTokenDecision(
  client: RpcClient,
  input: {
    token: string;
    decision: TokenApprovalDecision;
    comments: string;
  }
): Promise<{ ok: true } | { ok: false; reason: 'invalid_token' | 'reject_requires_comments' }> {
  const validation = validateTokenDecisionInput({
    decision: input.decision,
    comments: input.comments,
  });
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  const { error } = await client.rpc('app_base_application_update', {
    p_token: input.token,
    p_decision: input.decision,
    p_comments: input.comments.trim(),
  });
  if (error != null) {
    return { ok: false, reason: 'invalid_token' };
  }

  return { ok: true };
}
