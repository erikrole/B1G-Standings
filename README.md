# Big Ten Men's Basketball Standings

A real-time, auto-updating display board for Big Ten Conference men's basketball standings.

![Big Ten Standings](https://img.shields.io/badge/Big%20Ten-Standings-C5050C?style=for-the-badge)

## Features

- Auto-refreshes every 5 minutes
- Position-change indicators (↑/↓) when standings shift
- Wisconsin-themed display with AP and NET rankings
- Wake lock keeps a kiosk display awake
- Offline-capable shell via service worker (live data still requires network)
- Offseason mode that freezes the final standings

## Data sources

1. **Cloudflare Worker** (primary) — scrapes WarrenNolan + NCAA AP poll, returns JSON.
2. **Google Sheet CSV** (fallback) — used when the worker fails twice in a row.

The status pill in the footer shows which source is live (`Connected`, `Backup`, `Failed`, `Final`).

## Project layout

```
index.html           Static shell
script.js            Browser entry point (ES module)
worker.js            Cloudflare Worker (scrapes + serves JSON)
style.css            Display styles
manifest.webmanifest PWA manifest
sw.js                Service worker (caches the shell)
lib/                 Shared pure helpers (parsing, sorting, season, scrape)
tests/               Vitest suite
```

## Development

```bash
npm install
npm test           # run the vitest suite once
npm run test:watch # watch mode while iterating
```

There is no build step — `index.html` loads `script.js` as a native ES module.
Local debug logging: append `?debug=1` to the URL or set `localStorage.debug = '1'`.

When you change `script.js`, `style.css`, or any imported module, bump the
`?v=` query string on those tags in `index.html` so browsers don't serve stale
cached files.

## Deployment

`main` auto-deploys to production via Cloudflare Pages.
The Worker (`worker.js`) is deployed separately to Cloudflare Workers.

---

Go Badgers!
