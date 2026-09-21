// KINARA Sovereign Platform — Service Worker placeholder
// Zero-budget PWA: next-pwa would generate this automatically (dest: "public", register: true, skipWaiting: true).
// This placeholder ensures /sw.js resolves and allows manual registration if needed.
// If next-pwa is installed later, this file will be overwritten by the generated precache manifest.

self.addEventListener("install", () => {
  // @ts-ignore
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // @ts-ignore
  event.waitUntil(self.clients.claim());
});

// Minimal fetch passthrough — offline cache can be added later via Workbox/next-pwa
self.addEventListener("fetch", () => {
  // no-op — let browser handle fetch; Workbox will intercept when generated
});
