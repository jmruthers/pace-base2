// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@solvera/pace-core/types';
import { readManifestFromIdb } from '@/features/scanningSetup/manifestIdb';
import { validateScan } from './validateScan';

vi.mock('@/features/scanningSetup/manifestIdb', () => ({
  readManifestFromIdb: vi.fn(),
}));

const readManifest = vi.mocked(readManifestFromIdb);

function mockSupabase(partial: Record<string, unknown>) {
  return partial as unknown as import('@supabase/supabase-js').SupabaseClient;
}

describe('validateScan offline manifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves site eligibility from manifest without network', async () => {
    readManifest.mockResolvedValue(
      ok([{ card_identifier: 'C1', person_id: 'p1', name: 'Alex Example' }])
    );

    const scanPoint = {
      id: 'sp1',
      name: 'Gate',
      context_type: 'site' as const,
      direction: 'in',
      resource_type: null,
      resource_id: null,
      is_active: true,
      event_id: 'e1',
      organisation_id: 'o1',
    };

    const result = await validateScan({
      supabase: mockSupabase({}),
      scanPoint,
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
});
