type ParticipantVisibleCheckState = 'pending' | 'completed' | 'not_required';

export interface ApplicationProgressCheck {
  check_id: string;
  check_type: string;
  state: ParticipantVisibleCheckState;
}

export interface ParticipantApplicationProgressProjection {
  application_id: string;
  status: string;
  checks: ReadonlyArray<ApplicationProgressCheck>;
}

interface ApplicationCheckRecord {
  check_id: string;
  check_type: string;
  resolved_at?: string | null;
  required?: boolean;
  token_hash?: string;
  token_expires_at?: string;
  reviewer_id?: string;
}

interface ApplicationRecord {
  application_id: string;
  status: string;
}

export function toParticipantProgressProjection(input: {
  application: ApplicationRecord;
  checks: ReadonlyArray<ApplicationCheckRecord>;
}): ParticipantApplicationProgressProjection {
  const checks = input.checks.map((check) => {
    if (check.required === false) {
      return {
        check_id: check.check_id,
        check_type: check.check_type,
        state: 'not_required' as const,
      };
    }

    if (check.resolved_at != null) {
      return {
        check_id: check.check_id,
        check_type: check.check_type,
        state: 'completed' as const,
      };
    }

    return {
      check_id: check.check_id,
      check_type: check.check_type,
      state: 'pending' as const,
    };
  });

  return {
    application_id: input.application.application_id,
    status: input.application.status,
    checks,
  };
}
