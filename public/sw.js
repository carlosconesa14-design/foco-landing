/* Service worker de la beta web: deja instalar el juego y que arranque rápido y sin conexión.
 * - Páginas: red primero (así siempre llega la versión nueva) y la copia si no hay red.
 * - /assets/ (archivos con hash en el nombre): copia primero, nunca cambian.
 * - Resto (sprites, audio, fuentes): se sirve la copia y se refresca en segundo plano.
 * Solo toca peticiones GET del mismo origen: Supabase y demás pasan de largo. */
const CACHE = "rider-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const store = (req, res) => {
  if (res && res.status === 200 && res.type === "basic") {
    const copy = res.clone(); // hay que clonar ya: después el navegador ya habrá leído el cuerpo
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || req.headers.has("range")) return;

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => store(req, r)).catch(() => caches.match(req).then((m) => m || caches.match(new URL("./", self.location).href))));
  } else if (url.pathname.includes("/assets/")) {
    e.respondWith(caches.match(req).then((m) => m || fetch(req).then((r) => store(req, r))));
  } else {
    e.respondWith(
      caches.match(req).then((m) => {
        const net = fetch(req).then((r) => store(req, r)).catch(() => m);
        return m || net;
      }),
    );
  }
});
