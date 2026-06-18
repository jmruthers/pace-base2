import type { ActivityOfferingRow } from './types';

export interface OfferingUtilization {
  totalCapacity: number;
  totalBooked: number;
}

export function getOfferingUtilization(offering: ActivityOfferingRow): OfferingUtilization {
  const sessions = offering.sessions ?? [];
  let totalCapacity = 0;
  let totalBooked = 0;

  for (const session of sessions) {
    if (typeof session.capacity === 'number' && session.capacity > 0) {
      totalCapacity += session.capacity;
    }
    const bookingCount = session.bookings?.[0]?.count;
    if (typeof bookingCount === 'number' && bookingCount > 0) {
      totalBooked += bookingCount;
    }
  }

  return { totalCapacity, totalBooked };
}

export function offeringUtilizationPercent(offering: ActivityOfferingRow): number | null {
  const { totalCapacity, totalBooked } = getOfferingUtilization(offering);
  if (totalCapacity <= 0) {
    return null;
  }
  return Math.min(100, Math.round((totalBooked / totalCapacity) * 100));
}
