// ─── Firebase Messaging Service Worker ───
// Rush — notificaciones push en background

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// REEMPLAZAR con tu firebaseConfig real
firebase.initializeApp({
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  appId: "FIREBASE_APP_ID",
});

const messaging = firebase.messaging();

// Mensaje recibido en background (app cerrada o en segundo plano)
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "Rush", {
    body: body || "Tenés un mensaje nuevo",
    icon: icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: "rush-message",
    renotify: true,
    data: payload.data || {},
  });
});

// Click en la notificación → abrir/enfocar la app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});
