var CACHE_NAME = 'my-site-cache-v1';
var urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/style/base.css',
  '/style/NoPhoto.png',
  '/js/app.js',
  '/js/base.js',
  '/js/pouchdb-7.2.1.min.js',
  '/js/qrenc-4.0.0.min.js',
  '/js/time-pick.js',
  '/js/datepicker.js',
  '/js/length-pick/js',
  '/images/missiondb32.png',
  '/images/missiondb64.png',
  '/images/missiondb192.png',
  '/images/missiondb512.png',
];

self.addEventListener('install', function(event) {
    // Perform install steps
    function preCache() {
        caches.open(CACHE_NAME).then( function(cache_list) {
            console.log('Opened cache');
            cache_list.addAll( urlsToCache.map( function(urlToPrefetch) {
                console.log(urlToPrefetch);
                return new Request(urlToPrefetch, { mode: 'no-cors' });
            })).then( function() {
                console.log('All resources have been fetched and cached.');
            });
        });
    }
    event.waitUntil( preCache() ) ;
});

self.addEventListener('fetch', function(event) {
  console.log(["Fetch",event]) ;  
  function responder() {
    caches.match(event.request).then(function(response) {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request);
    }).catch( function (err) {
        console.log(err) ; 
    }) ;
  }
  event.respondWith( responder() ) ;
});
