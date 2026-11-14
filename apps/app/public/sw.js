self.addEventListener("push", (event) => {
    const { body, title } = event.data.json();
    event.waitUntil(self.registration.showNotification(title, { body, icon: "/apple-touch-icon.png", tag: "daily" }));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(self.clients.openWindow("/"));
});
