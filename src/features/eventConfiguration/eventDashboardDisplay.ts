import { computeEventEndDate } from './shared';

export function formatEventDateRange(
  startDate: string | null | undefined,
  eventDays: number | null | undefined,
  formatDateFn: (value: string) => string
): string {
  if (startDate == null) {
    return 'No date set';
  }

  const endDate = computeEventEndDate(startDate, eventDays);
  const startLabel = formatDateFn(startDate);
  if (endDate == null || (eventDays ?? 1) <= 1) {
    return startLabel;
  }

  return `${startLabel} – ${formatDateFn(endDate.toISOString())}`;
}
