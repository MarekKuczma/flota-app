/* ASYSTENT FLOTY — service worker (wzorzec rodziny: shell cache-first).
   Konwencja nazwy cache: asystent-vNN — NUMER podbijać przy KAŻDEJ zmianie
   plików aplikacji (inaczej przeglądarki podadzą stare pliki z cache).
   Stopka w aplikacji pokazuje 'asystent-vNN' — patrz obsługa message. */
var WERSJA_CACHE = 'asystent-v23';  /* v23 (03.09.2026, A-17): Skrzynka da sie porzadkowac z aplikacji — tryb „Porzadkuj" (wariant C z makiety), odrzucanie wpisu z powodem, zwinieta lista odrzuconych z „Wroc do kolejki" i „Wyczysc odrzucone". Backend API v5: akcja `oznacz` + AUTOMAT ustawiajacy Stan=przetworzone dla wpisow, ktore trafily do bazy (koniec recznego odznaczania w arkuszu). */
var SHELL = [
  './', './index.html', './config.js', './manifest.json',
  './ikona-192.png', './ikona-512.png',
  './ikona-192-maskable.png', './ikona-512-maskable.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(WERSJA_CACHE).then(function (c) { return c.addAll(SHELL); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (klucze) {
    return Promise.all(klucze.map(function (k) {
      if (k !== WERSJA_CACHE) return caches.delete(k);
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;              /* API (POST) zawsze z sieci */
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;          /* obce hosty: nie ruszamy */
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (r) {
      return r || fetch(e.request);
    })
  );
});

/* stopka wersji pyta workera o nazwę cache (wzorzec W-22 z Floty) */
self.addEventListener('message', function (e) {
  if (e.data && e.data.typ === 'wersja' && e.ports && e.ports[0])
    e.ports[0].postMessage({ wersja: WERSJA_CACHE });
});
