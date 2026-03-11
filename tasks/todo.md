# Bug Fixes & UX Improvements Pass

## Bugs
- [ ] Fix null pointer in `updateTable()` - `tableEl` not null-checked before use
- [ ] Fix XSS vulnerabilities - sanitize innerHTML in `createTeamRow` and `showError`
- [ ] Fix position-change-indicator never rendering (dataset.change checked before it's in the DOM)
- [ ] Fix AP rank parsing treating `0` as unranked (falsy `||` check)

## UX Improvements
- [ ] Fix status label always hidden (opacity:0, unreachable on mobile)
- [ ] Add debounce to online event handler to prevent rapid-fire fetches
- [ ] Add column headers to standings table for clarity
- [ ] Add ARIA attributes for accessibility (loading spinner, status, error)
- [ ] Add meta description and Open Graph tags to index.html
