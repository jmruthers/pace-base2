// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { setupUser } from '@/test-utils';
import type { EventStub } from '@solvera/pace-core/types';
import * as rbac from '@solvera/pace-core/rbac';
import { BaseShellEventCard } from './BaseShellEventCard';

const logoQueryState = vi.hoisted(() => ({
  data: null as null,
}));
const useEventLogoReferenceMock = vi.hoisted(() => vi.fn());

vi.mock('@solvera/pace-core/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/hooks')>();
  return {
    ...actual,
    useEventLogoReference: (eventId: string | null) => {
      useEventLogoReferenceMock(eventId);
      return { data: logoQueryState.data };
    },
  };
});

function createEvent(overrides: Partial<EventStub> = {}): EventStub {
  return {
    id: 'evt-1',
    organisation_id: 'org-1',
    event_name: 'Summer Camp',
    event_date: '2026-07-10',
    event_days: 3,
    event_venue: 'Lake Site',
    event_code: 'summer',
    expected_participants: 120,
    ...overrides,
  } as EventStub;
}

const defaultCounts = {
  applications: 4,
  forms: 2,
  expectedParticipants: 120,
  isLoading: false,
};

describe('BaseShellEventCard', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(rbac, 'useStorageCapableClient').mockReturnValue({} as never);
    useEventLogoReferenceMock.mockReset();
    logoQueryState.data = null;
  });

  it('maps event fields to EventCard and handles tile click', async () => {
    const user = setupUser();
    const onSelect = vi.fn();

    render(
      <BaseShellEventCard event={createEvent()} onSelect={onSelect} {...defaultCounts} />
    );

    expect(screen.getByRole('heading', { name: 'Summer Camp', level: 5 })).toBeInTheDocument();
    expect(screen.getByText('Lake Site')).toBeInTheDocument();
    expect(screen.getByText('apps')).toBeInTheDocument();
    expect(screen.getByText('forms')).toBeInTheDocument();
    expect(screen.getByText('expected')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /summer camp/i })[0]!);
    expect(onSelect).toHaveBeenCalledWith(createEvent());
  });

  it('prefers logo_id file reference from useEventLogoReference', () => {
    logoQueryState.data = {
      id: 'file-1',
      file_path: 'org-1/event_logos/logo.png',
      file_metadata: { category: 'event_logos' },
      is_public: true,
    } as never;
    vi.spyOn(rbac, 'useStorageCapableClient').mockReturnValue({
      storage: {
        from: () => ({
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://cdn.example/${path}` },
          }),
        }),
      },
    } as never);

    render(
      <BaseShellEventCard event={createEvent()} onSelect={vi.fn()} {...defaultCounts} />
    );

    expect(useEventLogoReferenceMock).toHaveBeenCalledWith('evt-1');
  });

  it('uses direct logo URL on the tile image', () => {
    const event = createEvent({
      event_logo: 'https://cdn.example/org-1/event_logo/logo.png',
    });

    render(
      <BaseShellEventCard event={event} onSelect={vi.fn()} {...defaultCounts} />
    );

    const tile = screen.getAllByRole('button', { name: /summer camp/i })[0]!;
    expect(tile.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example/org-1/event_logo/logo.png'
    );
  });

  it('shows em dash for location when venue is blank', () => {
    const event = createEvent({
      id: 'evt-2',
      event_name: 'Indoor Event',
      event_date: '2026-08-01',
      event_days: 1,
      event_venue: undefined,
    });

    render(
      <BaseShellEventCard event={event} onSelect={vi.fn()} {...defaultCounts} />
    );

    expect(screen.queryByText('Lake Site')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows loading counts in footer when isLoading is true', () => {
    render(
      <BaseShellEventCard
        event={createEvent()}
        onSelect={vi.fn()}
        applications={null}
        forms={null}
        expectedParticipants={null}
        isLoading
      />
    );

    expect(screen.getByText('Loading counts…')).toBeInTheDocument();
  });
});
