// Service Worker für Web Push (Selfhosted Cycle Tracker)

self.addEventListener("push", function (event) {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Benachrichtigung", body: event.data.text() };
  }
  const options = {
    body: data.body,
    icon: data.icon || "/icon-192x192.png",
    badge: "/badge.png",
    vibrate: [100, 50, 100],
    tag: data.tag,
    data: { url: data.url || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(data.title || "Zyklus", options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
