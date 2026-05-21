import type { TrackingDirection, TrackingScanPointRow } from './trackingTypes';

export interface TrackingParticipantSnapshot {
  memberId: string | null;
  personId: string;
  applicationId: string;
  displayName: string;
}

export interface PresenceParticipantRow {
  memberId: string | null;
  displayName: string;
  scannedAt: string | null;
}

export interface PresenceGroup {
  key: string;
  label: string;
  count: number;
  participants: PresenceParticipantRow[];
  unknownLocation?: boolean;
}

export interface PointSummaryRow {
  pointId: string;
  name: string;
  direction: TrackingDirection;
  count: number;
  participants: PresenceParticipantRow[];
}

export interface TrackingSnapshot {
  onSiteCount: number;
  offSiteCount: number;
  neverScannedCount: number;
  onSiteGroups: PresenceGroup[];
  offSiteGroups: PresenceGroup[];
  activityRows: PointSummaryRow[];
  transportRows: PointSummaryRow[];
  pointById: Record<string, TrackingScanPointRow>;
  participantByMemberId: Record<string, TrackingParticipantSnapshot>;
}
