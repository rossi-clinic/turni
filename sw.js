/* Turni Rossi Clinic — service worker
   Regola: la pagina si prende sempre dalla rete quando c'è, così tutti
   vedono l'ultima versione; la copia in memoria serve solo se la rete manca. */
const CACHE = "turni-rc-16";
const BASE  = new URL("./", self.location).pathname;
const PAGINA = BASE + "index.html";
const CORREDO = [BASE, PAGINA, BASE + "manifest.webmanifest",
                 BASE + "icona-180.png", BASE + "icona-192.png", BASE + "icona-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORREDO))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(nomi => Promise.all(nomi.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;

  if (r.mode === "navigate") {                       // la pagina: prima la rete
    e.respondWith(
      fetch(r).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(PAGINA, copia)).catch(() => {});
        return res;
      }).catch(() => caches.match(PAGINA).then(x => x || caches.match(BASE)))
    );
    return;
  }

  if (new URL(r.url).origin !== self.location.origin) return;   // caratteri e simili: alla rete

  e.respondWith(
    caches.match(r).then(trovato => trovato || fetch(r).then(res => {
      if (res && res.ok) {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(r, copia)).catch(() => {});
      }
      return res;
    }))
  );
});
