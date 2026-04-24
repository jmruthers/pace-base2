import type { ApiResult } from './apiResult';

export type RegistrationSubmissionResult =
  | { status: 'approved'; applicationId: string }
  | { status: 'under_review'; applicationId: string; firstCheckId: string | null }
  | { status: 'rejected'; reason: 'validation_failed' | 'scope_denied' | 'ineligible' };

interface SecureSupabaseRpcClient {
  rpc: (
    name: string,
    payload: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

interface ResolveEntrypointInput {
  eventSlug: string;
  formSlug: string;
  availableBindings: ReadonlyArray<{
    registration_type_id: string;
    registration_type_name: string;
  }>;
}

export interface SubmitRegistrationInput {
  eventId: string;
  personId: string;
  registrationTypeId: string;
  formId: string;
  responseValues: Record<string, unknown>;
}

export function resolveEntrypointSelection(input: ResolveEntrypointInput): {
  mode: 'fixed' | 'open';
  allowedRegistrationTypeIds: ReadonlyArray<string>;
} {
  const allowedRegistrationTypeIds = input.availableBindings.map(
    (binding) => binding.registration_type_id
  );
  return {
    mode: allowedRegistrationTypeIds.length === 1 ? 'fixed' : 'open',
    allowedRegistrationTypeIds,
  };
}

export async function submitRegistrationApplication(
  client: SecureSupabaseRpcClient,
  input: SubmitRegistrationInput
): Promise<ApiResult<RegistrationSubmissionResult>> {
  const scopeResult = await client.rpc('data_event_applicant_org_allowed', {
    p_event_id: input.eventId,
    p_person_id: input.personId,
  });
  if (scopeResult.error != null) {
    return {
      ok: false,
      error: {
        code: 'scope_denied',
        message: scopeResult.error.message,
      },
    };
  }

  const createResult = await client.rpc('app_base_application_create', {
    p_event_id: input.eventId,
    p_person_id: input.personId,
    p_registration_type_id: input.registrationTypeId,
    p_form_id: input.formId,
    p_response_values: input.responseValues,
  });

  if (createResult.error != null || createResult.data == null) {
    return {
      ok: false,
      error: {
        code: 'validation_failed',
        message: createResult.error?.message ?? 'Registration application failed validation.',
      },
    };
  }

  const createData = createResult.data as {
    application_id: string;
    status: 'approved' | 'under_review';
    first_check_id?: string | null;
  };

  if (createData.status === 'approved') {
    return {
      ok: true,
      data: { status: 'approved', applicationId: createData.application_id },
    };
  }

  return {
    ok: true,
    data: {
      status: 'under_review',
      applicationId: createData.application_id,
      firstCheckId: createData.first_check_id ?? null,
    },
  };
}
