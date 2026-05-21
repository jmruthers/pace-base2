// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  loadConflictsForEvent,
  loadHistoryForEvent,
  loadScanPointsForEvent,
} from './configuration';
import { downloadManifestJson } from './scanningManifestApi';

interface MockResponse {
  data: unknown;
  error: unknown;
  count?: number | null;
}

interface CallRecord {
  table: string;
  eqs: Array<{ column: string; value: unknown }>;
  ins: Array<{ column: string; values: unknown[] }>;
  orders: Array<{ column: string; ascending?: boolean }>;
}

function createMockSupabase(responses: MockResponse[]) {
  const calls: CallRecord[] = [];
  let responseIndex = 0;

  const supabase = {
    from(table: string) {
      const call: CallRecord = {
        table,
        eqs: [],
        ins: [],
        orders: [],
      };
      calls.push(call);

      const chain = {
        select() {
          return chain;
        },
        eq(column: string, value: unknown) {
          call.eqs.push({ column, value });
          return chain;
        },
        in(column: string, values: unknown[]) {
          call.ins.push({ column, values });
          return chain;
        },
        order(column: string, options?: { ascending?: boolean }) {
          call.orders.push({ column, ascending: options?.ascending });
          return chain;
        },
        update() {
          return chain;
        },
        insert() {
          return chain;
        },
        maybeSingle() {
          const response = responses[responseIndex] ?? { data: null, error: null };
          responseIndex += 1;
          return Promise.resolve({ data: response.data, error: response.error });
        },
        then(onFulfilled: (value: { data: unknown; error: unknown; count?: number | null }) => unknown) {
          const response = responses[responseIndex] ?? { data: null, error: null };
          responseIndex += 1;
          return Promise.resolve(onFulfilled(response));
        },
      };

      return chain;
    },
  };

  return { supabase, calls };
}

describe('BA12 configuration contracts', () => {
  it('scopes scan-point query to selected event and organisation', async () => {
    const { supabase, calls } = createMockSupabase([
      {
        data: [
          {
            id: 'point-1',
            name: 'Main Gate',
            event_id: 'event-1',
            organisation_id: 'org-1',
            context_type: 'site',
            direction: 'in',
            resource_type: null,
            resource_id: null,
            is_active: true,
            created_at: null,
            updated_at: null,
            created_by: null,
          },
        ],
        error: null,
      },
    ]);

    const rows = await loadScanPointsForEvent(
      supabase as unknown as Parameters<typeof loadScanPointsForEvent>[0],
      'event-1',
      'org-1'
    );

    expect(rows).toHaveLength(1);
    expect(calls[0].table).toBe('base_scan_point');
    expect(calls[0].eqs).toEqual(
      expect.arrayContaining([
        { column: 'event_id', value: 'event-1' },
        { column: 'organisation_id', value: 'org-1' },
      ])
    );
  });

  it('filters conflicts to upload_conflict only', async () => {
    const { supabase, calls } = createMockSupabase([
      {
        data: [
          {
            id: 'point-1',
            name: 'Gate',
            event_id: 'event-1',
            organisation_id: 'org-1',
            context_type: 'site',
            direction: 'in',
            resource_type: null,
            resource_id: null,
            is_active: true,
            created_at: null,
            updated_at: null,
            created_by: null,
          },
        ],
        error: null,
      },
      {
        data: [
          {
            id: 'conflict-1',
            scan_point_id: 'point-1',
            scan_card_id: 'card-1',
            validation_result: 'upload_conflict',
            validation_reason: 'duplicate',
            scanned_at: '2026-05-01T10:00:00.000Z',
            synced_at: '2026-05-01T10:05:00.000Z',
            notes: null,
            override_by: null,
            application_id: null,
          },
        ],
        error: null,
      },
      {
        data: [{ id: 'card-1', card_identifier: 'CARD-001' }],
        error: null,
      },
    ]);

    const result = await loadConflictsForEvent(
      supabase as unknown as Parameters<typeof loadConflictsForEvent>[0],
      'event-1',
      'org-1'
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const rows = result.data;

    expect(rows[0].validation_result).toBe('upload_conflict');
    expect(calls[1].table).toBe('base_scan_event');
    expect(calls[1].eqs).toEqual(expect.arrayContaining([{ column: 'validation_result', value: 'upload_conflict' }]));
  });

  it('orders history query by scanned_at descending', async () => {
    const { supabase, calls } = createMockSupabase([
      {
        data: [
          {
            id: 'point-1',
            name: 'Gate',
            event_id: 'event-1',
            organisation_id: 'org-1',
            context_type: 'site',
            direction: 'in',
            resource_type: null,
            resource_id: null,
            is_active: true,
            created_at: null,
            updated_at: null,
            created_by: null,
          },
        ],
        error: null,
      },
      {
        data: [
          {
            id: 'event-1',
            scan_point_id: 'point-1',
            scan_card_id: 'card-1',
            validation_result: 'accepted',
            validation_reason: null,
            scanned_at: '2026-05-01T10:00:00.000Z',
            synced_at: '2026-05-01T10:05:00.000Z',
            notes: null,
            override_by: null,
            application_id: 'application-1',
          },
        ],
        error: null,
      },
      {
        data: [{ id: 'card-1', card_identifier: 'CARD-001' }],
        error: null,
      },
      {
        data: [{ id: 'application-1', person_id: 'person-1' }],
        error: null,
      },
      {
        data: [{ id: 'person-1', preferred_name: 'Sam', first_name: 'Samuel', last_name: 'Example' }],
        error: null,
      },
    ]);

    const result = await loadHistoryForEvent(
      supabase as unknown as Parameters<typeof loadHistoryForEvent>[0],
      'event-1',
      'org-1'
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const rows = result.data;

    expect(rows).toHaveLength(1);
    expect(calls[1].orders).toEqual(expect.arrayContaining([{ column: 'scanned_at', ascending: false }]));
  });

  it('downloads manifest with required json shape', async () => {
    const previousCreate = (URL as unknown as { createObjectURL?: (blob: Blob) => string }).createObjectURL;
    const previousRevoke = (URL as unknown as { revokeObjectURL?: (url: string) => void }).revokeObjectURL;
    const createUrlSpy = vi.fn((blob: Blob) => {
      void blob;
      return 'blob:manifest';
    });
    const revokeSpy = vi.fn();
    (URL as unknown as { createObjectURL: (blob: Blob) => string }).createObjectURL = createUrlSpy;
    (URL as unknown as { revokeObjectURL: (url: string) => void }).revokeObjectURL = revokeSpy;
    const clickSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    downloadManifestJson(
      [
        {
          card_identifier: 'CARD-001',
          person_id: 'person-1',
          name: 'Sam Example',
        },
      ],
      'site',
      'event-1'
    );

    const blob = (createUrlSpy.mock.calls[0]?.[0] ?? new Blob([])) as unknown as Blob;
    expect(blob).toBeInstanceOf(Blob);
    const payload = JSON.parse(await blob.text()) as Array<Record<string, string>>;
    expect(payload[0]).toEqual({
      card_identifier: 'CARD-001',
      person_id: 'person-1',
      name: 'Sam Example',
    });
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:manifest');

    if (previousCreate != null) {
      (URL as unknown as { createObjectURL: (blob: Blob) => string }).createObjectURL = previousCreate;
    }
    if (previousRevoke != null) {
      (URL as unknown as { revokeObjectURL: (url: string) => void }).revokeObjectURL = previousRevoke;
    }
    createElementSpy.mockRestore();
  });

  it('downloads empty-array manifest payload without throwing', async () => {
    const previousCreate = (URL as unknown as { createObjectURL?: (blob: Blob) => string }).createObjectURL;
    const previousRevoke = (URL as unknown as { revokeObjectURL?: (url: string) => void }).revokeObjectURL;
    const createUrlSpy = vi.fn((blob: Blob) => {
      void blob;
      return 'blob:manifest';
    });
    const revokeSpy = vi.fn();
    (URL as unknown as { createObjectURL: (blob: Blob) => string }).createObjectURL = createUrlSpy;
    (URL as unknown as { revokeObjectURL: (url: string) => void }).revokeObjectURL = revokeSpy;
    const clickSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    expect(() => downloadManifestJson([], 'meal', 'event-1')).not.toThrow();
    const blob = (createUrlSpy.mock.calls[0]?.[0] ?? new Blob([])) as unknown as Blob;
    expect(await blob.text()).toBe('[]');
    expect(clickSpy).toHaveBeenCalledTimes(1);

    if (previousCreate != null) {
      (URL as unknown as { createObjectURL: (blob: Blob) => string }).createObjectURL = previousCreate;
    }
    if (previousRevoke != null) {
      (URL as unknown as { revokeObjectURL: (url: string) => void }).revokeObjectURL = previousRevoke;
    }
    createElementSpy.mockRestore();
  });
});
