# BA14 QA Pack - Scanning Sync and Reconciliation

## Scope

- Slice: BA14 background sync worker and reconciliation behavior (no standalone route)
- Runtime integration:
  - [`src/App.tsx`](../../src/App.tsx) (worker bootstrap inside authenticated runtime)
  - [`src/features/scanningRuntime/sync/scanSyncWorker.ts`](../../src/features/scanningRuntime/sync/scanSyncWorker.ts)
- Queue APIs:
  - [`src/features/scanningRuntime/queue/scanQueueIdb.ts`](../../src/features/scanningRuntime/queue/scanQueueIdb.ts)
- BA12/BA13 host surfaces:
  - [`src/pages/scanning/ScanningSetupPage.tsx`](../../src/pages/scanning/ScanningSetupPage.tsx)
  - [`src/pages/scanning/ScanningRuntimePage.tsx`](../../src/pages/scanning/ScanningRuntimePage.tsx)
  - [`src/features/scanningSetup/shared.ts`](../../src/features/scanningSetup/shared.ts)

## Contract and UI verification checklist

- [ ] Worker startup resets stale queue entries from `syncing` to `pending` before flush cycles.
- [ ] Worker attaches `online` listener and 30-second poll; automatic flush cycles include `pending` plus retryable `failed` entries, while `failed` rows with `failure_reason = manual_scan_no_card` are excluded.
- [ ] Per-entry state transitions follow `pending|failed -> syncing -> synced|failed` and do not block sibling entries on failure.
- [ ] Manual entries (`card_identifier = null`) are marked failed with local `manual_scan_no_card` reason and never uploaded.
- [ ] Edge function requests target `/functions/v1/base-scan-sync` with auth header; browser code never performs direct `base_scan_event` writes.
- [ ] Successful uploads show synced state and success toast (`X scan events uploaded`) when count is non-zero.
- [ ] Failed uploads show destructive toast with retry guidance; explicit retry keeps manual no-card failures as failed and communicates the reason.
- [ ] Conflict responses surface warning semantics with exact wording `Upload conflict detected — check the conflict log.` and preserve queue `sync_status = synced` (conflict lives in `validation_result` on server row).
- [ ] BA12 queue badges match BA14 vocabulary: `Pending upload`, `Uploading...` (pulse), `Uploaded`, `Upload failed`; `Upload conflict` from history/conflict data.
- [ ] Explicit retry controls render per failed queue entry (not bulk), include entry-specific `aria-label`, and only render for users with `update:page.scanning`; background worker runs regardless of update permission.

## Automated evidence

- Targeted tests:

  ```bash
  npm run test -- \
    src/features/scanningRuntime/queue/scanQueueIdb.test.ts \
    src/features/scanningRuntime/sync/scanSyncWorker.test.ts \
    src/features/scanningSetup/shared.test.ts \
    src/pages/scanning/ScanningSetupPage.test.tsx \
    src/pages/scanning/ScanningRuntimePage.test.tsx \
    src/app.test.tsx
  ```

- Full quality gate:

  ```bash
  npm run validate
  ```

## Notes

- End-to-end upload validation depends on deployed Supabase `base-scan-sync` and BA14 prerequisites for RLS posture in requirements.
- Manual reconciliation checks for upload conflicts in production data remain operator-led after automated pass.
