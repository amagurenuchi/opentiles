'use strict';

const CACHE_NAME = 'opentiles-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './i18n.js',
  './translations.csv',
  './language_music.csv',
  './music_json.csv',
  './Futura condensed.ttf',
  './ads.txt',
  './special/splash.png'
];

// Compile absolute URLs for core assets to match exactly during intercept
const CORE_URLS = new Set();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Resolve URLs relative to this service worker scope
      const resolvedUrls = CORE_ASSETS.map(asset => new URL(asset, self.location.href).href);
      resolvedUrls.forEach(url => CORE_URLS.add(url));
      
      // Add Tailwind CSS CDN to core assets for offline styles
      const tailwindUrl = 'https://cdn.tailwindcss.com';
      
      return cache.addAll([...resolvedUrls, tailwindUrl]).catch(err => {
        console.warn('Failed to pre-cache some core assets during install:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isTailwind = requestUrl.hostname === 'cdn.tailwindcss.com';
  const isGoogleFonts = requestUrl.hostname === 'fonts.googleapis.com' || requestUrl.hostname === 'fonts.gstatic.com';

  // Only intercept same-origin and approved CDNs
  if (!isSameOrigin && !isTailwind && !isGoogleFonts) return;

  const urlHref = event.request.url;
  
  // Re-build CORE_URLS set if it was cleared on SW restart
  if (CORE_URLS.size === 0) {
    CORE_ASSETS.map(asset => new URL(asset, self.location.href).href).forEach(url => CORE_URLS.add(url));
  }

  // Treat directory root (same origin '/') or '/index.html' as core assets
  const isRoot = isSameOrigin && (requestUrl.pathname === '/' || requestUrl.pathname === '/index.html');
  const isCore = CORE_URLS.has(urlHref) || isRoot;

  if (isCore) {
    // Stale-While-Revalidate strategy for core files (enables smooth updates)
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            console.debug('Core asset network fetch failed, using cache if available:', event.request.url, err);
            return new Response('Service unavailable', { status: 503, statusText: 'Service Unavailable' });
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
  } else {
    // Cache-First strategy for media assets, JSONs, Tailwind, Google Fonts
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch((err) => {
          console.warn('Fetch failed for offline asset:', event.request.url, err);
          return new Response('Service unavailable', { status: 503, statusText: 'Service Unavailable' });
        });
      })
    );
  }
});
