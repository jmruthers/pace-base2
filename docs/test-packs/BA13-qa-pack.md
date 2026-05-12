# BA13 QA Pack — Scanning Runtime and Validation

## Scope

- Slice: BA13 scanning runtime (`/scanning/:scanPointId`)
- Route and page:
  - [`src/App.tsx`](../../src/App.tsx) (runtime route outside `AuthenticatedShell`)
  - [`src/pages/scanning/ScanningRuntimePage.tsx`](../../src/pages/scanning/ScanningRuntimePage.tsx)
- Feature modules:
  - [`src/features/scanningRuntime/queue/scanQueueIdb.ts`](../../src/features/scanningRuntime/queue/scanQueueIdb.ts)
  - [`src/features/scanningRuntime/validation/validateScan.ts`](../../src/features/scanningRuntime/validation/validateScan.ts)
  - [`src/features/scanningRuntime/hooks/useScanPointRecord.ts`](../../src/features/scanningRuntime/hooks/useScanPointRecord.ts)
  - [`src/features/scanningRuntime/hooks/useManualParticipantSearch.ts`](../../src/features/scanningRuntime/hooks/useManualParticipantSearch.ts)
  - [`src/features/scanningSetup/manifestIdb.ts`](../../src/features/scanningSetup/manifestIdb.ts) (BA12 manifest read path)

## Contract and UI verification checklist

- [ ] `/scanning/:scanPointId` renders **without** sidebar / `PaceAppLayout`; "Back to scanning setup" navigates to `/scanning`.
- [ ] Top bar shows scan point name, `useEvents().selectedEvent.name`, and direction badge (`Badge variant="solid-sec-muted"`).
- [ ] `PagePermissionGuard` denies access without `read:page.scanning` (`AccessDenied`).
- [ ] Null Supabase client: centred `LoadingSpinner`; scan point loading: spinner **without** top bar (RT-LS-01).
- [ ] Scan point not found / inactive: destructive `Alert` copy matches requirements; no scan `Input`.
- [ ] Primary scan `Input` accepts HID Enter; validation spinner after ≥50ms; result panel idle hidden; 3s auto-clear on accepted / override-accepted.
- [ ] Rejected: Dismiss re-enables input; Override only for BR-OV-01 classes **and** `update:page.scanning`.
- [ ] IndexedDB failure: destructive toast exact copy; no outcome panel; input re-enabled.
- [ ] Manual search: ≥2 chars, 200ms debounce, limit 20; manual queue row `card_identifier = null`, `validation_result = accepted_override`.
- [ ] Queue: `ba13_scan_queue` / `scan_events`; `sync_status = pending` from BA13 writes; `device_id` from `sessionStorage` `ba13_device_id`.

## Automated evidence

- Targeted tests:

  ```bash
  npm run test -- \
    src/features/scanningRuntime/queue/scanQueueIdb.test.ts \
    src/features/scanningRuntime/validation/validateScan.test.ts \
    src/features/scanningRuntime/manualScan.test.ts \
    src/pages/scanning/ScanningRuntimePage.test.tsx \
    src/app.test.tsx
  ```

- Full quality gate:

  ```bash
  npm run validate
  ```

## Notes

- **Activity / transport offline:** BA12 manifests use shared `ManifestRow` (card/person/name). MVP rejection behaviour for offline activity/transport is documented in [`docs/requirements/BA13-scanning-runtime-validation-requirements.md`](../requirements/BA13-scanning-runtime-validation-requirements.md) §11 (activity context, offline).
- **§12 / §15 manual verification** (seed scan points, IndexedDB inspection in browser, multi-context where unblocked) remains operator-led beyond automated tests.
