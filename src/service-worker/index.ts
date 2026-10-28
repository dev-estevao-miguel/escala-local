/// <reference lib="webworker" />
import {immutable} from '$app/manifest';
import {version} from '$app/env';
const sw=self as unknown as ServiceWorkerGlobalScope;
const CACHE=`escala-static-${version}`;
const ASSETS=[...immutable.map(({path})=>`/${path.replace(/^\//,'')}`),'/offline.html','/marca-demo.png','/icone-demo-192.png','/icone-demo-512.png','/icone-demo-maskable.png','/apple-touch-demo.png','/favicon-demo.png'];
sw.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>sw.skipWaiting()));});
sw.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('escala-static-')&&key!==CACHE)await caches.delete(key);await sw.clients.claim();})());});
sw.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==sw.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).catch(async()=>await caches.match('/offline.html')??Response.error()));
  }else if(ASSETS.includes(url.pathname)){
    event.respondWith(caches.match(req).then(cached=>cached??fetch(req)));
  }
});
