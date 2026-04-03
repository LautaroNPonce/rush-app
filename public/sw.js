// ─── Rush Service Worker — Web Push VAPID ───

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try { data = JSON.parse(event.data.text()); } catch { data = { title: "Rush", body: event.data.text() }; }

  const title = data.title || "Rush";
  const options = {
    body: data.body || "Tenés un mensaje nuevo",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "rush-message",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(url) : null;
    })
  );
});
