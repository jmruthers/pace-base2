import type { Dispatch, SetStateAction } from 'react';
import { Badge, Button } from '@solvera/pace-core/components';
import { formatDateTime } from '@solvera/pace-core/utils';
import type { PointSummaryRow, PresenceGroup } from '@/features/scanningTracking/trackingPresenceTypes';
import { trackingDirectionBadgeLabel } from '@/pages/scanning/scanningTrackingHelpers';

export function TrackingExpandableGroupList({
  groups,
  expandedIds,
  setExpandedIds,
}: {
  groups: PresenceGroup[];
  expandedIds: Record<string, boolean>;
  setExpandedIds: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <ul className="grid gap-2">
      {groups.map((group) => {
        const expanded = expandedIds[group.key] === true;
        const participantListId = `${group.key}-participants`;
        return (
          <li key={group.key} className="rounded-md border border-border">
            <section className="grid gap-2 p-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setExpandedIds((state) => ({
                    ...state,
                    [group.key]: !expanded,
                  }))
                }
                aria-expanded={expanded}
                aria-controls={participantListId}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.label} — ${group.count} participants`}
              >
                {group.unknownLocation ? (
                  <small>
                    {group.label} — {group.count}
                  </small>
                ) : (
                  <span>
                    {group.label} — {group.count}
                  </span>
                )}
              </Button>
              {expanded ? (
                <ul id={participantListId} className="grid gap-1">
                  {group.participants.map((participant) => (
                    <li key={`${group.key}:${participant.memberId ?? participant.displayName}`}>
                      <section className="grid grid-cols-[1fr_auto] gap-2">
                        <span>{participant.displayName}</span>
                        <small>{participant.scannedAt != null ? formatDateTime(participant.scannedAt) : '—'}</small>
                      </section>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </li>
        );
      })}
    </ul>
  );
}

export function TrackingExpandablePointRows({
  rows,
  emptyCopy,
  expandedIds,
  setExpandedIds,
}: {
  rows: PointSummaryRow[];
  emptyCopy: string;
  expandedIds: Record<string, boolean>;
  setExpandedIds: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
  if (rows.length === 0) {
    return <small>{emptyCopy}</small>;
  }
  return (
    <ul className="grid gap-2">
      {rows.map((row) => {
        const expanded = expandedIds[row.pointId] === true;
        const participantListId = `${row.pointId}-participants`;
        return (
          <li key={row.pointId} className="rounded-md border border-border">
            <section className="grid gap-2 p-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setExpandedIds((state) => ({
                    ...state,
                    [row.pointId]: !expanded,
                  }))
                }
                aria-expanded={expanded}
                aria-controls={participantListId}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${row.name} — ${row.count} participants`}
              >
                <section className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <span>{row.name}</span>
                  <Badge variant="solid-sec-muted">{trackingDirectionBadgeLabel(row.direction)}</Badge>
                  <span>{row.count}</span>
                </section>
              </Button>
              {expanded ? (
                <ul id={participantListId} className="grid gap-1">
                  {row.participants.length === 0 ? (
                    <li>
                      <small>No accepted scans at this scan point.</small>
                    </li>
                  ) : (
                    row.participants.map((participant) => (
                      <li key={`${row.pointId}:${participant.memberId ?? participant.displayName}`}>
                        <section className="grid grid-cols-[1fr_auto] gap-2">
                          <span>{participant.displayName}</span>
                          <small>{participant.scannedAt != null ? formatDateTime(participant.scannedAt) : '—'}</small>
                        </section>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </section>
          </li>
        );
      })}
    </ul>
  );
}
