/* eslint-disable no-restricted-globals */
// Firebase Cloud Messaging service worker
// This file handles background push notifications for PWA/web users.
// Firebase SDK is loaded via importScripts for the service worker context.
//
// NOTE: This is a placeholder. To enable real FCM push notifications:
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Add a Web App and copy the config
// 3. Replace the config object below with your actual Firebase config
// 4. Deploy this file to your public/ directory

// For now, we handle notification clicks via the service worker message event
// to support local/scheduled notifications from the NotificationService.

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const deepLink = data.deepLink || data.url;

  if (deepLink) {
    // Open the app and navigate to the deep link
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If app is already open, focus it and send the deep link
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              payload: data,
            });
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(deepLink);
        }
      })
    );
  }
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'MedWallet';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-512.png',
    badge: '/icon-192.png',
    data: data.data || data,
    vibrate: [100, 50, 100],
    tag: data.tag || 'medwallet-notification',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});