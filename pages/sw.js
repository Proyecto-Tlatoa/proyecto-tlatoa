/**
 * Service Worker — Proyecto Tlatoa (Modo PWA Offline)
 * Permite que el observatorio funcione al 100% desconectado de internet una vez visitado,
 * cacheando automáticamente recursos estáticos y fotografías descargadas bajo demanda.
 */

const CACHE_NAME = 'tlatoa-pages-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './assets/css/tlatoa.css',
    './assets/css/app.css',
    './assets/js/photos.js',
    './assets/js/export.js',
    './assets/js/app.js',
    './assets/favicon.svg',
    './assets/favicon.ico',
    './assets/img/tecolote.svg',
    './assets/vendor/bootstrap/css/bootstrap.min.css',
    './assets/vendor/bootstrap/js/bootstrap.bundle.min.js',
    './assets/vendor/bootstrap-icons/bootstrap-icons.min.css',
    './assets/vendor/bootstrap-icons/fonts/bootstrap-icons.woff2',
    './data/search_index.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
                console.warn('Algunos recursos secundarios no pudieron precachearse:', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = event.request.url;

    // Estrategia Cache-First para imágenes dinámicas de CDN (weserv, wikimedia, fotos locales)
    if (url.includes('images.weserv.nl') || url.includes('wikimedia.org') || url.includes('/assets/photos/')) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                }).catch(() => caches.match('./assets/img/tecolote.svg'));
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (response && response.status === 200 && url.includes('/assets/')) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            });
        }).catch(() => {
            return caches.match('./index.html');
        })
    );
});
