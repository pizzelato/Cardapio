const CACHE = 'pizzelato-v3';
const ASSETS = [
  '/Cardapio/',
  '/Cardapio/index.html',
  '/Cardapio/manifest.json'
];

const FB_PROJECT = 'pizzelato-98e7c';
const FB_KEY = 'AIzaSyCfts7IfOB7eajaSoI-x1zsi8lRo3NDO70';
const NOTIF_URL = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents/config/notificacoes?key=${FB_KEY}`;

let ultimaNotifTs = 0;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
  carregarUltimoTs();
  setInterval(checarNotificacoes, 60000);
  checarNotificacoes();
});

self.addEventListener('fetch', e => {
  if(!e.request.url.includes('firestore') && !e.request.url.includes('googleapis')){
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
    );
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window'}).then(list => {
      const c = list.find(w => w.url.includes('/Cardapio'));
      if(c) return c.focus();
      return clients.openWindow('/Cardapio/');
    })
  );
});

async function checarNotificacoes(){
  try{
    const resp = await fetch(NOTIF_URL);
    if(!resp.ok) return;
    const json = await resp.json();
    const campos = json.fields?.data?.arrayValue?.values || [];
    if(!campos.length) return;
    const ultima = campos[campos.length - 1].mapValue?.fields;
    if(!ultima) return;
    const ts = parseInt(ultima.ts?.integerValue || ultima.ts?.doubleValue || '0');
    if(ts <= ultimaNotifTs) return;
    const titulo = ultima.titulo?.stringValue || 'Pizzelato';
    const msg    = ultima.msg?.stringValue    || '';
    ultimaNotifTs = ts;
    salvarUltimoTs(ts);
    await self.registration.showNotification(titulo, {
      body: msg,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23c0692b"/><text y=".85em" font-size="70" x="15">🍕</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="10" fill="%23c0692b"/><text y=".85em" font-size="70" x="15">🍕</text></svg>',
      tag: 'pizzelato-' + ts,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: '/Cardapio/' }
    });
  }catch(e){}
}

function abrirDB(){
  return new Promise((res, rej) => {
    const req = indexedDB.open('pizzelato-sw', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('meta');
    req.onsuccess = e => res(e.target.result);
    req.onerror = rej;
  });
}
async function carregarUltimoTs(){
  try{
    const db = await abrirDB();
    const tx = db.transaction('meta','readonly');
    const req = tx.objectStore('meta').get('ultimaNotifTs');
    req.onsuccess = e => { if(e.target.result) ultimaNotifTs = e.target.result; };
  }catch(e){}
}
async function salvarUltimoTs(ts){
  try{
    const db = await abrirDB();
    const tx = db.transaction('meta','readwrite');
    tx.objectStore('meta').put(ts,'ultimaNotifTs');
  }catch(e){}
}
