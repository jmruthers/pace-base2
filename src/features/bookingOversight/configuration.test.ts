// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  createActivityBookingRpc,
  loadApprovedApplicationsForBookings,
  loadBookingsForEvent,
  postAppBaseActivityBookingCancel,
} from './bookingQueries';

interface CallRecord {
  table: string;
  eqs: Array<{ column: string; value: unknown }>;
  orders: Array<{ column: string; ascending?: boolean }>;
}

function createMockSupabaseForFrom(responses: Array<{ data: unknown; error: unknown }>) {
  const calls: CallRecord[] = [];
  let responseIndex = 0;

  const supabase = {
    from(table: string) {
      const call: CallRecord = {
        table,
        eqs: [],
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
        order(column: string, options?: { ascending?: boolean }) {
          call.orders.push({ column, ascending: options?.ascending });
          return chain;
        },
        then(onFulfilled: (value: { data: unknown; error: unknown }) => unknown) {
          const response = responses[responseIndex] ?? { data: null, error: null };
          responseIndex += 1;
          return Promise.resolve(onFulfilled(response));
        },
      };

      return chain;
    },
    rpc: vi.fn(),
  };

  return { supabase, calls };
}

describe('BA11 booking oversight configuration', () => {
  it('scopes booking list query to event_id', async () => {
    const { supabase, calls } = createMockSupabaseForFrom([
      {
        data: [],
        error: null,
      },
    ]);

    const result = await loadBookingsForEvent(
      supabase as unknown as Parameters<typeof loadBookingsForEvent>[0],
      'event-xyz'
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(calls[0]?.table).toBe('base_activity_booking');
    expect(calls[0]?.eqs).toEqual(expect.arrayContaining([{ column: 'event_id', value: 'event-xyz' }]));
    expect(calls[0]?.orders[0]).toEqual({ column: 'booked_at', ascending: false });
  });

  it('filters approved-applications query to approved status', async () => {
    const { supabase, calls } = createMockSupabaseForFrom([
      {
        data: [],
        error: null,
      },
    ]);

    const result = await loadApprovedApplicationsForBookings(
      supabase as unknown as Parameters<typeof loadApprovedApplicationsForBookings>[0],
      'event-xyz'
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(calls[0]?.table).toBe('base_application');
    expect(calls[0]?.eqs).toEqual(
      expect.arrayContaining([
        { column: 'event_id', value: 'event-xyz' },
        { column: 'status', value: 'approved' },
      ])
    );
  });

  it('calls create RPC with documented keys and no client override_at', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
      rpc,
    };

    const result = await createActivityBookingRpc(
      supabase as unknown as Parameters<typeof createActivityBookingRpc>[0],
      {
        p_event_id: 'e1',
        p_application_id: 'a1',
        p_session_id: 's1',
        p_organisation_id: 'o1',
        p_source: 'admin_assigned',
        p_promote_from_waitlist: true,
        p_override_capacity: false,
        p_override_window: false,
        p_override_conflict: false,
        p_override_reason: null,
        p_override_by: null,
      }
    );

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      'app_base_activity_booking_create',
      expect.objectContaining({
        p_promote_from_waitlist: true,
        p_source: 'admin_assigned',
      })
    );
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty('p_override_at');
  });

  it('calls cancel RPC with v1 null override fields', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = { from: vi.fn(), rpc };

    const result = await postAppBaseActivityBookingCancel(
      supabase as unknown as Parameters<typeof postAppBaseActivityBookingCancel>[0],
      {
        p_booking_id: 'b1',
        p_cancelled_by: 'u1',
        p_source: 'admin',
        p_reason: null,
        p_override_reason: null,
        p_override_by: null,
        p_override_at: null,
      }
    );

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      'app_base_activity_booking_cancel',
      expect.objectContaining({
        p_source: 'admin',
        p_cancelled_by: 'u1',
        p_booking_id: 'b1',
      })
    );
  });
});
