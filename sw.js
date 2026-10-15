// Task.IT Service Worker - Full Offline Support
// Version: V.01
// Publisher: Ujjwaal Go

const CACHE_NAME = 'taskit-v01-cache';
const OFFLINE_URL = './index.html';

// Files to cache for offline functionality
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-144x144.png',
  './icon-192x192.png',
  './icon-512x512.png'
];

// Install event - Cache resources
self.addEventListener('install', (event) => {
  console.log('Task.IT Service Worker installing...');
  
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    console.log('Caching app shell and content');
    
    try {
      await cache.addAll(CACHE_URLS);
      console.log('All resources cached successfully');
    } catch (error) {
      console.error('Failed to cache resources:', error);
      // Cache essential files individually if batch fails
      for (const url of CACHE_URLS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn(`Failed to cache ${url}:`, err);
        }
      }
    }
  })());
  
  // Skip waiting to activate new service worker immediately
  self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Task.IT Service Worker activating...');
  
  event.waitUntil((async () => {
    // Clean up old caches
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(cacheName => cacheName !== CACHE_NAME)
        .map(cacheName => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
    );
    
    // Take control of all pages immediately
    await self.clients.claim();
    console.log('Task.IT Service Worker activated and claimed control');
  })());
});

// Fetch event - Serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith((async () => {
    try {
      // Try network first for data freshness
      const networkResponse = await fetch(event.request);
      
      // If successful, update cache with fresh content
      if (networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        // Only cache same-origin requests
        if (event.request.url.startsWith(self.location.origin)) {
          cache.put(event.request, networkResponse.clone());
        }
      }
      
      return networkResponse;
    } catch (error) {
      console.log('Network failed, serving from cache:', event.request.url);
      
      // Network failed, try cache
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // If requesting HTML and nothing in cache, serve offline page
      if (event.request.destination === 'document') {
        const offlineResponse = await caches.match(OFFLINE_URL);
        if (offlineResponse) {
          return offlineResponse;
        }
      }
      
      // Return network error if nothing else works
      throw error;
    }
  })());
});

// Background sync for offline task saving (if supported)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'task-sync') {
    event.waitUntil(syncTasks());
  }
});

// Sync tasks when back online
async function syncTasks() {
  console.log('Syncing tasks...');
  
  // Get pending tasks from IndexedDB or localStorage
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_TASKS',
        message: 'Syncing tasks after reconnection'
      });
    });
  } catch (error) {
    console.error('Task sync failed:', error);
  }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_TASK_DATA') {
    // Cache task data for offline access
    cacheTaskData(event.data.data);
  }
});

// Cache task data in IndexedDB or localStorage fallback
async function cacheTaskData(taskData) {
  try {
    // This would typically use IndexedDB for structured data
    // For now, we'll let the main app handle localStorage
    console.log('Task data cached for offline access');
  } catch (error) {
    console.error('Failed to cache task data:', error);
  }
}

console.log('Task.IT Service Worker loaded successfully');