const CACHE_NAME = 'sais-animal-hub-v2';
const BASE = '/SAISAnimalInformationHubUK/';
const APP_SHELL = [
  BASE, BASE + 'index.html', BASE + 'manifest.json', BASE + 'icon.svg', BASE + 'offline.html',
  BASE + 'contact/', BASE + 'animal-care-training/', BASE + 'animal-care-training/training-tips-advice/',
  BASE + 'animal-care-training/health-safety-for-pets/', BASE + 'animal-care-training/fun-enrichment/',
  BASE + 'animal-care-training/recommended-animal-books/', BASE + 'animal-help-resources/',
  BASE + 'animal-articles/', BASE + 'dog-information/', BASE + 'cat-information/',
  BASE + 'chicken-information/', BASE + 'rabbit-information/', BASE + 'rodent-information/',
  BASE + 'reptileexotic-information/', BASE + 'horse-information/', BASE + 'wildlife-information/'
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
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request, {ignoreSearch: true});
      if (cached) return cached;
      const cleanPath = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
      const directoryPage = await caches.match(cleanPath);
      if (directoryPage) return directoryPage;
      return (await caches.match(BASE + 'offline.html')) || (await caches.match(BASE + 'index.html'));
    }));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    });
  }));
});
