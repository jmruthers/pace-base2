import type { KeyboardEvent } from 'react';
import { EventCard } from '@solvera/pace-core/components';
import {
  buildEventLogoStubReference,
  normalizeEventCardFields,
  readDirectEventLogoUrl,
} from '@solvera/pace-core/events';
import { useEventLogoReference } from '@solvera/pace-core/hooks';
import { useStorageCapableClient } from '@solvera/pace-core/rbac';
import type { EventStub } from '@solvera/pace-core/types';
import type { SupabaseClientLike } from '@solvera/pace-core/utils';

const EVENT_LOGO_BUCKET = 'public-files';

export interface BaseShellEventCardProps {
  event: EventStub;
  onSelect: (event: EventStub) => void;
  applications: number | null;
  forms: number | null;
  expectedParticipants: number | null;
  isLoading: boolean;
}

function handleTileKeyDown(
  keyboardEvent: KeyboardEvent<HTMLElement>,
  onSelect: (event: EventStub) => void,
  stub: EventStub
) {
  if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
    keyboardEvent.preventDefault();
    onSelect(stub);
  }
}

function BaseShellEventCardFoot({
  applications,
  forms,
  expectedParticipants,
  isLoading,
}: Pick<
  BaseShellEventCardProps,
  'applications' | 'forms' | 'expectedParticipants' | 'isLoading'
>) {
  if (isLoading) {
    return (
      <section className="grid grid-flow-col auto-cols-max items-center gap-3">
        <span>Loading counts…</span>
      </section>
    );
  }

  return (
    <section className="grid grid-flow-col auto-cols-max items-center gap-3">
      <span>
        <strong>{applications ?? 0}</strong> apps
      </span>
      <span>
        <strong>{forms ?? 0}</strong> forms
      </span>
      <span>
        <strong>{expectedParticipants ?? 0}</strong> expected
      </span>
    </section>
  );
}

export function BaseShellEventCard({
  event,
  onSelect,
  applications,
  forms,
  expectedParticipants,
  isLoading,
}: BaseShellEventCardProps) {
  const cardEvent = normalizeEventCardFields(event);
  const eventId = event.id ?? null;
  const directImageUrl = readDirectEventLogoUrl(event);
  const { data: logoRef } = useEventLogoReference(eventId);

  const stubFileReference =
    logoRef == null && directImageUrl == null
      ? buildEventLogoStubReference({ ...event, app_id: 'base' })
      : null;
  const fileReference = logoRef ?? stubFileReference;
  const storageClient = useStorageCapableClient() as SupabaseClientLike | null;

  if (cardEvent == null) {
    return null;
  }

  return (
    <section
      role="button"
      tabIndex={0}
      className="h-full w-full cursor-pointer"
      onClick={() => onSelect(event)}
      onKeyDown={(keyboardEvent) => handleTileKeyDown(keyboardEvent, onSelect, event)}
    >
      <EventCard
        className="h-full w-full"
        event={cardEvent}
        image={directImageUrl}
        fileReference={directImageUrl == null ? fileReference : null}
        supabase={storageClient}
        bucket={EVENT_LOGO_BUCKET}
        footer={
          <BaseShellEventCardFoot
            applications={applications}
            forms={forms}
            expectedParticipants={expectedParticipants}
            isLoading={isLoading}
          />
        }
      />
    </section>
  );
}
