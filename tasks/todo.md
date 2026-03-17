# Bug Fixes & UX Improvements Pass

## Bugs
- [x] Fix null pointer in `updateTable()` - hardened excess row removal with fresh querySelectorAll
- [x] Fix XSS vulnerabilities - sanitize innerHTML in `createTeamRow` and `showError` (already handled via escapeHTML)
- [x] Fix position-change-indicator never rendering - refactored to use local variable instead of dataset
- [x] Fix AP rank parsing treating `0` as unranked - changed falsy check to `!== ""`
- [x] Fix NET rank `0` treated as falsy - changed to `!= null` checks in createTeamRow and needsUpdate

## UX Improvements
- [x] Fix status label always hidden - changed default opacity from 0 to 0.7
- [x] Add debounce to online event handler (already implemented with 300ms timeout)
- [x] Add column headers to standings table (already implemented via ensureTableHeader)
- [x] Add ARIA attributes for accessibility (already present; added aria-label to position change indicators)
- [x] Add meta description and Open Graph tags to index.html (already present)

## New Features & Polish (March 2026)
- [x] Add manual refresh button in footer
- [x] Add smooth skeleton-to-content fade transition
- [x] Add `prefers-reduced-motion` support for accessibility
- [x] Add responsive breakpoints: 480px (small phone), 768px (tablet)
- [x] Add row hover effect for desktop (using `hover: hover` media query)
- [x] Increase alternating row contrast (0.03 -> 0.05)

## Quick Wins (March 17, 2026)
- [x] Fix hardcoded year `2026` in `worker.js` → dynamic `new Date().getFullYear()`
- [x] Update cache-bust version strings in `index.html` → `v=20260317a`
- [x] Add background image alt text (`"Basketball court"`)
- [x] Add `.ok` check + error log for AP Poll fetch in `worker.js`
- [x] Add `DEBUG` flag and gate 10+ debug console.logs behind it
- [x] Add 10-second fetch timeout via `AbortController` wrapper
- [x] Add `MAX_RETRY_ATTEMPTS` cap (6 attempts) to prevent infinite retries
- [x] Add Content-Type validation on CSV fetch response
- [x] Fix position change animation overlap with timer cleanup map
