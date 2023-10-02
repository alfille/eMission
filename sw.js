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
    "/download.html",
    "/admin.html",
    "/sw.js",
    "/images/DCTOHC11.jpg",
    "/images/Null.png",
    "/images/emission11-web-white.jpg",
    "/images/emission_64x64.png",
    "/images/emission_t_square.png",
    "/style/NoPhoto.png",
    "/style/base.css",
    "/style/print.css",
    "/js/app.js",
    "/js/downapp.js",
    "/js/adminapp.js",
    "/js/globals_mod.js",
    "/js/id_mod.js",
    "/js/image_mod.js",
    "/js/cookie_mod.js",
    "/js/sorttable_mod.js",
    "/js/patientdata_mod.js",
    "/js/log_mod.js",
    "/js/simple_mod.js",
    "/js/replicate_mod.js",
    "/js/flatpickr.min.js",
    "/js/qrenc-4.0.0.min.js",
    "/js/pouchdb-8.0.1.min.js",
    "/js/elasticlunr.min.js",
    "/js/jszip.min.js",
    "/js/pptxgen.min.js",
    "/js/print.min.js",
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
                    caches.open(cacheName)
                    .then( cache => {
                        cache.put( event.request, rc );
                        cache.keys()
                        .then( keys =>
                            keys
                            .filter( key => !cacheList.includes(new URL(key.url).pathname))
                            .forEach( key => cache.delete(key.url) )
                            );
                        });
                    return response ;
                    })
                .catch( () => caches.match(event.request) )
            );
        }
    }
});
