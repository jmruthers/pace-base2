export const REGISTRATION_PRE_SUBMISSION_CHECK_OPTIONS = [
  { key: 'member_profile', label: 'Confirm member profile is current' },
  { key: 'medical_profile', label: 'Confirm medical profile is current' },
  { key: 'additional_contacts', label: 'Confirm emergency contacts are current' },
] as const;

export type RegistrationPreSubmissionCheckKey =
  (typeof REGISTRATION_PRE_SUBMISSION_CHECK_OPTIONS)[number]['key'];

export function parsePreSubmissionChecks(value: unknown): RegistrationPreSubmissionCheckKey[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const allowed = new Set<string>(REGISTRATION_PRE_SUBMISSION_CHECK_OPTIONS.map((o) => o.key));
  return value.filter(
    (entry): entry is RegistrationPreSubmissionCheckKey =>
      typeof entry === 'string' && allowed.has(entry)
  );
}

export function togglePreSubmissionCheck(
  current: RegistrationPreSubmissionCheckKey[],
  key: RegistrationPreSubmissionCheckKey,
  checked: boolean
): RegistrationPreSubmissionCheckKey[] {
  if (checked) {
    return current.includes(key) ? current : [...current, key];
  }
  return current.filter((entry) => entry !== key);
}
