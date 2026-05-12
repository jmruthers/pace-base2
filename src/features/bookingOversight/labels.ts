export function bookingSourceLabel(source: string | null | undefined): string {
  if (source === 'self') return 'Self';
  if (source === 'admin_assigned') return 'Admin assigned';
  return source ?? '';
}
