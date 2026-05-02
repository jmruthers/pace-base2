# BA00 QA Pack

## Slice metadata

- slice_id: BA00
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA00-app-shell-and-access-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | FI-03 | App bootstrap | Load the app with a stored session and observe initial render. | Full-screen "Restoring session..." loader appears until restoration completes, with no route content visible underneath. |  |  |
| S-02 | FI-02 | `/` unauthenticated | Open `/` while unauthenticated after restoration completes. | Route redirects to `/login`. |  |  |
| S-03 | FI-11 | `/login` | Enter invalid credentials and click Sign in. | Inline error alert appears in the login card and user remains on `/login`. |  |  |
| S-04 | FI-08a | `/` | Sign in with no selected organisation and open `/`. | Main content shows "Please select an organisation." with no cards rendered. |  |  |
| S-05 | FI-14, FI-17 | `/` event card grid | Sign in with organisation selected and no selected event, then click an event card. | Grid renders one card per accessible event; clicking a card sets selected event and navigates to `/event-dashboard`. |  |  |
| S-06 | FI-34 | `*` (unmatched route) | While authenticated, open an unmatched route and click Return to Dashboard. | In-shell 404 card renders and Return to Dashboard navigates client-side to `/`. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
