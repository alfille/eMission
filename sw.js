// Service Worker using itty-router from https://github.com/kwhitley/itty-router

const cacheName = "eMission";
const cachable = [
    "index.html",
    "sw.js",
    "images/DCTOHC11.jpg",
    "images/emission11-web-white.jpg",
    "images/emission_64x64.png",
    "images/missiondb192.png",
    "images/emission_t_square.png",
    "style/NoPhoto.png",
    "style/base.css",
    "js/app.js",
    "js/base.js",
    "js/datepicker.js",
    "js/time-pick.js",
    "js/length-pick.js",
    "js/qrenc-4.0.0.min.js",
    "js/pouchdb-7.2.1.min.js",
    ];



// itty-router source
const Router = ({ base = '', routes = [] } = {}) => ({
  __proto__: new Proxy({}, {
    get: (target, prop, receiver) => (route, ...handlers) =>
      routes.push([
        prop.toUpperCase(),
        RegExp(`^${(base + route)
          .replace(/(\/?)\*/g, '($1.*)?')
          .replace(/\/$/, '')
          .replace(/:(\w+)(\?)?(\.)?/g, '$2(?<$1>[^/]+)$2$3')
          .replace(/\.(?=[\w(])/, '\\.')
          .replace(/\)\.\?\(([^\[]+)\[\^/g, '?)\\.?($1(?<=\\.)[^\\.') // RIP all the bytes lost :'(
        }/*$`),
        handlers,
      ]) && receiver
  }),
  // eslint-disable-next-line object-shorthand
  routes,
  async handle (request, ...args) {
    let response, match,
        url = new URL(request.url)
    request.query = Object.fromEntries(url.searchParams)
    for (let [method, route, handlers] of routes) {
      if ((method === request.method || method === 'ALL') && (match = url.pathname.match(route))) {
        request.params = match.groups
        for (let handler of handlers) {
          if ((response = await handler(request.proxy || request, ...args)) !== undefined) return response
        }
      }
    }
  }
})

const router = Router() ;

const ifCacheRespond = async (request, context, event) => {
    console.log("Look in caches",request);
    const response = await caches.match(request);
    if (response) {
        console.log("Found")
        return response
    }
}

const ifNetworkRespond = async (request, context, event) => {
    if(context.onLine){
        let response = await fetch(request);
        if (response && response.ok) {
            return response;
        }
        console.log("No network");
    }
}

const errorRespond = async ( request, context, event ) => {
    console.log("Error response");
    const response = new Response();
    return response.error();
}

const justShow = async (request, context, event) => {
    console.log( request, context ) ;
}

router.get('*', ifNetworkRespond, ifCacheRespond, errorRespond ) ;
router.post('*', ifNetworkRespond ) ;
router.put('*', ifNetworkRespond ) ;

// preload cache
self.addEventListener('install', function (event) {
    // Cache core assets
    event.waitUntil(caches.open(cacheName).then( cache => {
        cachable.forEach( asset => cache.add(new Request(asset)) );
        return cache;
    }));
});

// Link in router
self.addEventListener('fetch', event =>
    event
    .respondWith(router.handle(event.request, {onLine: navigator.onLine}, event))
    );
