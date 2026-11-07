const CACHE_NAME = 'sais-animal-hub-v29';
const BASE = '/SAISAnimalInformationHubUK/';
const APP_SHELL = [
  BASE + 'accessibility/',
  BASE + 'animal-articles/benefits-of-hydrotherapy/',
  BASE + 'animal-articles/benefits-of-socialisation/',
  BASE + 'animal-articles/boarding-home-boarding-laws/',
  BASE + 'animal-articles/dogs-wildlife-law/',
  BASE + 'animal-articles/',
  BASE + 'animal-articles/keeping-animals-cool-summer/',
  BASE + 'animal-articles/training-for-fun/',
  BASE + 'animal-care-training/fun-enrichment/',
  BASE + 'animal-care-training/health-safety-for-pets/',
  BASE + 'animal-care-training/',
  BASE + 'animal-care-training/recommended-animal-books/',
  BASE + 'animal-care-training/rescue-tips/',
  BASE + 'animal-care-training/training-tips-advice/',
  BASE + 'animal-help-resources/',
  BASE + 'animal-help-resources/lost-found-animals/',
  BASE + 'bird-information/',
  BASE + 'cat-information/',
  BASE + 'chicken-information/',
  BASE + 'contact/',
  BASE + 'dog-information/',
  BASE + 'horse-information/',
  BASE,
  BASE + 'offline.html',
  BASE + 'privacy/',
  BASE + 'rabbit-information/',
  BASE + 'reptileexotic-information/',
  BASE + 'rodent-information/',
  BASE + 'sources-and-editorial-standards/',
  BASE + 'terms-and-disclaimer/',
  BASE + 'wildlife-information/',
  BASE + 'assets/css/redesign-2026.css',
  BASE + 'assets/css/site.css',
  BASE + 'assets/site-shell.css',
  BASE + 'assets/site-shell.js',
  BASE + 'icon.svg',
  BASE + 'info-logo.png',
  BASE + 'manifest.json'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(APP_SHELL))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('sais-animal-hub-') && key !== CACHE_NAME).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Cache third-party images after they are viewed so previously visited pages
  // retain their imagery offline. Opaque no-CORS image responses are supported.
  if (url.origin !== self.location.origin) {
    if (request.destination !== 'image') return;
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        return await cache.match(request) || Response.error();
      }
    })());
    return;
  }
  if (!url.pathname.startsWith(BASE)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request, {ignoreSearch: true});
        if (cached) return cached;
        const path = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
        const directoryPage = await cache.match(path) || await cache.match(path + 'index.html');
        return directoryPage || await cache.match(BASE + 'offline.html') || await cache.match(BASE);
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const refresh = fetch(request).then(response => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    }).catch(() => null);
    event.waitUntil(refresh.then(() => undefined));
    const cached = await cache.match(request);
    if (cached) return cached;
    return await refresh || Response.error();
  })());
});
