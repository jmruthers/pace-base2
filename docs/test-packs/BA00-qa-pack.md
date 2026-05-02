# BA00 QA Pack

## Slice metadata

- slice_id: BA00
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA00-app-shell-and-access-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | FI-02 | `/` (unauthenticated after restoration) | Open `/` without an authenticated session after restoration completes. | User is redirected to `/login`; redirect does not occur while restoration is still in progress. |  |  |
| S-02 | FI-11 | `/login` | Enter invalid credentials and submit Sign in. | Inline error alert is shown inside the login card and user remains on `/login`. |  |  |
| S-03 | FI-14 | `/` | Sign in, ensure organisation is selected and no event in context, then open `/`. | Event card grid renders for accessible events. |  |  |
| S-04 | FI-08a | `/` | Sign in with no selected organisation and open `/`. | Main content shows centered message "Please select an organisation." and no card grid/CTA. |  |  |
| S-05 | FI-34 | unmatched route (for example `/not-found-test`) | Open an unmatched route while authenticated, then click Return to Dashboard. | 404 card renders and Link navigates client-side to `/`. |  |  |
| S-06 | FI-19 | authenticated shell user menu | Open user menu and click Sign out. | Sign-out completes and navigation goes to `/login`. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
