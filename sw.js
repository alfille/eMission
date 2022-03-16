// Service Worker using itty-router from https://github.com/kwhitley/itty-router
// use examples from https://itnext.io/easier-service-worker-caching-with-routing-323d347d95d3

const cacheName = "eMission";
const cachable = [
    "/",
    "/index.html",
    "/sw.js",
    "/images/DCTOHC11.jpg",
    "/images/emission11-web-white.jpg",
    "/images/emission_64x64.png",
    "/images/missiondb192.png",
    "/images/emission_t_square.png",
    "/style/NoPhoto.png",
    "/style/base.css",
    "/js/app.js",
    "/js/datepicker.js",
    "/js/time-pick.js",
    "/js/length-pick.js",
    "/js/qrenc-4.0.0.min.js",
    "/js/pouchdb-7.2.1.min.js",
    "/js/elasticlunr.min.js",
    ];

// preload cache
self.addEventListener('install', event => 
    event
    .waitUntil(
        caches.open(cacheName)
        .then( (cache) => cache.addAll( cachable ) )
        .catch( (err) => console.log("Error filling cache",err))
        )
);

// Selected Fetch
self.addEventListener('fetch', event => {
    if ( event.request.method === 'GET' ) {
        let url = new URL(event.request.url) ;
        if ( cachable.includes(url.pathname) ) {
            //console.log("FETCH",url.pathname,cachable.includes(url.pathname));
            event.respondWith(
                fetch(event.request)
                .then( response => {
                    let rc = response.clone() ;
                    caches.open(cacheName).then( cache => cache.put( event.request, rc ) );
                    return response ;
                    })
                .catch( () => caches.match(event.request) )
            );
        }
    }
});
