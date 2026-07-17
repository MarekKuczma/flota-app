/**
 * ROZLICZENIE FLOTY RINKON — service-worker.js
 *
 * Strategia:
 *  - App shell (index.html, config.js, manifest, ikony): cache-first
 *    z cichym odswiezaniem w tle (stale-while-revalidate), zeby
 *    aplikacja startowala offline, a poprawki i zmiany config.js
 *    docieraly przy nastepnym uruchomieniu z siecia.
 *  - API (inna domena — script.google.com): network-only, nic nie
 *    cache'ujemy; kolejka offline zyje w localStorage aplikacji.
 *
 * Po zmianie plikow aplikacji podbij numer wersji ponizej.
 */

var WERSJA_CACHE = 'flota-shell-v31';

// Przekaźnik kodu kierowcy między kartą Safari a zainstalowaną ikonką
// (FEEDBACK-BETA-TESTY.md pkt 8, patrz też pwa/index.html — NAZWA_RELAY_KODU).
// NIE kasować przy sprzątaniu starych cache — to jedyne miejsce, w którym
// kod "przeżywa" między kontekstami na iOS; musi zostać dokładnie ta sama
// nazwa co w index.html.
var NAZWA_RELAY_KODU = 'flota-kod-relay';

var PLIKI_SHELL = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './ikona-192.png',
  './ikona-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(WERSJA_CACHE).then(function (cache) {
      return cache.addAll(PLIKI_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (klucze) {
      return Promise.all(klucze.map(function (klucz) {
        if (klucz !== WERSJA_CACHE && klucz !== NAZWA_RELAY_KODU) return caches.delete(klucz);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var zadanie = event.request;

  // API i wszystko spoza naszej domeny: tylko siec (network-only).
  if (zadanie.method !== 'GET' ||
      new URL(zadanie.url).origin !== self.location.origin) {
    return; // przegladarka obsluguje normalnie, bez cache
  }

  // App shell: cache-first + odswiezenie kopii w tle.
  event.respondWith(
    caches.match(zadanie, { ignoreSearch: true }).then(function (zCache) {
      var zSieci = fetch(zadanie).then(function (odpowiedz) {
        if (odpowiedz && odpowiedz.ok) {
          var kopia = odpowiedz.clone();
          caches.open(WERSJA_CACHE).then(function (cache) {
            cache.put(zadanie, kopia);
          });
        }
        return odpowiedz;
      }).catch(function () {
        return zCache; // brak sieci — zostaje wersja z cache
      });
      return zCache || zSieci;
    })
  );
});
