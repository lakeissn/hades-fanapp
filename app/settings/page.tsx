"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  activatePush,
  deactivatePush,
  syncPrefsToServer,
} from "@/components/NotificationManager";

type Theme = "dark" | "light";

type NotificationSettings = {
  master: boolean;
  liveBroadcast: boolean;
  newVote: boolean;
  newYoutube: boolean;
};

const DEFAULT_NOTIF: NotificationSettings = {
  master: false,
  liveBroadcast: true,
  newVote: true,
  newYoutube: true,
};

function loadNotifSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIF;
  try {
    const raw = localStorage.getItem("hades_notif_settings");
    return raw ? { ...DEFAULT_NOTIF, ...JSON.parse(raw) } : DEFAULT_NOTIF;
  } catch {
    return DEFAULT_NOTIF;
  }
}

function saveNotifSettings(settings: NotificationSettings) {
  localStorage.setItem("hades_notif_settings", JSON.stringify(settings));
}

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [notif, setNotif] = useState<NotificationSettings>(DEFAULT_NOTIF);
  const [permissionState, setPermissionState] = useState<string>("default");
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("hades_theme") as Theme | null;
    setTheme(saved ?? "dark");
    setNotif(loadNotifSettings());
    if ("Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const changeTheme = useCallback((t: Theme) => {
    setTheme(t);
    localStorage.setItem("hades_theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  // ─── 마스터 토글: FCM 토큰 발급/등록 or 비활성화 ───
  const toggleMaster = useCallback(async () => {
    if (isActivating) return;

    if (!notif.master) {
      // ON → 권한 요청 + FCM 토큰 발급 + 서버 등록
      setIsActivating(true);
      try {
        const success = await activatePush();
        if (success) {
          const next = { ...notif, master: true };
          setNotif(next);
          saveNotifSettings(next);
          setPermissionState("granted");
        } else {
          // 권한 거부 또는 토큰 실패
          if ("Notification" in window) {
            setPermissionState(Notification.permission);
          }
        }
      } finally {
        setIsActivating(false);
      }
    } else {
      // OFF → 서버 토큰 비활성화
      const next = { ...notif, master: false };
      setNotif(next);
      saveNotifSettings(next);
      await deactivatePush();
    }
  }, [notif, isActivating]);

  // ─── 개별 알림 토글: localStorage 저장 + 서버 prefs 동기화 ───
  const toggleSub = useCallback(
    async (key: keyof Omit<NotificationSettings, "master">) => {
      const next = { ...notif, [key]: !notif[key] };
      setNotif(next);
      saveNotifSettings(next);
      // 서버에 prefs 업데이트
      await syncPrefsToServer();
    },
    [notif]
  );

  return (
    <main className="settings-page">
      <section className="section-block">
        <div className="section-head page-header">
          <div>
            <p className="section-tag">SETTINGS</p>
            <h2>설정</h2>
          </div>
        </div>
      </section>

      {/* 테마 설정 */}
      <div className="settings-group">
        <span className="settings-group-title">화면 설정</span>
        <div className="settings-card">
          <div
            className="settings-item"
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="settings-item-icon">🎨</div>
              <div className="settings-item-text">
                <span className="settings-item-label">화면 모드</span>
                <span className="settings-item-desc">
                  앱의 전체 색상을 변경합니다
                </span>
              </div>
            </div>
            <div className="theme-selector">
              <button
                className={`theme-option ${theme === "dark" ? "active" : ""}`}
                onClick={() => changeTheme("dark")}
              >
                🌙 다크
              </button>
              <button
                className={`theme-option ${theme === "light" ? "active" : ""}`}
                onClick={() => changeTheme("light")}
              >
                ☀️ 라이트
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 알림 설정 */}
      <div className="settings-group">
        <span className="settings-group-title">알림 설정</span>
        <div className="settings-card">
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon">🔔</div>
              <div className="settings-item-text">
                <span className="settings-item-label">푸시 알림</span>
                <span className="settings-item-desc">
                  {permissionState === "denied"
                    ? "브라우저에서 알림이 차단되어 있습니다"
                    : isActivating
                      ? "알림을 설정하는 중..."
                      : notif.master
                        ? "알림이 활성화되어 있습니다"
                        : "알림을 켜면 새 소식을 받을 수 있어요"}
                </span>
              </div>
            </div>
            <div
              className={`toggle ${notif.master ? "active" : ""}`}
              role="switch"
              aria-checked={notif.master}
              tabIndex={0}
              onClick={toggleMaster}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleMaster();
                }
              }}
            />
          </div>

          {notif.master && (
            <div className="notification-sub-settings">
              <div className="settings-item">
                <div className="settings-item-left">
                  <div className="settings-item-icon">📡</div>
                  <div className="settings-item-text">
                    <span className="settings-item-label">
                      라이브 방송 알림
                    </span>
                    <span className="settings-item-desc">
                      멤버가 방송을 시작하면 알림
                    </span>
                  </div>
                </div>
                <div
                  className={`toggle ${notif.liveBroadcast ? "active" : ""}`}
                  role="switch"
                  aria-checked={notif.liveBroadcast}
                  tabIndex={0}
                  onClick={() => toggleSub("liveBroadcast")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSub("liveBroadcast");
                    }
                  }}
                />
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <div className="settings-item-icon">🗳️</div>
                  <div className="settings-item-text">
                    <span className="settings-item-label">새 투표 알림</span>
                    <span className="settings-item-desc">
                      새로운 투표가 등록되면 알림
                    </span>
                  </div>
                </div>
                <div
                  className={`toggle ${notif.newVote ? "active" : ""}`}
                  role="switch"
                  aria-checked={notif.newVote}
                  tabIndex={0}
                  onClick={() => toggleSub("newVote")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSub("newVote");
                    }
                  }}
                />
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <div className="settings-item-icon">▶️</div>
                  <div className="settings-item-text">
                    <span className="settings-item-label">
                      유튜브 업로드 알림
                    </span>
                    <span className="settings-item-desc">
                      새 영상이 업로드되면 알림
                    </span>
                  </div>
                </div>
                <div
                  className={`toggle ${notif.newYoutube ? "active" : ""}`}
                  role="switch"
                  aria-checked={notif.newYoutube}
                  tabIndex={0}
                  onClick={() => toggleSub("newYoutube")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSub("newYoutube");
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 앱 정보 */}
      <div className="settings-group">
        <span className="settings-group-title">앱 정보</span>
        <div className="settings-card">
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon">ℹ️</div>
              <div className="settings-item-text">
                <span className="settings-item-label">버전</span>
              </div>
            </div>
            <span
              style={{
                fontSize: 13,
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              1.1.0
            </span>
          </div>
        </div>
      </div>

      {/* 개인정보처리방침 */}
      <Link href="/privacy" className="settings-privacy-link">
        개인정보처리방침
      </Link>
    </main>
  );
}
