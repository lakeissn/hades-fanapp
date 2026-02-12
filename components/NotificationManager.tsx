/**
 * components/NotificationManager.tsx
 *
 * Headless 컴포넌트 - FCM 토큰 발급/등록/갱신 + 포그라운드 메시지 표시
 * layout.tsx에 마운트하여 사용
 */
"use client";

import { useEffect, useRef, useCallback } from "react";
import { requestFCMToken, onForegroundMessage } from "@/firebase/client";

// ─── 헬퍼: 알림 설정 읽기 ───
type NotifSettings = {
  master: boolean;
  liveBroadcast: boolean;
  newVote: boolean;
  newYoutube: boolean;
};

const DEFAULT_SETTINGS: NotifSettings = {
  master: false,
  liveBroadcast: true,
  newVote: true,
  newYoutube: true,
};

function getSettings(): NotifSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("hades_notif_settings");
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getSavedToken(): string | null {
  try {
    return localStorage.getItem("hades_fcm_token");
  } catch {
    return null;
  }
}

function saveToken(token: string) {
  try {
    localStorage.setItem("hades_fcm_token", token);
  } catch {}
}

function clearToken() {
  try {
    localStorage.removeItem("hades_fcm_token");
  } catch {}
}

// ─── 플랫폼 감지 ───
function detectPlatform(): "ios" | "android" | "web" {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "web";
}

// ─── prefs 변환 (로컬 설정 → 서버 prefs 형식) ───
function toServerPrefs(s: NotifSettings) {
  return {
    pushEnabled: s.master,
    liveEnabled: s.liveBroadcast,
    voteEnabled: s.newVote,
    youtubeEnabled: s.newYoutube,
  };
}

// ─── API 호출 ───
async function registerToken(token: string, prefs: ReturnType<typeof toServerPrefs>) {
  try {
    await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: detectPlatform(), prefs }),
    });
  } catch (err) {
    console.error("[NotifMgr] register 실패:", err);
  }
}

async function updatePrefs(token: string, prefs: ReturnType<typeof toServerPrefs>) {
  try {
    await fetch("/api/push/update-prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, prefs }),
    });
  } catch (err) {
    console.error("[NotifMgr] update-prefs 실패:", err);
  }
}

async function unregisterToken(token: string) {
  try {
    await fetch("/api/push/unregister", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.error("[NotifMgr] unregister 실패:", err);
  }
}

// ─── 포그라운드 알림 표시 ───
async function showForegroundNotification(data: Record<string, string>) {
  const title = data.title || "HADES INFO";
  const body = data.body || "";

  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, {
        body,
        icon: "/icons/hades_helper.png",
        tag: data.tag || "fg-default",
        data: { url: data.url || "/" },
      });
      return;
    } catch {}
  }

  // fallback
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icons/hades_helper.png", tag: data.tag || "fg" });
  }
}

// ─── 컴포넌트 ───
export default function NotificationManager() {
  const initialized = useRef(false);
  const prevSettingsRef = useRef<string>("");

  // 초기화: 토큰 발급 & 등록
  const init = useCallback(async () => {
    const settings = getSettings();
    if (!settings.master) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const token = await requestFCMToken();
    if (!token) return;

    saveToken(token);
    await registerToken(token, toServerPrefs(settings));
  }, []);

  // 설정 변경 감지 & 동기화
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncPrefs = () => {
      const settings = getSettings();
      const json = JSON.stringify(settings);

      // 변경이 있을 때만 동기화
      if (json === prevSettingsRef.current) return;
      prevSettingsRef.current = json;

      const token = getSavedToken();
      if (!token) return;

      if (!settings.master) {
        // 전체 OFF → 서버에서 비활성화
        unregisterToken(token);
        clearToken();
        return;
      }

      // 개별 설정 변경 → 서버 prefs 업데이트
      updatePrefs(token, toServerPrefs(settings));
    };

    // storage 이벤트 리스닝 (다른 탭에서 변경 시)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "hades_notif_settings") syncPrefs();
    };
    window.addEventListener("storage", onStorage);

    // 커스텀 이벤트 리스닝 (같은 탭 내 설정 변경 시)
    const onCustom = () => syncPrefs();
    window.addEventListener("hades_prefs_changed", onCustom);

    // 초기 실행
    syncPrefs();

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("hades_prefs_changed", onCustom);
    };
  }, []);

  // 초기 토큰 등록 + 포그라운드 메시지 리스너
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialized.current) return;
    initialized.current = true;

    init();

    // 포그라운드 메시지 수신
    const unsub = onForegroundMessage((payload) => {
      const data = payload.data || {};
      showForegroundNotification(data);
    });

    return () => unsub();
  }, [init]);

  return null; // Headless
}

/**
 * 외부에서 호출 가능한 유틸리티 함수들
 * settings 페이지에서 직접 import해서 사용
 */

/** 토큰 발급 + 서버 등록 (최초 알림 활성화 시) */
export async function activatePush(): Promise<boolean> {
  if (!("Notification" in window)) return false;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const token = await requestFCMToken();
  if (!token) return false;

  saveToken(token);

  const settings = getSettings();
  await registerToken(token, toServerPrefs({ ...settings, master: true }));
  return true;
}

/** 알림 비활성화 → 서버 토큰 비활성화 */
export async function deactivatePush() {
  const token = getSavedToken();
  if (token) {
    await unregisterToken(token);
    clearToken();
  }
}

/** 설정 변경을 서버에 동기화 + 커스텀 이벤트 발행 */
export async function syncPrefsToServer() {
  const token = getSavedToken();
  if (!token) return;
  const settings = getSettings();
  await updatePrefs(token, toServerPrefs(settings));
  // 같은 탭의 NotificationManager에게 변경 알림
  window.dispatchEvent(new Event("hades_prefs_changed"));
}
