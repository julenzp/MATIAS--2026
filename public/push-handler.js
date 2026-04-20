// Push notification handler — importado en el Service Worker generado por vite-plugin-pwa
// via la opción workbox.importScripts

self.addEventListener('push', function(event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: '🚌 ERBI', body: event.data ? event.data.text() : 'Nueva actualización' };
  }

  var title = data.title || '🚌 ERBI Transporte';
  var options = {
    body: data.body || 'Tienes una actualización',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    data: data.data || {},
    tag: 'erbi-preparate', // Evita duplicar notificaciones
    renotify: true
  };

  // Notify all open clients to play sound alert immediately
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          clientList[i].postMessage({
            type: 'ERBI_PUSH_ALERT',
            title: title,
            body: options.body
          });
        }
      })
    ])
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Buscar ventana existente
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
