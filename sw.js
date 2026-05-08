// Minimal service worker for the kiosk display.
// Strategy:
//   - Pre-cache the static shell so the page renders even when the network
//     is flaky (Wi-Fi blips on a TV are common).
//   - Use stale-while-revalidate for static assets (HTML/CSS/JS/fonts/images).
//   - Bypass cache entirely for the live data sources (worker + Google Sheets);
//     stale standings are worse than no standings.

const CACHE_VERSION = "b1g-standings-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.webmanifest",
  "./B1G Logo White.webp",
  "./B1G Logo White.png",
  "./Court BG 4.webp",
  "./Aeternus/01-aeternus_nano.woff2",
  "./Aeternus/04-aeternus_heavy.woff2",
  "./Aeternus/Wisconsin-Regular.woff2",
  "./Aeternus/Gotham-Bold.woff2",
  "./Aeternus/Gotham-Medium.woff2",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isLiveDataRequest(url) {
  return (
    url.hostname.endsWith(".workers.dev") ||
    url.hostname === "docs.google.com"
  );
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Always go to network for live data — never serve stale standings.
  if (isLiveDataRequest(url)) return;

  // Stale-while-revalidate for everything else (same-origin static shell).
  event.respondWith(
    caches.open(CACHE_VERSION).then(async cache => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then(response => {
          if (response.ok && url.origin === self.location.origin) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
