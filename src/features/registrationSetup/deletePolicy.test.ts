import { describe, expect, it } from 'vitest';
import { buildDeleteBlockedMessageForRegistrationType, isRegistrationTypeDeleteBlocked } from './deletePolicy';

describe('isRegistrationTypeDeleteBlocked', () => {
  it('returns true when applications or form bindings exist', () => {
    expect(isRegistrationTypeDeleteBlocked({ applicationCount: 1, formBindingCount: 0 })).toBe(true);
    expect(isRegistrationTypeDeleteBlocked({ applicationCount: 0, formBindingCount: 1 })).toBe(true);
    expect(isRegistrationTypeDeleteBlocked({ applicationCount: 0, formBindingCount: 0 })).toBe(false);
  });
});

describe('buildDeleteBlockedMessageForRegistrationType', () => {
  it('combines application and form binding reasons', () => {
    expect(
      buildDeleteBlockedMessageForRegistrationType({
        typeName: 'Youth',
        applicationCount: 2,
        formBindingCount: 1,
      })
    ).toBe(
      "'Youth' cannot be deleted because it has 2 applications and 1 form binding. Remove these first before deleting."
    );
  });

  it('uses a single reason when only applications block', () => {
    expect(
      buildDeleteBlockedMessageForRegistrationType({
        typeName: 'Adult',
        applicationCount: 1,
        formBindingCount: 0,
      })
    ).toBe(
      "'Adult' cannot be deleted because it has 1 application. Remove these first before deleting."
    );
  });
});
