# Technical Debt Cleanup

## Previously completed
- [x] Add `.gitignore` and remove tracked `.DS_Store` files
- [x] Fix variable hoisting: move `headerInserted`/`firstRender` declarations before `showError()`
- [x] Merge duplicate `.skeleton-row` CSS rules into one
- [x] Remove dead CSS (`.standings-table { margin-top: 0 }`)
- [x] Replace magic number `999` in `worker.js` with `NO_RANK_VALUE` constant
- [x] Remove unused `originalIndex` field from `loadFromCSV()`
- [x] Clean up stale sections in `GIT_WORKFLOW.md` (removed old branch references)

## This pass

### Foundation
- [x] Local backup tag: `pre-cleanup-backup-2026-05-08`
- [x] Add `package.json` + `vitest`, `npm test` script
- [x] Extract pure functions into `lib/` (`constants`, `season`, `parsing`, `sorting`, `scrape`)
- [x] Convert `script.js` to ES module; `<script type="module">` in `index.html`
- [x] `worker.js` imports from `lib/` (single source of truth)
- [x] 51 unit tests covering all pure functions + scrape fixtures

### Bugs fixed
- [x] **#1** Doubled `<thead>` row after `showError` — now also clears `tableHead`
- [x] **#2** Worker year hardcoding — uses `getSeasonEndYear()` so URL is right Nov–Dec
- [x] **#3** CSV parser dropped escaped quotes (`""`) — full RFC 4180-ish parser
- [x] **#4** Hardcoded `colspan="4"` — `TABLE_COLUMNS` constant
- [x] **#5** Wake lock re-acquire fragility — checks `wakeLock.released`
- [x] Retry loop: track `state.retryTimer` so a manual refresh cancels pending retry

### Cleanups
- [x] **#6** `@keyframes highlight` → `position-change-pulse`
- [x] **#7** Dead `.row th` CSS rule removed
- [x] **#8** `GIT_WORKFLOW.md` slimmed (188 → ~30 lines), `beta` references removed
- [x] **#9** `DEBUG` is now runtime-toggleable via `?debug=1` or `localStorage.debug = '1'`
- [x] **#10** Dropped legacy `.ttf`/`.otf` font files; CSS only references `.woff2`
- [x] **#19** `rgba(36, 3, 3, 0.736)` → `0.75`

### Upgrades
- [x] **#14** PWA: `manifest.webmanifest` + `sw.js` (stale-while-revalidate for shell, network-only for live data)
- [x] **#15** Worker now returns `apPollDegraded` + `apPollStatus` so client can detect missing AP rankings
- [x] **#12** HTMLRewriter migration — **skipped**. Regex parsers extracted into `lib/scrape.js` with 13 tests against fixture HTML; HTMLRewriter would force tests onto miniflare and the regex code is functionally equivalent.

### Polish
- [x] **#16** Status label "CSV" → "Backup" (class kept for CSS continuity)
- [x] **#17** Stale timestamp now has a `title` tooltip with full date+time
- [x] **#18** Favicon, apple-touch-icon, OG image, theme-color all wired up
- [x] **#20** README rewritten — removed stale URL, documented `lib/`, tests, debug toggle, cache-bust expectation

## Verification
- `npm test` — 51 passed (4 files)
- `node -e "import('./worker.js')"` — module loads cleanly
- Manual file diff against `pre-cleanup-backup-2026-05-08` for sanity
