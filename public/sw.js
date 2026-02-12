/// <reference lib="webworker" />

const SW_VERSION = "1.0.0";
const CACHE_NAME = `hades-${SW_VERSION}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 알림 클릭 처리
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// 메시지 수신 - 메인 스레드에서 알림 요청
self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, icon, url, tag } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: icon || "/icons/hades_helper.png",
      badge: "/icons/hades_helper.png",
      tag: tag || "hades-notification",
      data: { url },
      vibrate: [200, 100, 200],
    });
  }
});
