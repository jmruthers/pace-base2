# pace-base2

PACE Base consuming app for event workspace, registration, scanning, and related admin surfaces.

## Validation

```bash
npm run validate
```

Runs, in order:

1. `lint:no-disable` — fails if any `eslint-disable` comment exists under `src/`
2. `lint:export-limit` — fails when feature `configuration.ts` modules exceed 10 named exports; warns on watch-list modules at 9+
3. pace-core validate — type-check, lint (`--max-warnings 0`), build, tests, audit

## Code quality guardrails

Do not silence ESLint in source files. Fix the underlying issue instead.

### Feature configuration modules

Keep `src/features/*/configuration.ts` at **10 or fewer** named exports. Before adding an export to a module at 9+, split queries, mutations, or helpers into a sibling file (see `bookingQueries.ts`, `activityOfferingMutations.ts`).

Watch-list modules: `formsAuthoring`, `registrationSetup`, `scanningSetup`.

### Page structure

For new pages expected to grow beyond ~200 lines, use the controller/view split from the start:

```
Page.tsx                  → PagePermissionGuard + controller hook only
hooks/use*Controller.ts   → queries, mutations, local state, handlers (under src/hooks/{feature}/)
components/*PageView.tsx  → presentational markup (under src/components/{feature}/)
components/*Dialog.tsx    → modal sub-surfaces (optional)
hooks/use*TableColumns.tsx → table column config (optional)
```

Reference: [`src/pages/activities/BookingsPage.tsx`](src/pages/activities/BookingsPage.tsx) + [`useBookingsPageController.ts`](src/hooks/activities/useBookingsPageController.ts) + [`BookingsPageView.tsx`](src/components/activities/BookingsPageView.tsx).

### Page test mocks

Page tests that mock `@solvera/pace-core/components` must use semantic stand-ins from [`src/test/paceCoreElementMocks.tsx`](src/test/paceCoreElementMocks.tsx) (`MockButton`, `MockTextField`, `MockTextarea`, `MockCheckboxField`, `MockSwitch`, `MockFieldLabel`). Do not use native `<button>`, `<input>`, or `<textarea>` in JSX inside test mocks.

## Local development

```bash
npm run setup
npm run dev
```

See pace-core standards in `node_modules/@solvera/pace-core/docs/standards/`.
