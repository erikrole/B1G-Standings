# Technical Debt Cleanup

## Completed
- [x] Add `.gitignore` and remove tracked `.DS_Store` files
- [x] Fix variable hoisting: move `headerInserted`/`firstRender` declarations before `showError()`
- [x] Merge duplicate `.skeleton-row` CSS rules into one
- [x] Remove dead CSS (`.standings-table { margin-top: 0 }`)
- [x] Replace magic number `999` in `worker.js` with `NO_RANK_VALUE` constant
- [x] Remove unused `originalIndex` field from `loadFromCSV()`
- [x] Clean up stale sections in `GIT_WORKFLOW.md` (removed old branch references)

## UX/UI Browser Test Plan - 2026-05-08
- [x] Serve the static site locally and verify the default desktop render.
- [x] Test mobile and narrow viewport layout for clipping, overflow, and readable hierarchy.
- [x] Exercise refresh/loading/status behavior and inspect browser console errors.
- [x] Review accessibility basics: landmarks, table semantics, button labels, visible status messaging.
- [x] Document concrete findings and recommended next implementation slice.

## UX/UI Browser Test Review - 2026-05-08
- Browser used: Google Chrome for Testing `148.0.7778.97`, downloaded to `/private/tmp` and driven headlessly through DevTools.
- Desktop `1280x720`: page renders all 18 rows in the DOM, but viewport height is `720` and document height is `807`, so the footer and bottom rows require vertical scrolling.
- Mobile `390x844`: no horizontal or vertical overflow; all 18 rows and footer fit.
- Console: Chrome for Testing pass reported no page logs. In-app Chromium reported wake-lock permission denials, which are expected in some automated contexts but should be quieted in production UX.
- Accessibility: landmarks, table semantics, refresh button label, and status region are present. AP rank numbers are exposed as bare adjacent text in team cells, which can read ambiguously.
- Recommended next slice: tighten the desktop/short-viewport layout first, then improve AP-rank accessibility labels and quiet non-actionable wake-lock errors.

## UI Polish Implementation - 2026-05-08
- [x] Add a compact short-height layout so desktop scoreboard views fit without vertical scrolling.
- [x] Tighten the desktop table measure so team names and records read as one board.
- [x] Make footer and final-status treatment more intentional.
- [x] Align Wisconsin row emphasis with the rest of the table hierarchy.
- [x] Improve AP rank accessibility labels and quiet expected wake-lock denials.
- [x] Add a favicon and verify the browser pass again.

## UI Polish Review - 2026-05-08
- Chrome for Testing `148.0.7778.97` desktop `1280x720`: no horizontal overflow, no vertical overflow, footer visible, 18 rows rendered, no wrapped team names.
- Chrome for Testing `148.0.7778.97` mobile `390x844`: no horizontal overflow, no vertical overflow, footer visible, 18 rows rendered, no wrapped team names.
- Browser logs: no warnings or errors reported by the final Chrome for Testing pass.

## Data State Hardening - 2026-05-08
- [x] Add a query-param fixture mode for worker success, worker-to-CSV fallback, CSV failure, stale data, and offseason/final states.
- [x] Keep fixture mode browser-only and inert unless explicitly requested.
- [x] Verify visible status, table rows, retry/error messaging, and console behavior in Chrome for Testing.
- [x] Document final verification results.

## Data State Hardening Review - 2026-05-08
- `?fixture=worker`: status `CONNECTED`, 18 rows, current timestamp, no console messages, no overflow.
- `?fixture=csv`: status `CSV`, 18 rows, current timestamp, no console messages, no overflow.
- `?fixture=stale`: status `CONNECTED`, 18 rows, stale timestamp class, no console messages, no overflow.
- `?fixture=failure`: status `FAILED`, no rows, visible `Standings unavailable` message, no console messages, no overflow.
- `?fixture=offseason`: status `FINAL`, 18 rows, final standings banner, no console messages, no overflow.
