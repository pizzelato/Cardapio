const CACHE = 'pizzelato-v5';
const ASSETS = [
  '/Cardapio/',
  '/Cardapio/index.html',
  '/Cardapio/manifest.json'
];

const FB_PROJECT = 'pizzelato-98e7c';
const FB_KEY = 'AIzaSyCfts7IfOB7eajaSoI-x1zsi8lRo3NDO70';
const NOTIF_URL = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents/config/notificacoes?key=${FB_KEY}`;

let ultimaNotifTs = 0;
let checando = false;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
  carregarUltimoTs().then(() => checarNotificacoes());
});

// Checar notificações em todo fetch — garante execução mesmo após o SW adormecer
self.addEventListener('fetch', e => {
  // Checar notificações em background sem bloquear o fetch
  if(!checando && !e.request.url.includes('firestore')){
    checando = true;
    checarNotificacoes().finally(() => { checando = false; });
  }

  if(!e.request.url.includes('firestore') && !e.request.url.includes('googleapis')){
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
    );
  }
});

// Checar também ao receber mensagem do app (ex: quando o cliente abre o cardápio)
self.addEventListener('message', e => {
  if(e.data === 'checar-notificacoes') checarNotificacoes();
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
    const resp = await fetch(NOTIF_URL + '&_=' + Date.now());
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
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23c0692b"/><text y=".85em" font-size="70" x="15">%F0%9F%8D%95</text></svg>',
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
    await new Promise(r => { req.onsuccess = e => { if(e.target.result) ultimaNotifTs = e.target.result; r(); }; req.onerror = r; });
  }catch(e){}
}
async function salvarUltimoTs(ts){
  try{
    const db = await abrirDB();
    const tx = db.transaction('meta','readwrite');
    tx.objectStore('meta').put(ts,'ultimaNotifTs');
  }catch(e){}
}
