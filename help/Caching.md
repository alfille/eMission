# Cache content
[eMission](https://github.com/alfille/emission) runs as a single-page app with most static content (code, HTML and images) in the browser cache.
## Off-line user

eMission is designed for off-line as well as on-line work. It passes the [PWA Builder](https://pwabuilder.com) test suite.

![PWAbuilder](/images/pwabuilder.png)

That means:

* All processing is done locally in the browser
* Code, static images and layout is stored locally in *Cache*
* Content (medical information) is stored locally in the browser database
* When available, the network is queried to refresh code and synchronize changes to content

## Service Worker

eMission uses the modern caching technique of [Service Workers](https://developer.chrome.com/docs/workbox/service-worker-overview/). eMission uses a simple direct service worker program instead of a framework like *Workbox*.

The service worker is a long-running background program (in the browser) with persistent storage only in **Cache** or **IndexDb**

eMission's service worker startup is:

```
    // Service worker (to manage cache for off-line function)
    if ( 'serviceWorker' in navigator ) {
        navigator.serviceWorker
        .register('/sw.js')
        .catch( err => console.log(err) );
    }
```

## Code

Contents of sw.js

```
/* Service Worker with strategy:
    1. Add selected files to cache
    2. Hook into fetch only for those files
    3. Get from network and return plus update cache
    4. Fall back to cache if network fails
    * */
    
const cacheName = "eMission";
const cacheList = [
    "/",
    "/index.html",
    "/sw.js",
    "/images/DCTOHC11.jpg",
    "/images/emission11-web-white.jpg",
    "/images/emission_64x64.png",
    "/images/emission_t_square.png",
    "/style/NoPhoto.png",
    "/style/base.css",
    "/style/print.css",
    "/js/app.js",
    "/js/flatpickr.min.js",
    "/js/qrenc-4.0.0.min.js",
    "/js/print.min.js",
    "/js/pouchdb-7.3.1.min.js",
    "/js/elasticlunr.min.js",
    ];

// preload cache
self.addEventListener('install', event => 
    event
    .waitUntil(
        caches.open(cacheName)
        .then( (cache) => cache.addAll( cacheList ) )
        .catch( (err) => console.log("Error filling cache",err))
        )
);

// Selected Fetch
self.addEventListener('fetch', event => {
    if ( event.request.method === 'GET' ) {
        let url = new URL(event.request.url) ;
        if ( cacheList.includes(url.pathname) ) {
            event.respondWith(
                fetch(event.request)
                .then( response => {
                    if ( !response.ok ) {
                        throw 404;
                    }
                    let rc = response.clone() ;
                    caches.open(cacheName).then( cache => cache.put( event.request, rc ) );
                    return response ;
                    })
                .catch( () => caches.match(event.request) )
            );
        }
    }
});
```

## Strategy

* A static list of cacheable files is hardcoded in the sw.js file
* all files are loaded into the cache at service worker initiation
* **On page load:**
  * *If no network:* files are delivered from the cache
  * *If network but request not in cachable list:* File downloaded and delivered
  * *If network but file download problem:* /Files delivered from cache
  * *If network and download success:* Files also copied into cache to update cache content
## Comments and enhancements
### Storage efficiency

* Total cached content is relatively small in modern terms ( < 1Mb )
* Cache is regularly scanned for outdated files
* Re-writing all files on download might wear out flash storage.
* *Enhancement:* write-on-change (use a file hash or direct content comparison)

### Network bandwidth

* Cached content is only requested at page load, not during routine use.
* Database content is stored separately in IndexDb but uses CouchDb replication protocol for off-line and incremental synchronization.

### Currency

* All files are reloaded if available
* Cache is constantly updated
* Losing connectivity during load could give a mix of new and old content (i.e. no generational check)
* Expect that rare change of cached files to minimize this risk
* *Enhancement:* version control of all cache content (would also reduce need for cache write)
* *Enhancement:* Package cached files in larger blocks for download efficiency and synchronization
