# Technical Debt Cleanup

## Completed
- [x] Add `.gitignore` and remove tracked `.DS_Store` files
- [x] Fix variable hoisting: move `headerInserted`/`firstRender` declarations before `showError()`
- [x] Merge duplicate `.skeleton-row` CSS rules into one
- [x] Remove dead CSS (`.standings-table { margin-top: 0 }`)
- [x] Replace magic number `999` in `worker.js` with `NO_RANK_VALUE` constant
- [x] Remove unused `originalIndex` field from `loadFromCSV()`
- [x] Clean up stale sections in `GIT_WORKFLOW.md` (removed old branch references)
