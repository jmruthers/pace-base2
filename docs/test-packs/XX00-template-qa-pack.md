# QA Pack Template

## Purpose

Use this template to create `docs/test-packs/[SLICE_ID]-qa-pack.md` in consumer app repos.

This pack is a simple manual frontend test checklist for one built slice.

## Scope authority

- Requirement slice is the sole scope authority.
- Assume the requirement slice is complete and accurate.
- QA packs list manual test scenarios only; they do not evaluate requirement quality.
- QA packs record verification evidence; they do not authorize new scope, contracts, or implementation behavior.

## QA pack template

```md
# [SLICE_ID] QA Pack

## Slice metadata

- slice_id: [SLICE_ID]
- app: [APP]
- requirement_path: docs/requirements/[SLICE_ID]-*.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|---|
| S-01 | AC-01 | [/path or screen name] | [required user state, permissions, and data setup] | [explicit steps a tester can execute without opening the requirement doc] | [expected UI behavior] | [Pass/Fail] | [notes] |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
```

## Do not

- Do not invent tests beyond requirement authority.
- Do not include requirement-completeness or missing-detail analysis.
- Do not include backend contract judgement in the QA pack.
- Do not write generic steps that require opening the requirement doc to understand execution.
