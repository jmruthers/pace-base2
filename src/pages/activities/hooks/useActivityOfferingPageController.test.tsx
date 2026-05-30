// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useActivityOfferingPageController } from './useActivityOfferingPageController';

const toastSpy = vi.hoisted(() => vi.fn());
const updateOfferingMutate = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ offeringId: 'offering-1' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: { id: 'event-1', name: 'Camp One' } }),
  useUnifiedAuth: () => ({ selectedOrganisationId: 'org-1' }),
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
  useResolvedScope: () => ({
    organisationId: 'org-1',
    eventId: 'event-1',
    appId: 'base-app',
    isLoading: false,
  }),
}));

vi.mock('@/features/activityOfferingSetup/activityOfferingQueries', () => ({
  useOffering: () => ({
    data: {
      id: 'offering-1',
      name: 'Canoe',
      trac_activity_id: null,
      booking_open_at: null,
      booking_close_at: null,
      cost: null,
      payment_due_at: null,
      allow_waitlist: false,
      event_id: 'event-1',
      organisation_id: 'org-1',
      trac_activity: null,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(async () => undefined),
  }),
  useOfferingSessions: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useTracActivities: () => ({ data: [], isLoading: false, error: null }),
  useSessionBookingCount: () => ({ data: 0, isLoading: false }),
}));

vi.mock('@/features/activityOfferingSetup/activityOfferingMutations', () => ({
  useUpdateOfferingMutation: () => ({ mutateAsync: updateOfferingMutate, isPending: false }),
  useCreateSessionMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSessionMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteSessionMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/applicationsAdmin/queryHelpers', () => ({
  useRetryRefetchHandler: () => vi.fn(),
}));

vi.mock('@solvera/pace-core/utils', () => ({
  ShowSuccessMessage: (message: string, toast: (payload: { title: string }) => void) => {
    toast({ title: message });
  },
  HandleMutationError: vi.fn(),
  NormalizeSupabaseError: (error: unknown) => ({ message: String(error) }),
  formatDateTime: (value: string) => value,
}));

function renderControllerHook() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/activities/offering-1']}>
        <Routes>
          <Route path="/activities/:offeringId" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(() => useActivityOfferingPageController(), { wrapper });
}

describe('BA09 useActivityOfferingPageController', () => {
  beforeEach(() => {
    toastSpy.mockClear();
    updateOfferingMutate.mockClear();
  });

  it('blocks offering save when name validation fails', async () => {
    const { result } = renderControllerHook();

    await act(async () => {
      await result.current.onSaveOffering({
        name: '',
        trac_activity_id: null,
        booking_open_at: null,
        booking_close_at: null,
        cost: '',
        payment_due_at: null,
        allow_waitlist: false,
      });
    });

    expect(result.current.offeringErrors.name).toBe('Offering name is required.');
    expect(updateOfferingMutate).not.toHaveBeenCalled();
  });

  it('saves offering and shows success toast when validation passes', async () => {
    const { result } = renderControllerHook();

    await act(async () => {
      await result.current.onSaveOffering({
        name: 'Canoe',
        trac_activity_id: null,
        booking_open_at: null,
        booking_close_at: null,
        cost: '',
        payment_due_at: null,
        allow_waitlist: false,
      });
    });

    expect(updateOfferingMutate).toHaveBeenCalledWith({
      offeringId: 'offering-1',
      values: expect.objectContaining({ name: 'Canoe' }),
    });
    expect(toastSpy).toHaveBeenCalledWith({ title: 'Offering saved' });
  });

  it('blocks session create when capacity validation fails', async () => {
    const { result } = renderControllerHook();

    await act(async () => {
      await result.current.onCreateSession({
        session_name: 'Morning',
        start_time: '2026-05-01T09:00:00.000Z',
        end_time: '2026-05-01T10:00:00.000Z',
        location_display_name: '',
        capacity: '0',
      });
    });

    expect(result.current.sessionErrors.capacity).toBe('Capacity must be a positive whole number.');
  });
});
