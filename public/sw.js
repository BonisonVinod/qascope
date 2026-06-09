/**
 * QAScope Service Worker — handles browser push notifications.
 *
 * This file must be served from the root of the domain (/sw.js) so that
 * it has scope over the entire application.
 */

// Listen for push events from the server
self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "QAScope Alert", body: event.data.text(), url: "/" };
  }

  const title = data.title ?? "QAScope Alert";
  const options = {
    body: data.body ?? "You have a new notification.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: data.url ?? "qascope-notification", // collapses duplicates
    requireInteraction: data.severity === "critical", // critical stays until dismissed
    data: {
      url: data.url ?? "/",
    },
    actions:
      data.severity === "critical"
        ? [{ action: "view", title: "View Audit" }]
        : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — open or focus the app at the correct URL
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // If a QAScope tab is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
