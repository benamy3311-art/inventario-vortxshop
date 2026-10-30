// Mantiene la app disponible sin señal. Los datos los sincroniza Firestore por su cuenta.
const V = "inventario-v4";
const SHELL = ["./", "index.html", "styles.css", "app.js", "catalog.js", "pdf.js", "firebase-config.js", "manifest.webmanifest",
  "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/favicon.png"];
const CDN = /^(www\.gstatic\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (req, res) => { if (res && (res.ok || res.type === "opaque")) { const cp = res.clone(); caches.open(V).then(c => c.put(req, cp)); } return res; };

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  const same = u.origin === self.location.origin;
  // Fotos, íconos y librerías con versión fija: primero la copia guardada.
  if ((same && /\/(img|icons)\//.test(u.pathname)) || (CDN.test(u.hostname) && !u.pathname.startsWith("/__/"))) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res))));
    return;
  }
  // Código de la app: primero la red para recibir actualizaciones; sin señal, la copia guardada.
  if (same) {
    e.respondWith(fetch(req).then(res => put(req, res))
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match("index.html"))));
  }
});
