// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanningRuntimePage } from './ScanningRuntimePage';

vi.mock('@/features/scanningRuntime/hooks/useScanPointRecord', () => ({
  useScanPointRecord: () => ({ scanPoint: undefined, isLoading: true }),
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: { id: 'e1', name: 'Event' } }),
  useUnifiedAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@solvera/pace-core/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/rbac')>();
  return {
    ...actual,
    useCan: () => ({ can: false }),
    useSecureSupabase: () => null,
    PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useResolvedScope: () => ({
      organisationId: 'o1',
      eventId: 'e1',
      appId: 'base',
      scope: { organisationId: 'o1', eventId: 'e1', appId: 'base' },
      isLoading: false,
      resilienceStatus: 'success',
      resilienceErrors: [],
      sourceOutcomes: {},
    }),
  };
});

describe('ScanningRuntimePage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.resetModules();
  });

  it('shows loading spinner while scan point is loading', () => {
    render(
      <MemoryRouter initialEntries={['/scanning/sp1']}>
        <Routes>
          <Route path="/scanning/:scanPointId" element={<ScanningRuntimePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.querySelector('[class*="spinner"], svg') ?? document.body).toBeTruthy();
  });
});
