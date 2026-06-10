import type { ApplicationQueueRow } from '@/features/applicationsAdmin/types';

export type ApplicationTableRow = ApplicationQueueRow &
  Record<string, unknown> & {
    applicantLabel: string;
    applicantEmail: string;
    registrationTypeLabel: string;
    submittedLabel: string;
  };
