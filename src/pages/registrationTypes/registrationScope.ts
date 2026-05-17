export function registrationScope(scope: {
  organisationId: string | null;
  eventId: string | null;
  appId: string | null;
}) {
  return {
    organisationId: scope.organisationId,
    eventId: scope.eventId ?? null,
    appId: scope.appId ?? undefined,
  };
}
