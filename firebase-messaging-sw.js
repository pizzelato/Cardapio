// Firebase Messaging Service Worker — Pizzelato
// Versão: 1.0
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCfts7IfOB7eajaSoI-x1zsi8lRo3NDO70",
  authDomain: "pizzelato-98e7c.firebaseapp.com",
  projectId: "pizzelato-98e7c",
  storageBucket: "pizzelato-98e7c.firebasestorage.app",
  messagingSenderId: "33999376460",
  appId: "1:33999376460:web:02646aa054832484e464e9"
});

const messaging = firebase.messaging();

// Receber push em background (app fechado/minimizado)
messaging.onBackgroundMessage(function(payload){
  console.log('[SW] Push recebido em background:', payload);

  const { title, body } = payload.notification || {};
  const url = payload.data?.url || 'https://pizzelato.github.io/Cardapio/';

  self.registration.showNotification(title || '🍕 Pizzelato', {
    body: body || 'Atualização do seu pedido',
    icon: '/Cardapio/icon-192.png',
    badge: '/Cardapio/icon-72.png',
    tag: 'pizzelato-pedido',
    renotify: true,
    data: { url },
    actions: [
      { action: 'rastrear', title: '📍 Rastrear pedido' },
      { action: 'fechar',   title: 'Fechar' }
    ]
  });
});

// Clique na notificação — abre o link de rastreio
self.addEventListener('notificationclick', function(event){
  event.notification.close();
  if(event.action === 'fechar') return;

  const url = event.notification.data?.url || 'https://pizzelato.github.io/Cardapio/';
  event.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(function(clientList){
      // Se já tem aba aberta, foca nela
      for(const client of clientList){
        if(client.url.includes('pizzelato.github.io') && 'focus' in client){
          client.navigate(url);
          return client.focus();
        }
      }
      // Senão abre nova aba
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});
