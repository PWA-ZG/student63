import { set, get, del, keys } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm"

const filesToCache = [
    "/",
    "manifest.json",
    "offline.html",
    "404.html",
    "books.html",
    "index.html",
    "/assets/site.css",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
]

const staticCacheName = "static-cache-v2"

self.addEventListener('error', (event) => {
    console.error('Service Worker Error:', event.error)
})

self.addEventListener('install', event => {
    console.log('Service worker installing…')
    event.waitUntil(
        caches.open(staticCacheName).then((cache) => {
                return cache.addAll(filesToCache)
            }
        )
    )  
})

self.addEventListener('activate', event => {
    console.log('Service worker activated.')

    const cacheWhitelist = [staticCacheName]
    // Ovako možemo obrisati sve ostale cacheve koji nisu naš
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName)
                    }
                })
            )
        })
    )
})

self.addEventListener('fetch', event => {

    const requestURL = new URL(event.request.url)
    console.log("----------------->> Network request for " + event.request.url)

    if (requestURL.pathname === '/books.json') {
        event.respondWith(
            fetch(event.request).then(async response => {
                const cache = await caches.open(staticCacheName)
                const cachedResponse = await cache.match(event.request)

                // Provjera je li se promijenilo => dynamic cache
                if (cachedResponse && response.headers.get('etag') === cachedResponse.headers.get('etag')) {
                    console.log('Books.json not changed. Serving cached version.')
                    return cachedResponse
                }

                console.log('Books.json changed. Updating cache and serving the new version.')
                cache.put(event.request, response.clone())
                return response
            }).catch(error => {
                console.error('Error fetching books.json:', error)
                return caches.match(event.request)
            })
        )
    } else {
        event.respondWith(
            caches
                .match(event.request)
                .then((response) => {
                    
                    if(response) { //ako je nadjen u cache-u
                        console.log("Nasao: " + event.request.url)
                        return response
                    }
    
                    return fetch(event.request).then((response) => {
                        if(response.status === 404) {
                            return caches.match("404.html")
                        }
                        return caches.open(staticCacheName).then((cache) => {
                            console.log("Caching: " + event.request.url)
                            cache.put(event.request.url, response.clone())
                            return response
                        })
                    })
                })
                .catch((error) => {
                    console.log("Error", event.request.url, error)
                    return caches.match("offline.html")
                })
        )
    }


})

self.addEventListener("sync", function (event) {
    console.log('Background sync event triggered:', event)
    if (event.tag === 'sync-photos') {
        event.waitUntil(syncPhotos())
    }
})

let syncPhotos = async function () {

    console.log("Photo sync...")
    keys()
        .then((photoKeys) => {
            console.log("Retrieved photo keys:", photoKeys)
            return Promise.all(photoKeys.map((key) => get(key)))
        })
        .then((photos) => {
            console.log("Retrieved photo data:", photos)
            return Promise.all(
                photos.map((photo) => {
                    return sendPhotoToServer(photo)
                })
            )
        })
        .then(() => {
            console.log("Sync complete")
        })
        .catch((error) => {
            console.log("Error syncing photos:", error)
        })
}

async function sendPhotoToServer(photo) {
    const url = '/upload-photo'
    const data = {
        name: photo.name,
        imgPath: photo.img,
        description: photo.description,
    }

    
    console.log("inside sendPhotoToServer, data:")
    console.log(data)
    
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`)
        }
        //makni iz indexedDB
        console.log("iz indexedDB micem: " + data.name)
        del(data.name)
        return response.json()
    })
    .then(data => {
        console.log('Photo sent to server:', data.message)
        return data
    })
    .catch(error => {
        console.error('Error sending photo to server:', error)
        throw error
    })
}