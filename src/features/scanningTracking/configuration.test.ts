import { describe, expect, it } from 'vitest';
import { deriveTrackingSnapshot } from './configuration';

describe('BA16 tracking derivations', () => {
  it('derives on-site, off-site, never-scanned, and unknown off-site location groups', () => {
    const snapshot = deriveTrackingSnapshot({
      scanPoints: [
        {
          id: 'site-in',
          name: 'Main Gate',
          context_type: 'site',
          direction: 'in',
          resource_type: null,
          resource_id: null,
          is_active: true,
          event_id: 'event-1',
          organisation_id: 'org-1',
        },
        {
          id: 'site-out',
          name: 'Main Gate Exit',
          context_type: 'site',
          direction: 'out',
          resource_type: null,
          resource_id: null,
          is_active: true,
          event_id: 'event-1',
          organisation_id: 'org-1',
        },
        {
          id: 'activity-1',
          name: 'Archery Range',
          context_type: 'activity',
          direction: 'both',
          resource_type: null,
          resource_id: null,
          is_active: true,
          event_id: 'event-1',
          organisation_id: 'org-1',
        },
      ],
      approvedApplications: [
        {
          id: 'app-1',
          person_id: 'person-1',
          event_id: 'event-1',
          status: 'approved',
          core_person: { preferred_name: 'Ari', first_name: 'Ari', last_name: 'One' },
        },
        {
          id: 'app-2',
          person_id: 'person-2',
          event_id: 'event-1',
          status: 'approved',
          core_person: { preferred_name: null, first_name: 'Bee', last_name: 'Two' },
        },
        {
          id: 'app-3',
          person_id: 'person-3',
          event_id: 'event-1',
          status: 'approved',
          core_person: { preferred_name: null, first_name: 'Cee', last_name: 'Three' },
        },
        {
          id: 'app-4',
          person_id: 'person-4',
          event_id: 'event-1',
          status: 'approved',
          core_person: { preferred_name: null, first_name: 'Dee', last_name: 'Four' },
        },
        {
          id: 'app-5',
          person_id: 'person-5',
          event_id: 'event-1',
          status: 'approved',
          core_person: { preferred_name: null, first_name: 'Eee', last_name: 'Five' },
        },
      ],
      memberRows: [
        { id: 'member-1', person_id: 'person-1', organisation_id: 'org-1' },
        { id: 'member-2', person_id: 'person-2', organisation_id: 'org-1' },
        { id: 'member-3', person_id: 'person-3', organisation_id: 'org-1' },
        { id: 'member-4', person_id: 'person-4', organisation_id: 'org-1' },
        { id: 'member-5', person_id: 'person-5', organisation_id: 'org-1' },
      ],
      allEvents: [
        {
          id: 'event-1',
          scan_point_id: 'site-in',
          member_id: 'member-1',
          validation_result: 'accepted',
          validation_reason: null,
          scanned_at: '2026-05-01T10:00:00.000Z',
          device_id: null,
          override_by: null,
          notes: null,
        },
        {
          id: 'event-2',
          scan_point_id: 'site-out',
          member_id: 'member-2',
          validation_result: 'accepted',
          validation_reason: null,
          scanned_at: '2026-05-01T10:10:00.000Z',
          device_id: null,
          override_by: null,
          notes: null,
        },
        {
          id: 'event-3',
          scan_point_id: 'activity-1',
          member_id: 'member-2',
          validation_result: 'accepted',
          validation_reason: null,
          scanned_at: '2026-05-01T10:12:00.000Z',
          device_id: null,
          override_by: null,
          notes: null,
        },
        {
          id: 'event-4',
          scan_point_id: 'site-out',
          member_id: 'member-3',
          validation_result: 'accepted',
          validation_reason: null,
          scanned_at: '2026-05-01T10:13:00.000Z',
          device_id: null,
          override_by: null,
          notes: null,
        },
        {
          id: 'event-5',
          scan_point_id: 'site-in',
          member_id: 'member-4',
          validation_result: 'rejected',
          validation_reason: 'not_allowed',
          scanned_at: '2026-05-01T10:14:00.000Z',
          device_id: null,
          override_by: null,
          notes: null,
        },
      ],
      acceptedEvents: [
        {
          id: 'event-1',
          scan_point_id: 'site-in',
          member_id: 'member-1',
          validation_result: 'accepted',
          validation_reason: null,
          scanned_at: '2026-05-01T10:00:00.000Z',
          device_id: null,
          override_by: null,
          notes: null,
        },
        {
          id: 'event-2',
          scan_point_id: 'site-out',
          member_id: 'member-2',
          validation_result: 'accepted',
          validation_reason: null,
          scanned_at: '2026-05-01T10:10:00.000Z',
          device_id: null,
          override_by: null,
          notes: null,
        },
        {
          id: 'event-3',
          scan_point_id: 'activity-1',
          member_id: 'member-2',
          validation_result: 'accepted',
          validation_reason: null,
          scanned_at: '2026-05-01T10:12:00.000Z',
          device_id: null,
          override_by: null,
          notes: null,
        },
        {
          id: 'event-4',
          scan_point_id: 'site-out',
          member_id: 'member-3',
          validation_result: 'accepted',
          validation_reason: null,
          scanned_at: '2026-05-01T10:13:00.000Z',
          device_id: null,
          override_by: null,
          notes: null,
        },
      ],
    });

    expect(snapshot.onSiteCount).toBe(1);
    expect(snapshot.offSiteCount).toBe(2);
    expect(snapshot.neverScannedCount).toBe(1);

    expect(snapshot.onSiteGroups[0]?.label).toBe('Main Gate');
    expect(snapshot.onSiteGroups[0]?.count).toBe(1);

    expect(snapshot.offSiteGroups[0]?.label).toBe('Archery Range (Activity)');
    expect(snapshot.offSiteGroups[0]?.count).toBe(1);
    expect(snapshot.offSiteGroups[1]?.label).toBe('Unknown location');
    expect(snapshot.offSiteGroups[1]?.count).toBe(1);

    expect(snapshot.activityRows[0]?.name).toBe('Archery Range');
    expect(snapshot.activityRows[0]?.count).toBe(1);
    expect(snapshot.transportRows).toHaveLength(0);
  });
});
