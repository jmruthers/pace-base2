# BA15 - Reporting - QA pack

Manual verification aligned with `docs/requirements/BA15-reporting-requirements.md` Section 12 and Section 13.

## Prerequisites

- Authenticated organiser account with `reports.read`.
- Optional second account for template visibility checks.
- Event selected with BA18 seed data covering participants, units, activities, and scans.

## Access and empty states

1. Open `/reports` as a user without `reports.read`.
   - Expected: access denied renders; reporting surface is not visible.
2. Open `/reports` as a user with `reports.read` and no selected event.
   - Expected: message `Select an event to run reports`; `ReportBuilder` does not render.
3. Open `/reports` as a user with `reports.read` and selected event.
   - Expected: reporting builder renders with Participants explore selected.

## Report composition and execution

4. Select 3 to 5 participant fields and run a report.
   - Expected: results table renders using selected labels as headers.
5. Add a filter (`contains`) and run again.
   - Expected: result set narrows to matching rows.
6. Add a sort and run again.
   - Expected: row order reflects sort direction.
7. Switch explore (Participants to Units).
   - Expected: selected fields, filters, sorts, and results are cleared.
8. Trigger execution error (for example invalid query shape or timeout condition).
   - Expected: destructive execution error appears; partial rows are not shown.

## Template lifecycle

9. Enter template name and save.
   - Expected: template row appears for current event.
10. Load the saved template.
   - Expected: explore and selection state restore; report does not auto-run.
11. Edit and save the template again.
   - Expected: updated values persist.
12. Delete owned template.
   - Expected: template row is removed.
13. Verify private visibility.
   - Expected: second user cannot see private template.
14. Switch template to event-shared and re-check with second user.
   - Expected: second user sees template and can load it.

## Targeted automated verification

```bash
npm run test -- \
  src/pages/reports/ReportsPage.test.tsx \
  src/features/reporting/configuration.test.ts \
  src/app.test.tsx
```

## Full quality gate

```bash
npm run validate
```

## Notes

- Shared reporting mismatches previously tracked for BA15 are now closed; see `docs/delivery/BA15-reporting-gap-report.md`.
- Latest automated run evidence:
  - `npm run test -- src/pages/reports/ReportsPage.test.tsx src/features/reporting/configuration.test.ts src/app.test.tsx` (36/36 passing)
  - `npm run validate` (all 6 checks passed; reports in `audit/202605142013-*` and `audit/202605142014-pace-core-audit.md`)
