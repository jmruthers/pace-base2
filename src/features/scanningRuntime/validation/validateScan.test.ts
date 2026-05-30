// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createErrorResult, ok } from '@solvera/pace-core/types';
import { readManifestFromIdb } from '@/features/scanningSetup/manifestIdb';
import { hasRecentAcceptAtPoint } from '@/features/scanningRuntime/queue/scanQueueHelpers';
import { validateScan } from './validateScan';
import type { ScanPointRecord } from '../types';

vi.mock('@/features/scanningSetup/manifestIdb', () => ({
  readManifestFromIdb: vi.fn(),
}));

vi.mock('@/features/scanningRuntime/queue/scanQueueHelpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/scanningRuntime/queue/scanQueueHelpers')>();
  return {
    ...actual,
    hasRecentAcceptAtPoint: vi.fn(),
  };
});

const readManifest = vi.mocked(readManifestFromIdb);
const hasRecentAccept = vi.mocked(hasRecentAcceptAtPoint);

const baseScanPoint: ScanPointRecord = {
  id: 'sp1',
  name: 'Gate',
  context_type: 'site',
  direction: 'in',
  resource_type: null,
  resource_id: null,
  is_active: true,
  event_id: 'e1',
  organisation_id: 'o1',
};

function mockSupabase(handlers: Record<string, () => Promise<{ data: unknown; error: unknown }>>) {
  return {
    from: (table: string) => {
      const handler = handlers[table];
      const resolve = () => (handler != null ? handler() : Promise.resolve({ data: null, error: null }));
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => resolve(),
        limit: () => resolve(),
        maybeSingle: () => resolve(),
      };
      return chain;
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

describe('BA13 validateScan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasRecentAccept.mockResolvedValue(ok(false));
  });

  it('resolves site eligibility from manifest without network', async () => {
    readManifest.mockResolvedValue(
      ok([{ card_identifier: 'C1', person_id: 'p1', name: 'Alex Example' }])
    );

    const result = await validateScan({
      supabase: mockSupabase({}),
      scanPoint: baseScanPoint,
      eventId: 'e1',
      organisationId: 'o1',
      cardIdentifier: 'C1',
      scannedAt: 1,
      isOnline: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe('accepted');
      if (result.data.kind === 'accepted') {
        expect(result.data.participantName).toBe('Alex Example');
      }
    }
  });

  it('accepts online site scan when approved application exists', async () => {
    readManifest.mockResolvedValue(ok([]));
    const supabase = mockSupabase({
      core_member_card: async () => ({
        data: { person_id: 'p1', is_active: true },
        error: null,
      }),
      core_person: async () => ({
        data: { preferred_name: 'Sam Rivers', first_name: null, last_name: null },
        error: null,
      }),
      base_application: async () => ({ data: { id: 'app-1' }, error: null }),
    });

    const result = await validateScan({
      supabase,
      scanPoint: baseScanPoint,
      eventId: 'e1',
      organisationId: 'o1',
      cardIdentifier: 'LIVE-1',
      scannedAt: 2,
      isOnline: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.data.kind === 'accepted') {
      expect(result.data.participantName).toBe('Sam Rivers');
    }
  });

  it('rejects card not on manifest when offline', async () => {
    readManifest.mockResolvedValue(ok([]));

    const result = await validateScan({
      supabase: mockSupabase({}),
      scanPoint: baseScanPoint,
      eventId: 'e1',
      organisationId: 'o1',
      cardIdentifier: 'UNKNOWN',
      scannedAt: 3,
      isOnline: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe('rejected');
      if (result.data.kind === 'rejected') {
        expect(result.data.reason).toBe('card_not_recognised');
      }
    }
  });

  it('rejects inactive card from live lookup', async () => {
    readManifest.mockResolvedValue(ok([]));
    const supabase = mockSupabase({
      core_member_card: async () => ({
        data: { person_id: 'p1', is_active: false },
        error: null,
      }),
      core_person: async () => ({
        data: { preferred_name: 'Inactive User', first_name: null, last_name: null },
        error: null,
      }),
    });

    const result = await validateScan({
      supabase,
      scanPoint: baseScanPoint,
      eventId: 'e1',
      organisationId: 'o1',
      cardIdentifier: 'BAD-1',
      scannedAt: 4,
      isOnline: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.data.kind === 'rejected') {
      expect(result.data.reason).toBe('card_not_valid');
      expect(result.data.participantName).toBe('Inactive User');
    }
  });

  it('rejects duplicate scan within dedup window', async () => {
    readManifest.mockResolvedValue(
      ok([{ card_identifier: 'C1', person_id: 'p1', name: 'Alex Example' }])
    );
    hasRecentAccept.mockResolvedValue(ok(true));

    const result = await validateScan({
      supabase: mockSupabase({}),
      scanPoint: baseScanPoint,
      eventId: 'e1',
      organisationId: 'o1',
      cardIdentifier: 'C1',
      scannedAt: 5,
      isOnline: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.data.kind === 'rejected') {
      expect(result.data.reason).toBe('duplicate_scan');
    }
  });

  it('rejects registration_not_valid when person not in manifest and offline', async () => {
    readManifest.mockResolvedValue(
      ok([{ card_identifier: 'OTHER', person_id: 'p2', name: 'Other' }])
    );

    const result = await validateScan({
      supabase: mockSupabase({}),
      scanPoint: baseScanPoint,
      eventId: 'e1',
      organisationId: 'o1',
      cardIdentifier: 'C1',
      scannedAt: 6,
      isOnline: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.data.kind === 'rejected') {
      expect(result.data.reason).toBe('card_not_recognised');
    }
  });

  it('rejects activity scan without confirmed booking for person', async () => {
    readManifest.mockResolvedValue(
      ok([{ card_identifier: 'C1', person_id: 'p1', name: 'Alex Example' }])
    );
    const activityPoint: ScanPointRecord = {
      ...baseScanPoint,
      context_type: 'activity',
      resource_type: 'session',
      resource_id: 'session-1',
    };
    const supabase = mockSupabase({
      base_activity_booking: async () => ({
        data: [{ application_id: 'app-other' }],
        error: null,
      }),
      base_application: async () => ({
        data: [{ person_id: 'other-person' }],
        error: null,
      }),
    });

    const result = await validateScan({
      supabase,
      scanPoint: activityPoint,
      eventId: 'e1',
      organisationId: 'o1',
      cardIdentifier: 'C1',
      scannedAt: 7,
      isOnline: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.data.kind === 'rejected') {
      expect(result.data.reason).toBe('booking_not_valid');
    }
  });

  it('accepts activity scan when booking matches person', async () => {
    readManifest.mockResolvedValue(
      ok([{ card_identifier: 'C1', person_id: 'p1', name: 'Alex Example' }])
    );
    const activityPoint: ScanPointRecord = {
      ...baseScanPoint,
      context_type: 'activity',
      resource_type: 'session',
      resource_id: 'session-1',
    };
    const supabase = mockSupabase({
      base_activity_booking: async () => ({
        data: [{ application_id: 'app-1' }],
        error: null,
      }),
      base_application: async () => ({
        data: [{ person_id: 'p1' }],
        error: null,
      }),
    });

    const result = await validateScan({
      supabase,
      scanPoint: activityPoint,
      eventId: 'e1',
      organisationId: 'o1',
      cardIdentifier: 'C1',
      scannedAt: 8,
      isOnline: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe('accepted');
    }
  });

  it('accepts transport scan when itinerary assignment exists', async () => {
    readManifest.mockResolvedValue(
      ok([{ card_identifier: 'C1', person_id: 'p1', name: 'Alex Example' }])
    );
    const transportPoint: ScanPointRecord = {
      ...baseScanPoint,
      context_type: 'transport',
      resource_type: 'leg',
      resource_id: 'leg-1',
    };
    const supabase = mockSupabase({
      trac_itinerary_assignment: async () => ({
        data: { id: 'assign-1' },
        error: null,
      }),
    });

    const result = await validateScan({
      supabase,
      scanPoint: transportPoint,
      eventId: 'e1',
      organisationId: 'o1',
      cardIdentifier: 'C1',
      scannedAt: 9,
      isOnline: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe('accepted');
    }
  });

  it('returns manifest read error when IDB fails', async () => {
    readManifest.mockResolvedValue(createErrorResult('manifest_error', 'Manifest unavailable', undefined));

    const result = await validateScan({
      supabase: mockSupabase({}),
      scanPoint: baseScanPoint,
      eventId: 'e1',
      organisationId: 'o1',
      cardIdentifier: 'C1',
      scannedAt: 10,
      isOnline: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Manifest unavailable');
    }
  });
});
