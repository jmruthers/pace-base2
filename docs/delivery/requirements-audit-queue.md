# BASE requirements audit queue (pass 1)

Pass 1 updates **requirement slices only** so layout matches the functional prototype. Do **not** change `src/` in this pass. Pass 2 (implementation) is deferred.

**Orchestration rule:** `.cursor/rules/base-requirements-audit-pass1.mdc`

## How to kick off

Open the **pace-base2** workspace (with **pace-prototype** and **pace-core2** siblings available for `@` references).

In **Plan** or **Agent** mode, send:

```text
Continue BASE requirements pass 1 from docs/delivery/requirements-audit-queue.md
```

Optional modifiers: `— one slice only` · `— dry run` · `— from BA06`

## Status values

| Value | Meaning |
|-------|---------|
| `Pending` | Not yet audited |
| `In progress` | Agent is working this slice |
| `Done` | Requirement slice updated for prototype layout |
| `N/A` | No BASE layout surface (contracts-only or portal-owned UI) |

## Queue

Process in **`audit_order`** sequence.

| audit_order | slice_id | requirement_doc | prototype_refs | impl_hints | audit_status |
|---:|---|---|---|---|---|
| 1 | BA00 | [BA00-app-shell-and-access-requirements.md](../requirements/BA00-app-shell-and-access-requirements.md) | `pace-prototype/apps/pace-base/app.jsx` (shell, routing, auth, nav) | `src/App.tsx`, `AuthenticatedShell.tsx` | Done |
| 2 | BA01 | [BA01-event-workspace-and-configuration-requirements.md](../requirements/BA01-event-workspace-and-configuration-requirements.md) | `pages/LandingPage.jsx` (`ShellLandingPage`, `EventDashboardPage`), `pages/NewEventPage.jsx`, `pages/QuickEventPage.jsx` | event configuration pages | Done |
| 3 | BA02 | [BA02-shared-forms-platform-contracts-requirements.md](../requirements/BA02-shared-forms-platform-contracts-requirements.md) | Layout N/A — shared forms contracts | `src/features/formsAuthoring/` | N/A |
| 4 | BA03 | [BA03-forms-authoring-and-base-integration-requirements.md](../requirements/BA03-forms-authoring-and-base-integration-requirements.md) | `pages/FormsRegTypesPage.jsx` (`FormsListPage`, `FormBuilderPage`) | `src/pages/forms/` | Done |
| 5 | BA04 | [BA04-registration-setup-and-policy-requirements.md](../requirements/BA04-registration-setup-and-policy-requirements.md) | `pages/FormsRegTypesPage.jsx` (`RegistrationTypesPage`, `RegistrationTypeBuilderPage`) | registration types pages | Done |
| 6 | BA06 | [BA06-applications-admin-and-review-requirements.md](../requirements/BA06-applications-admin-and-review-requirements.md) | `pages/ApplicationsPage.jsx` (board + detail) | `src/pages/applications/` | Done |
| 7 | BA07 | [BA07-token-approval-actions-requirements.md](../requirements/BA07-token-approval-actions-requirements.md) | `pace-prototype/apps/pace-base/app.jsx` (`TokenApprovalPage` via `_pace-core`) | public token approval route | Done |
| 8 | BA17 | [BA17-communications-and-system-notifications-requirements.md](../requirements/BA17-communications-and-system-notifications-requirements.md) | `pages/CommsReportsPage.jsx` (`CommunicationsPage`) | communications composer | Done |
| 9 | BA15 | [BA15-reporting-requirements.md](../requirements/BA15-reporting-requirements.md) | `pages/CommsReportsPage.jsx` (`ReportsPage`) | `src/pages/reports/` | Done |
| 10 | BA08 | [BA08-units-and-group-coordination-requirements.md](../requirements/BA08-units-and-group-coordination-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (`UnitsPage`; `/unit-preferences` if in prod only) | `src/pages/units/` | Done |
| 11 | BA09 | [BA09-activity-offering-setup-requirements.md](../requirements/BA09-activity-offering-setup-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (`ActivitiesPage`) | activities setup pages | Done |
| 12 | BA11 | [BA11-booking-operations-oversight-requirements.md](../requirements/BA11-booking-operations-oversight-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (`BookingsPage`) | bookings oversight | Done |
| 13 | BA12 | [BA12-scanning-setup-requirements.md](../requirements/BA12-scanning-setup-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (`ScanningPage`) | scanning setup | Done |
| 14 | BA13 | [BA13-scanning-runtime-validation-requirements.md](../requirements/BA13-scanning-runtime-validation-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (`ScanRuntimePage`) | scan runtime | Done |
| 15 | BA14 | [BA14-scanning-sync-reconciliation-requirements.md](../requirements/BA14-scanning-sync-reconciliation-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (scanning surfaces — sync UX may extend setup/runtime) | scanning sync | Done |
| 16 | BA16 | [BA16-scanning-tracking-dashboard-requirements.md](../requirements/BA16-scanning-tracking-dashboard-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (scanning/tracking — align with prototype scan list patterns) | tracking dashboard | Done |
| 17 | BA05a | [BA05a-registration-entry-and-application-submission-requirements.md](../requirements/BA05a-registration-entry-and-application-submission-requirements.md) | `pace-prototype/apps/pace-portal/` (`FormPage`, event application routes) — participant UI owned by portal | pace-portal form fill | Done |
| 18 | BA05b | [BA05b-participant-application-progress-requirements.md](../requirements/BA05b-participant-application-progress-requirements.md) | `pace-prototype/apps/pace-portal/pages/EventParticipantPages.jsx` (`ApplicationProgressPage`) | portal progress page | Done |
| 19 | BA10 | [BA10-participant-booking-experience-requirements.md](../requirements/BA10-participant-booking-experience-requirements.md) | `pace-prototype/apps/pace-portal/pages/EventParticipantPages.jsx` (`ActivityBookingPage`) | portal activity booking | Done |

## Prototype kit index

Route map and screen list: `pace-prototype/apps/pace-base/app.jsx` (header comment) and `pace-prototype/apps/pace-base/README.md`.

Shared shell: `pace-prototype/apps/_pace-core/`.

## Pass 2

Implementation uplift against updated requirements: [requirements-build-queue.md](./requirements-build-queue.md). Orchestration rule: `.cursor/rules/base-requirements-build-pass2.mdc`.

Kickoff (Agent mode):

```text
Continue BASE requirements pass 2 from docs/delivery/requirements-build-queue.md
```

Historical Evidence remains in [base-build-queue.md](./base-build-queue.md). Do not flip pass 2 rows during pass 1.
