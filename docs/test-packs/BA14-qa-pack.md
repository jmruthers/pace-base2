# BA14 QA Pack

## Slice metadata

- slice_id: BA14
- app: pace-base2
- requirement_path: docs/requirements/BA14-scanning-sync-reconciliation-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|---|
| S-01 | AC-01 | /scanning | User has required access and relevant test data exists for this scenario. | 1) Open `/scanning`. 2) Connectivity is restored (browser online event fires), and the queue entry's sync_status transitions to synced. 3) Observe the resulting UI/system response. | A card scanned offline by BA13 and written to ba13_scan_queue with sync_status = 'pending' is flushed to base_scan_event with id = local_id when connectivity is restored (browser online event fires), and the queue entry's sync_status transitions to synced. | Pass/Fail | - |
| S-02 | AC-02 | /scanning | User has required access and relevant test data exists for this scenario. | 1) Open `/scanning`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Re-uploading an already-uploaded entry (same local_id) does not create a duplicate base_scan_event row. The queue entry's sync_status transitions to synced and no INSERT error propagates to the user. | Pass/Fail | - |
| S-03 | AC-03 | /scanning | User has required access and relevant test data exists for this scenario. | 1) Open `/scanning`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Two devices scan the same card at the same scan point within the 300-second dedup window. The second-uploaded entry's base_scan_event row has validation_result = 'upload_conflict' after BA14's flush. The first-uploaded entry's validation_result is not modified. | Pass/Fail | - |
| S-04 | AC-04 | /scanning | User has required access and relevant test data exists for this scenario. | 1) Open `/scanning`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | A queue entry that fails INSERT is retried on the next online event and on each subsequent 30-second poll tick. No back-off delay is introduced and no maximum retry count is enforced. | Pass/Fail | - |
| S-05 | AC-05 | /scanning | User has required access and relevant test data exists for this scenario. | 1) Open `/scanning`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | The explicit retry action button is visible only to users with update:page.scanning. Users without the permission see no retry button in BA12's queue state surface. Background sync continues for all entries regardless of which user is on screen. | Pass/Fail | - |
| S-06 | AC-06 | /scanning | User has required access and relevant test data exists for this scenario. | 1) Open `/scanning`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | The synced_at timestamp on a base_scan_event row reflects the upload time (server DEFAULT now() at INSERT time), not the scanned_at timestamp that was recorded by BA13 at scan-decision time. The two values differ for offline scans. | Pass/Fail | - |
| S-07 | AC-07 | /scanning | User has required access and relevant test data exists for this scenario. | 1) Open `/scanning`. 2) Core_member_card has no row matching a queued entry's card_identifier at flush time, the entry is marked sync_status = 'failed', no INSERT is attempted, and a warning is logged. The entry is retried on the next sync cycle. 3) Observe the resulting UI/system response. | When core_member_card has no row matching a queued entry's card_identifier at flush time, the entry is marked sync_status = 'failed', no INSERT is attempted, and a warning is logged. The entry is retried on the next sync cycle. | Pass/Fail | - |
| S-08 | AC-08 | /scanning | User has required access and relevant test data exists for this scenario. | 1) Open `/scanning`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | BA14 does not write upload_conflict to base_scan_event.validation_reason. The validation_reason column carries the original BA13-decided rejection reason (e.g. booking_not_valid) or null, unchanged through the flush path and through the conflict UPDATE. | Pass/Fail | - |
| S-09 | AC-09 | /scanning | User has required access and relevant test data exists for this scenario. | 1) Open `/scanning`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Queue state badges in BA12 surfaces accurately reflect the sync_status distribution of all queue entries for the selected event after each sync cycle completes. A synced entry shows the "Uploaded" badge; a failed entry shows the "Upload failed" badge; a pending entry shows the "Pending upload" badge. | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
