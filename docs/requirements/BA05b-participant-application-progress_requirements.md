# BA05b Participant Application Progress

## Slice metadata

- Status: Planned
- Depends on: BA05a
- Backend impact: Read contract only
- Frontend impact: Both
- Safe for unattended execution: Backend-ready only
- Ownership notes:
  - Backend: Owns participant-safe read contracts and sensitive-field exclusion.
  - Frontend: Participant progress UI is pace-portal-owned and read-only.

## Filename convention

Feature requirement slices use numbered BASE prefixes (`BA##`) and a scope slug:

**`BA05b-participant-application-progress_requirements.md`**

## Overview

This slice owns the **workflow and read contracts** for the participant application-progress experience (read-only application state, participant-visible approval-check progress, safe status copy). **UI and routing** are **pace-portal** responsibilities (see [`PR00-portal-architecture.md`](../../portal/PR00-portal-architecture.md) and [`PR18-application-progress.md`](../../portal/PR18-application-progress.md)). The BASE app does **not** implement `/events/:eventCode/applications/:applicationId`.

## Current baseline behavior

The legacy app does not provide a trustworthy participant application-progress boundary.

- The legacy code does not clearly separate participant-visible progress from organiser/admin review state.
- There is no authoritative legacy contract for exposing approval-check progress without leaking internal token or privileged actor detail.

## Rebuild delta

### Summary

- What changes: Defines participant-safe application progress read contracts and status visibility boundaries.
- What stays: Route/UI remains in pace-portal; BASE does not host participant progress route.

Define the rebuild contract for participant application progress.

- Provide a participant-visible application-progress surface in **pace-portal**, outside the BASE admin app.
- Show the current application status and participant-visible pending or completed approval-check context.
- Keep organiser/admin navigation, organiser-only actions, privileged actor detail, and token internals out of the participant view.
- Preserve a clear participant-facing return path and lightweight navigation model consistent with the registration journey.

### pace-core2 delta

- `pace-core2` provides shared primitives for rendering, loading, and participant-surface interaction patterns.
- The participant progress surface is read-oriented, lives in **pace-portal**, and must not inherit BASE organiser shell assumptions.
- Do not assume legacy admin review models or helper imports are safe to expose on this route.

### pace-core2 imports

Use the following import families where implementation work in this slice requires shared primitives:

- `@solvera/pace-core/providers`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/components`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`
- `@solvera/pace-core/resilience`

### Data and schema references

- `base_application`
- `base_application_check`
- `base_registration_type`
- `base_consent`

Approved participant-progress interpretation:

- The page is participant-facing and read-only.
- The page exposes participant-visible check states only as `pending`, `completed`, or `not_required` labels, without revealing privileged reviewer identity or token internals.
- The page must not expose `base_application_check.token_hash`, token expiry, privileged actor identities, or organiser-only decision controls.
- Status language must remain aligned with the backend-owned application and approval-check contract.

## Acceptance criteria

- The application-progress **contract** is owned by this slice; the **route/UI** is owned by **pace-portal**.
- The participant can view current application status and participant-visible progress context.
- Organiser/admin navigation and organiser-only actions are not exposed.
- Approval-check progress remains understandable without leaking internal token or privileged actor detail.

## API / Contract

- Participant application-progress contract.
- Participant-facing application-status read contract.
- Participant-visible approval-check progress contract.
- Participant navigation and return-path contract.

Portal integration contract index for this slice:

- Route host: pace-portal `/:eventSlug/applications/:applicationId` (PR18).
- Required backend contracts: participant-safe read projection of application status plus participant-safe check-progress projection.
- Prohibited data in portal payloads: token hashes, token expiry values, privileged reviewer identities, and organiser-only action metadata.

## Visual specification

- Use **pace-portal** layout (not the BASE admin shell); BASE does not host this page.
- Keep the page calm and read-oriented: status first, progress context second, return action last.
- Use clear status blocks or timeline-style presentation only where it improves comprehension; do not mimic organiser review tooling.

## Verification

- Open an existing application on the **pace-portal** application-progress route `/:eventSlug/applications/:applicationId` and confirm the participant can see status and progress without organiser controls.
- Confirm participant-visible pending-check context is visible whenever at least one check for the application is still unresolved.
- Confirm organiser/admin navigation remains absent.
- Confirm sensitive token and privileged actor details are not exposed.

## Testing requirements

- Happy path: a participant can load their application-progress page and view current status and participant-visible check progress.
- Validation failure: invalid or unknown application identifiers fail safely without leaking internal detail.
- Auth/permission failure: an unauthorised or unrelated caller cannot load protected participant progress.
- Add coverage for pending-check rendering, completed-check rendering, and non-exposure of token/internal actor fields.

## Acceptance traceability

- Participant progress ownership criteria -> pace-portal route + participant-safe read contract implementation -> Route ownership and read-only behavior tests.
- Status/progress visibility criteria -> Participant-facing status and check-progress mapping -> Pending/completed progress rendering tests.
- Non-exposure criteria -> Sensitive token/internal actor exclusion contract -> Unauthorized and data-leak prevention tests.

## Manual QA pack requirements

- Scenarios: Execute verification flows for valid progress view, pending-check visibility, organizer-nav absence, and sensitive-data non-exposure.
- Expected outcomes: Participant sees only allowed status/progress data with no privileged controls or token internals.

## Build execution rules

- No schema, RPC, or RLS contract changes are permitted in this slice. If such a change is discovered, stop and add it to `docs/delivery/backend-delta-backlog.md` before continuing.
- Stop on blockers: unresolved participant-read permission boundaries, ambiguous status copy contracts, or missing portal route ownership alignment.

## Done criteria

- Tests pass: Participant progress, data exposure boundaries, and permission tests pass.
- QA passed: Manual QA evidence for verification scenarios is captured.
- Docs updated: BA05b stays aligned with portal and application workflow contracts.

## Do not

- Do not expose `base_application_check.token_hash`, token expiry, or organiser-only decision controls to participants.
- Do not implement this page on the **BASE** app origin; do not reuse organiser/admin shell or review UI for the participant view.
- Do not turn the participant progress page into an action surface for privileged review mutations.

## References

- [`./BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (demo app for pace-core, or in-app for consuming apps) as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this requirements doc.
