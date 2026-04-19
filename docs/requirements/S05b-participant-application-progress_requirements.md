## Overview

This slice owns the **workflow and read contracts** for the participant application-progress experience (read-only application state, participant-visible approval-check progress, safe status copy). **UI and routing** are **pace-portal** responsibilities (see [`PR00-portal-architecture.md`](../../portal/PR00-portal-architecture.md) and [`PR18-application-progress.md`](../../portal/PR18-application-progress.md)). The BASE app does **not** implement `/events/:eventCode/applications/:applicationId`.

## Current legacy baseline

The legacy app does not provide a trustworthy participant application-progress boundary.

- The legacy code does not clearly separate participant-visible progress from organiser/admin review state.
- There is no authoritative legacy contract for exposing approval-check progress without leaking internal token or privileged actor detail.

## Rebuild target

Define the rebuild contract for participant application progress.

- Provide a participant-visible application-progress surface in **pace-portal**, outside the BASE admin app.
- Show the current application status and participant-visible pending or completed approval-check context.
- Keep organiser/admin navigation, organiser-only actions, privileged actor detail, and token internals out of the participant view.
- Preserve a clear participant-facing return path and lightweight navigation model consistent with the registration journey.

## pace-core2 delta

- `pace-core2` provides shared primitives for rendering, loading, and participant-surface interaction patterns.
- The participant progress surface is read-oriented, lives in **pace-portal**, and must not inherit BASE organiser shell assumptions.
- Do not assume legacy admin review models or helper imports are safe to expose on this route.

## pace-core2 imports

Use the following import families where implementation work in this slice requires shared primitives:

- `@solvera/pace-core/providers`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/components`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`
- `@solvera/pace-core/resilience`

## Data and schema references

- `base_application`
- `base_application_check`
- `base_registration_type`
- `base_consent`

Approved participant-progress interpretation:

- The page is participant-facing and read-only.
- The page may expose participant-visible pending or completed approval-check context.
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

## Visual specification

- Use **pace-portal** layout (not the BASE admin shell); BASE does not host this page.
- Keep the page calm and read-oriented: status first, progress context second, return action last.
- Use clear status blocks or timeline-style presentation only where it improves comprehension; do not mimic organiser review tooling.

## Verification

- Open an existing application on the **pace-portal** application-progress route `/:eventSlug/applications/:applicationId` and confirm the participant can see status and progress without organiser controls.
- Confirm participant-visible pending-check context is visible where appropriate.
- Confirm organiser/admin navigation remains absent.
- Confirm sensitive token and privileged actor details are not exposed.

## Testing requirements

- Happy path: a participant can load their application-progress page and view current status and participant-visible check progress.
- Validation failure: invalid or unknown application identifiers fail safely without leaking internal detail.
- Auth/permission failure: an unauthorised or unrelated caller cannot load protected participant progress.
- Add coverage for pending-check rendering, completed-check rendering, and non-exposure of token/internal actor fields.

## Open questions

None currently.

## Do not

- Do not expose `base_application_check.token_hash`, token expiry, or organiser-only decision controls to participants.
- Do not implement this page on the **BASE** app origin; do not reuse organiser/admin shell or review UI for the participant view.
- Do not turn the participant progress page into an action surface for privileged review mutations.

## References

- [`../project-brief.md`](../project-brief.md)
- [`../architecture.md`](../architecture.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)
