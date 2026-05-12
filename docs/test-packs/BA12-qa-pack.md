# BA12 QA Pack - Scanning Setup

## Scope

- Slice: BA12 scanning setup (`/scanning`)
- Route target:
  - `src/pages/scanning/ScanningSetupPage.tsx`
- Feature module targets:
  - `src/features/scanningSetup/types.ts`
  - `src/features/scanningSetup/shared.ts`
  - `src/features/scanningSetup/configuration.ts`

## Contract and UI verification checklist

- [x] `/scanning` heading, subtitle, and tracking-dashboard action render for permitted users.
- [x] No-event-selected blocking card renders and suppresses section surfaces.
- [x] Scan Points table columns render name/context/direction/resource/status/actions.
- [x] Direction badge mapping verified for `in`, `out`, `both`, and `neutral`.
- [x] Status badges verified for active/inactive plus always-on offline indicator.
- [x] Result badge mapping verified for `accepted`, `rejected`, and `upload_conflict`.
- [x] Permission-conditional rendering verified for create and update actions.
- [x] Conflict list contract restricted to `validation_result = 'upload_conflict'`.
- [x] History query contract ordered by `scanned_at` descending.
- [x] Manifest download contract verified for JSON shape (`card_identifier`, `person_id`, `name`).
- [x] Manifest empty-array download path verified (`[]` without error).

## Automated evidence

- Targeted BA12 + route coverage tests:
  - `npm run test -- src/features/scanningSetup/shared.test.ts src/features/scanningSetup/configuration.test.ts src/pages/scanning/ScanningSetupPage.test.tsx src/app.test.tsx` (39/39 passing)
- Full quality gate:
  - `npm run validate` (all checks passing; see audit artifacts generated during this run)

## Notes

- Supabase MCP verification confirms `base_scan_event` authenticated INSERT policy remains `with_check = false` in project `rkytnffgmwnnmewevqgp`.
- BA12 remains read-only over `base_scan_event`; no BA12 mutation path was added for that table.
