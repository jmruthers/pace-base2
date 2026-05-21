import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResult } from '@solvera/pace-core/types';
import { createErrorResult, isOk, ok } from '@solvera/pace-core/types';
import { resolveWithFallback } from '@solvera/pace-core/resilience';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import { readManifestFromIdb } from '@/features/scanningSetup/manifestIdb';
import type { ManifestContextType, ManifestRow } from '@/features/scanningSetup/scanEventTypes';
import type { ScanPointRecord, ScanRuntimeResult } from '../types';
import { DEDUP_WINDOW_MS, hasRecentAcceptAtPoint } from '../queue/scanQueueHelpers';

export interface ValidateScanInput {
  supabase: SupabaseClient;
  scanPoint: ScanPointRecord;
  eventId: string;
  organisationId: string;
  cardIdentifier: string;
  scannedAt: number;
  isOnline: boolean;
}

function derivePersonNameFromManifest(row: ManifestRow): string {
  return row.name.trim().length > 0 ? row.name : 'Participant';
}

async function loadPersonNameLive(
  supabase: SupabaseClient,
  personId: string
): Promise<ApiResult<string | null>> {
  const { data, error } = await supabase
    .from('core_person')
    .select('id, preferred_name, first_name, last_name')
    .eq('id', personId)
    .maybeSingle();
  if (error != null) {
    return ok(null);
  }
  const row = data as {
    preferred_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  if (row == null) {
    return ok(null);
  }
  const preferred =
    typeof row.preferred_name === 'string' && row.preferred_name.trim().length > 0
      ? row.preferred_name
      : null;
  if (preferred != null) {
    return ok(preferred);
  }
  const first = typeof row.first_name === 'string' ? row.first_name : '';
  const last = typeof row.last_name === 'string' ? row.last_name : '';
  const full = `${first} ${last}`.trim();
  return ok(full.length > 0 ? full : null);
}

async function resolveCardAndPerson(
  input: ValidateScanInput,
  manifestRows: ManifestRow[] | null
): Promise<
  | { ok: true; personId: string; displayName: string }
  | { ok: false; reason: 'card_not_recognised' }
  | { ok: false; reason: 'card_not_valid'; displayName: string }
  | { ok: false; reason: 'eligibility_read_error'; message: string }
> {
  const manifestMatch =
    manifestRows?.find((row) => row.card_identifier === input.cardIdentifier) ?? null;

  const fallbackSources = [
    {
      key: 'manifest',
      resolve: async (): Promise<{ personId: string; displayName: string; active: boolean } | null> => {
        if (manifestMatch == null) {
          return null;
        }
        return {
          personId: manifestMatch.person_id,
          displayName: derivePersonNameFromManifest(manifestMatch),
          active: true,
        };
      },
      isSuccess: (v: { personId: string; displayName: string; active: boolean } | null | undefined) =>
        v != null,
    },
    {
      key: 'live_card',
      resolve: async (): Promise<{ personId: string; displayName: string; active: boolean } | null> => {
        if (!input.isOnline) {
          return null;
        }
        const { data, error } = await input.supabase
          .from('core_member_card')
          .select('card_identifier, is_active, person_id')
          .eq('card_identifier', input.cardIdentifier)
          .maybeSingle();
        if (error != null) {
          throw error;
        }
        const row = data as {
          person_id?: string;
          is_active?: boolean;
        } | null;
        if (row?.person_id == null) {
          return null;
        }
        const nameResult = await loadPersonNameLive(input.supabase, row.person_id);
        const displayName = (isOk(nameResult) ? nameResult.data : null) ?? 'Participant';
        return {
          personId: row.person_id,
          displayName,
          active: row.is_active === true,
        };
      },
      isSuccess: (v: { personId: string; displayName: string; active: boolean } | null | undefined) =>
        v != null,
    },
  ];

  try {
    const resolution = await resolveWithFallback(fallbackSources);
    const cardData = resolution.data as { personId: string; displayName: string; active: boolean } | null;
    if (cardData == null) {
      return { ok: false, reason: 'card_not_recognised' };
    }
    if (!cardData.active) {
      return { ok: false, reason: 'card_not_valid', displayName: cardData.displayName };
    }
    return { ok: true, personId: cardData.personId, displayName: cardData.displayName };
  } catch (error: unknown) {
    return {
      ok: false,
      reason: 'eligibility_read_error',
      message: NormalizeSupabaseError(error).message,
    };
  }
}

async function checkSiteMealEligibility(
  input: ValidateScanInput,
  personId: string,
  manifestRows: ManifestRow[] | null
): Promise<
  | { ok: true }
  | { ok: false; reason: 'registration_not_valid' }
  | { ok: false; reason: 'eligibility_read_error'; message: string }
> {
  if (manifestRows != null) {
    const inManifest = manifestRows.some((row) => row.person_id === personId);
    if (inManifest) {
      return { ok: true };
    }
    if (!input.isOnline) {
      return { ok: false, reason: 'registration_not_valid' };
    }
  }

  if (!input.isOnline) {
    return { ok: false, reason: 'registration_not_valid' };
  }

  const { data, error } = await input.supabase
    .from('base_application')
    .select('id')
    .eq('person_id', personId)
    .eq('event_id', input.eventId)
    .eq('organisation_id', input.organisationId)
    .eq('status', 'approved')
    .maybeSingle();

  if (error != null) {
    return { ok: false, reason: 'eligibility_read_error', message: NormalizeSupabaseError(error).message };
  }
  if (data == null) {
    return { ok: false, reason: 'registration_not_valid' };
  }
  return { ok: true };
}

async function checkActivityEligibility(
  input: ValidateScanInput,
  personId: string
): Promise<
  | { ok: true }
  | { ok: false; reason: 'booking_not_valid' }
  | { ok: false; reason: 'eligibility_read_error'; message: string }
> {
  const sessionId = input.scanPoint.resource_id;
  if (sessionId == null) {
    return { ok: false, reason: 'booking_not_valid' };
  }

  if (!input.isOnline) {
    return { ok: false, reason: 'booking_not_valid' };
  }

  const { data, error } = await input.supabase
    .from('base_activity_booking')
    .select('id, application_id, session_id, status')
    .eq('event_id', input.eventId)
    .eq('session_id', sessionId)
    .eq('status', 'confirmed')
    .limit(20);

  if (error != null) {
    return { ok: false, reason: 'eligibility_read_error', message: NormalizeSupabaseError(error).message };
  }

  const rows = (data as Array<{ application_id?: string }> | null) ?? [];
  if (rows.length === 0) {
    return { ok: false, reason: 'booking_not_valid' };
  }

  const applicationIds = rows.map((r) => r.application_id).filter((id): id is string => typeof id === 'string');
  const { data: apps, error: appError } = await input.supabase
    .from('base_application')
    .select('id, person_id')
    .in('id', applicationIds);

  if (appError != null) {
    return { ok: false, reason: 'eligibility_read_error', message: NormalizeSupabaseError(appError).message };
  }

  const appRows = (apps as Array<{ person_id?: string }> | null) ?? [];
  const match = appRows.some((a) => a.person_id === personId);
  if (!match) {
    return { ok: false, reason: 'booking_not_valid' };
  }
  return { ok: true };
}

async function checkTransportEligibility(
  input: ValidateScanInput,
  personId: string
): Promise<
  | { ok: true }
  | { ok: false; reason: 'booking_not_valid' }
  | { ok: false; reason: 'eligibility_read_error'; message: string }
> {
  if (!input.isOnline) {
    return { ok: false, reason: 'booking_not_valid' };
  }

  const legId = input.scanPoint.resource_id;
  const query = input.supabase.from('trac_itinerary_assignment').select('id, person_id');
  const { data, error } =
    legId != null
      ? await query.eq('person_id', personId).eq('resource_id', legId).maybeSingle()
      : await query.eq('person_id', personId).maybeSingle();

  if (error != null) {
    return { ok: false, reason: 'eligibility_read_error', message: NormalizeSupabaseError(error).message };
  }
  if (data == null) {
    return { ok: false, reason: 'booking_not_valid' };
  }
  return { ok: true };
}

export async function validateScan(input: ValidateScanInput): Promise<ApiResult<ScanRuntimeResult>> {
  const manifestType = input.scanPoint.context_type as ManifestContextType;
  const manifestResult = await readManifestFromIdb(input.eventId, manifestType);
  if (!isOk(manifestResult)) {
    return createErrorResult(
      manifestResult.error.code,
      manifestResult.error.message,
      manifestResult.error.details
    );
  }
  const manifestRows = manifestResult.data;

  const card = await resolveCardAndPerson(input, manifestRows);
  if (!card.ok) {
    if (card.reason === 'eligibility_read_error') {
      return ok({
        kind: 'eligibility_read_error',
        message: card.message,
        scannedAt: input.scannedAt,
        cardIdentifier: input.cardIdentifier,
      });
    }
    if (card.reason === 'card_not_recognised') {
      return ok({
        kind: 'rejected',
        participantName: null,
        reason: 'card_not_recognised',
        scannedAt: input.scannedAt,
        cardIdentifier: input.cardIdentifier,
      });
    }
    if (card.reason === 'card_not_valid') {
      return ok({
        kind: 'rejected',
        participantName: card.displayName,
        reason: 'card_not_valid',
        scannedAt: input.scannedAt,
        cardIdentifier: input.cardIdentifier,
      });
    }
    return ok({
      kind: 'eligibility_read_error',
      message: 'Unexpected card resolution state.',
      scannedAt: input.scannedAt,
      cardIdentifier: input.cardIdentifier,
    });
  }

  const { personId, displayName } = card;

  let eligibility:
    | { ok: true }
    | { ok: false; reason: 'registration_not_valid' | 'booking_not_valid' }
    | { ok: false; reason: 'eligibility_read_error'; message: string };

  const ctx = input.scanPoint.context_type;
  if (ctx === 'site' || ctx === 'meal') {
    eligibility = await checkSiteMealEligibility(input, personId, manifestRows);
  } else if (ctx === 'activity') {
    eligibility = await checkActivityEligibility(input, personId);
  } else if (ctx === 'transport') {
    eligibility = await checkTransportEligibility(input, personId);
  } else {
    eligibility = { ok: false, reason: 'registration_not_valid' };
  }

  if (!eligibility.ok) {
    if ('message' in eligibility) {
      return ok({
        kind: 'eligibility_read_error',
        message: eligibility.message,
        scannedAt: input.scannedAt,
        cardIdentifier: input.cardIdentifier,
      });
    }
    return ok({
      kind: 'rejected',
      participantName: displayName,
      reason: eligibility.reason,
      scannedAt: input.scannedAt,
      cardIdentifier: input.cardIdentifier,
    });
  }

  const dupResult = await hasRecentAcceptAtPoint(
    input.scanPoint.id,
    input.cardIdentifier,
    input.scannedAt,
    DEDUP_WINDOW_MS
  );
  if (!isOk(dupResult)) {
    return createErrorResult(dupResult.error.code, dupResult.error.message, dupResult.error.details);
  }
  if (dupResult.data) {
    return ok({
      kind: 'rejected',
      participantName: displayName,
      reason: 'duplicate_scan',
      scannedAt: input.scannedAt,
      cardIdentifier: input.cardIdentifier,
    });
  }

  return ok({
    kind: 'accepted',
    participantName: displayName,
    scannedAt: input.scannedAt,
    cardIdentifier: input.cardIdentifier,
  });
}
