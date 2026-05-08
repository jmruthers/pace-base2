import type { EventParticipantsPoolFilters } from '@solvera/pace-core/comms';
import type { MultiSelectOption } from '@solvera/pace-core/components';

export const COMMUNICATION_STATUS_OPTIONS: MultiSelectOption[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export const BASE_SYSTEM_KEYS = {
  GUARDIAN_REQUEST_ISSUED: 'base.guardian_request_issued',
  GUARDIAN_REQUEST_REISSUED: 'base.guardian_request_reissued',
  REFEREE_REQUEST_ISSUED: 'base.referee_request_issued',
  REFEREE_REQUEST_REISSUED: 'base.referee_request_reissued',
  APPLICATION_APPROVED: 'base.application_approved',
  APPLICATION_REJECTED: 'base.application_rejected',
} as const;

export type BaseSystemKey = (typeof BASE_SYSTEM_KEYS)[keyof typeof BASE_SYSTEM_KEYS];

export type CommunicationStatusFilter = NonNullable<EventParticipantsPoolFilters['status']>[number];
