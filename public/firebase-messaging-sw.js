/**
 * public/firebase-messaging-sw.js
 *
 * FCM 백그라운드 푸시 수신 + 알림 표시 + 클릭 처리
 * - 기존 sw.js 의 SHOW_NOTIFICATION 핸들러도 포함 (호환성)
 * - Firebase SDK 없이 네이티브 Push API 사용 → config 하드코딩 불필요
 */

/* eslint-disable no-restricted-globals */

// ─── 푸시 수신 (백그라운드) ───
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // JSON 파싱 실패 시 무시
    return;
  }

  // FCM data-only 메시지: payload.data 안에 title/body/url/tag
  const data = payload.data || payload.notification || {};
  const title = data.title || "HADES INFO";
  const body = data.body || "";
  const icon = data.icon || "/icons/hades_helper.png";
  const badge = data.badge || "/icons/hades_helper.png";
  const tag = data.tag || "hades-default";
  const url = data.url || "/";

  const options = {
    body,
    icon,
    badge,
    tag,
    data: { url },
    // 진동 패턴 (Android PWA)
    vibrate: [100, 50, 100],
    // 자동 닫힘 방지
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── 알림 클릭 처리 ───
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";
  // 상대 경로를 절대 URL로 변환
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // 이미 열려있는 같은 origin 탭이 있으면 포커스 + 이동
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.navigate(fullUrl);
            return client.focus();
          }
        }
        // 열린 탭이 없으면 새 창
        return self.clients.openWindow(fullUrl);
      })
  );
});

// ─── 기존 NotificationPoller 호환: postMessage로 알림 표시 ───
self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, url, tag } = event.data;
    self.registration.showNotification(title || "HADES INFO", {
      body: body || "",
      icon: "/icons/hades_helper.png",
      badge: "/icons/hades_helper.png",
      tag: tag || "hades-msg",
      data: { url: url || "/" },
    });
  }
});
