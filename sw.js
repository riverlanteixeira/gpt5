const CACHE_NAME = 'stranger-things-ar-v1.2';
const STATIC_CACHE_URLS = [
    './',
    './index.html',
    './stranger-things-ar.js',
    './manifest.json',
    './assets/img/stranger-things-logo.png',
    './assets/img/dustin.png',
    './assets/models/walkie_talkie.glb',
    './assets/models/compass.glb',
    './assets/models/baseball_bat.glb',
    './assets/models/demogorgon.glb',
    './assets/models/dungeon_masters_guide.glb',
    './assets/models/machado.glb',
    './assets/models/bicicleta-will.glb',
    './assets/models/will_byers_mundo_invertido.glb',
    './assets/audio/dustin-missao-1-completa.mp3',
    './assets/audio/dustin-missao-2-completa.mp3',
    './assets/audio/dustin-missao-3-completa.mp3',
    './assets/audio/dustin-missao-4-completa.mp3',
    './assets/audio/dustin-missao-5-completa.mp3',
    './assets/audio/dustin-missao-6-completa.mp3',
    './assets/audio/dustin-missao-7-completa.mp3'
];

const CDN_URLS = [
    'https://aframe.io/releases/1.6.0/aframe.min.js',
    'https://unpkg.com/aframe-look-at-component@1.0.0/dist/aframe-look-at-component.min.js',
    'https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar-nft.js'
];

// Install Event - Cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets...');
                return Promise.all([
                    cache.addAll(STATIC_CACHE_URLS.filter(url => url !== './')),
                    cache.addAll(CDN_URLS)
                ]);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch Event - Serve cached content when offline
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle different types of requests
    if (request.method !== 'GET') return;

    // For same-origin requests
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(request)
                .then(cached => {
                    if (cached) {
                        return cached;
                    }
                    
                    return fetch(request)
                        .then(response => {
                            // Cache successful responses
                            if (response.status === 200) {
                                const responseClone = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        cache.put(request, responseClone);
                                    });
                            }
                            return response;
                        })
                        .catch(error => {
                            console.log('Fetch failed for:', request.url, error);
                            
                            // Return offline page or fallback
                            if (request.destination === 'document') {
                                return caches.match('./index.html');
                            }
                            
                            throw error;
                        });
                })
        );
    }
    
    // For CDN requests (A-Frame, AR.js)
    else if (CDN_URLS.some(cdn => request.url.startsWith(cdn))) {
        event.respondWith(
            caches.match(request)
                .then(cached => {
                    if (cached) {
                        return cached;
                    }
                    
                    return fetch(request)
                        .then(response => {
                            if (response.status === 200) {
                                const responseClone = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        cache.put(request, responseClone);
                                    });
                            }
                            return response;
                        })
                        .catch(error => {
                            console.log('CDN fetch failed:', request.url, error);
                            throw error;
                        });
                })
        );
    }
});

// Background Sync for when connection is restored
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('Background sync triggered');
        event.waitUntil(
            // Sync game progress or other data when online
            syncGameData()
        );
    }
});

// Push notifications (if needed for game events)
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Nova missão disponível!',
        icon: './assets/img/dustin.png',
        badge: './assets/img/stranger-things-logo.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '2'
        },
        actions: [
            {
                action: 'explore',
                title: 'Explorar',
                icon: './assets/img/dustin.png'
            },
            {
                action: 'close',
                title: 'Fechar',
                icon: './assets/img/dustin.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Stranger Things AR', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('Notification click received.');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Helper function to sync game data
async function syncGameData() {
    try {
        console.log('Syncing game data...');
        // Here you could sync progress with a server
        // For now, just log that sync occurred
        return Promise.resolve();
    } catch (error) {
        console.error('Sync failed:', error);
        throw error;
    }
}

// Message handling from main thread
self.addEventListener('message', event => {
    console.log('SW received message:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({version: CACHE_NAME});
    }
});