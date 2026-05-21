export type UnitsAuthUserLike = { id?: string | null } | null | undefined;

export function requireActorUserId(user: UnitsAuthUserLike): string {
  const actorUserId = user?.id ?? null;
  if (actorUserId == null || actorUserId.trim().length === 0) {
    throw new Error('Authenticated user is required for this action.');
  }
  return actorUserId;
}

export function withCreatedAndUpdatedBy<T extends Record<string, unknown>>(
  payload: T,
  actorUserId: string
): T & { created_by: string; updated_by: string } {
  return {
    ...payload,
    created_by: actorUserId,
    updated_by: actorUserId,
  };
}

export function withUpdatedBy<T extends Record<string, unknown>>(
  payload: T,
  actorUserId: string
): T & { updated_by: string } {
  return {
    ...payload,
    updated_by: actorUserId,
  };
}

export function buildSubmitPreferencesRpcArgs(payload: {
  unitId: string;
  eventId: string;
}): { p_unit_id: string; p_event_id: string } {
  return {
    p_unit_id: payload.unitId,
    p_event_id: payload.eventId,
  };
}
