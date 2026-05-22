self.addEventListener("push", (event) => {
  let data = { title: "Fennec", body: "" };
  try { data = JSON.parse(event.data?.text() ?? "{}"); } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { type: data.type },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
