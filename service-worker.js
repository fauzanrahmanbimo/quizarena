/* QuizArena service worker — offline sederhana untuk situs 1 file.
   Cache index.html + PDF materi supaya bisa dibuka tanpa internet. */
const CACHE = "quizarena-v6";
const ASSETS = [
  "./",
  "index.html",
  "level-1.pdf", "level-2.pdf", "level-3.pdf", "level-4.pdf", "level-5.pdf",
  "level-6.pdf", "level-7.pdf", "level-8.pdf", "level-9.pdf", "level-10.pdf",
  "level-11.pdf", "level-12.pdf", "level-13.pdf", "level-14.pdf", "level-15.pdf",
  "level-16.pdf", "level-17.pdf", "level-18.pdf", "level-19.pdf", "level-20.pdf",
  "modul-belajar.pdf",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // cache satu per satu supaya gagal 1 file tidak membatalkan semua
      Promise.all(ASSETS.map((u) => c.add(u).catch(() => null)))
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  
  const url = new URL(req.url);
  // P1 SECURITY: Do not cache API endpoints to prevent token/private data leakage
  if (url.pathname.startsWith('/api/')) {
    return; // Let the browser handle API requests normally (no cache)
  }

  // network-first untuk dokumen, cache-first untuk sisanya
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => {
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put("index.html", copy)); return r;
    }).catch(() => caches.match("index.html").then((m) => m || caches.match("./"))));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r && r.status === 200 && r.type === "basic") { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return r;
    }).catch(() => hit))
  );
});
