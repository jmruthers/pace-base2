import { describe, expect, it, vi } from 'vitest';
import {
  resolveEntrypointSelection,
  submitRegistrationApplication,
} from './registrationSubmission';

describe('BA05a registration submission workflow contracts', () => {
  it('resolves fixed and open entrypoint bindings', () => {
    const fixedResolution = resolveEntrypointSelection({
      eventSlug: 'camp',
      formSlug: 'primary',
      availableBindings: [{ registration_type_id: 'type-1', registration_type_name: 'Leader' }],
    });
    expect(fixedResolution.mode).toBe('fixed');
    expect(fixedResolution.allowedRegistrationTypeIds).toEqual(['type-1']);

    const openResolution = resolveEntrypointSelection({
      eventSlug: 'camp',
      formSlug: 'primary',
      availableBindings: [
        { registration_type_id: 'type-1', registration_type_name: 'Leader' },
        { registration_type_id: 'type-2', registration_type_name: 'Participant' },
      ],
    });
    expect(openResolution.mode).toBe('open');
    expect(openResolution.allowedRegistrationTypeIds).toEqual(['type-1', 'type-2']);
  });

  it('returns approved when backend contract auto-approves submission', async () => {
    const rpcMock = vi.fn(async (name: string) => {
      if (name === 'data_event_applicant_org_allowed') {
        return { data: { allowed: true }, error: null };
      }
      return {
        data: { application_id: 'app-1', status: 'approved' },
        error: null,
      };
    });

    const result = await submitRegistrationApplication(
      { rpc: rpcMock },
      {
        eventId: 'event-1',
        personId: 'person-1',
        registrationTypeId: 'type-1',
        formId: 'form-1',
        responseValues: { guardian_email: 'test@example.com' },
      }
    );

    expect(result).toEqual({ status: 'approved', applicationId: 'app-1' });
  });

  it('returns under_review with first check when backend requires approval chain', async () => {
    const rpcMock = vi.fn(async (name: string) => {
      if (name === 'data_event_applicant_org_allowed') {
        return { data: { allowed: true }, error: null };
      }
      return {
        data: { application_id: 'app-2', status: 'under_review', first_check_id: 'check-1' },
        error: null,
      };
    });

    const result = await submitRegistrationApplication(
      { rpc: rpcMock },
      {
        eventId: 'event-1',
        personId: 'person-1',
        registrationTypeId: 'type-1',
        formId: 'form-1',
        responseValues: { referee_email: 'ref@example.com' },
      }
    );

    expect(result).toEqual({
      status: 'under_review',
      applicationId: 'app-2',
      firstCheckId: 'check-1',
    });
  });

  it('surfaces scope-denied rejection from scope check contract', async () => {
    const rpcMock = vi.fn(async () => ({
      data: null,
      error: { message: 'scope denied' },
    }));

    const result = await submitRegistrationApplication(
      { rpc: rpcMock },
      {
        eventId: 'event-1',
        personId: 'person-1',
        registrationTypeId: 'type-1',
        formId: 'form-1',
        responseValues: {},
      }
    );

    expect(result).toEqual({ status: 'rejected', reason: 'scope_denied' });
  });
});
