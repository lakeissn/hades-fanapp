"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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

function loadTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem("hades_theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

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

const Toggle = memo(function Toggle({
  active,
  onToggle,
  disabled = false,
  canAnimate,
}: {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  canAnimate: boolean;
}) {
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    },
    [disabled, onToggle]
  );

  return (
    <div
      className={`toggle ${active ? "active" : ""} ${canAnimate ? "" : "no-animate"}`}
      role="switch"
      aria-checked={active}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onToggle}
      onKeyDown={onKeyDown}
    />
  );
});

export default function SettingsPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [canAnimate, setCanAnimate] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [notif, setNotif] = useState<NotificationSettings>(DEFAULT_NOTIF);
  const [permissionState, setPermissionState] = useState<string>("default");
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    const loadedTheme = loadTheme();
    const loadedNotif = loadNotifSettings();

    setTheme(loadedTheme);
    setNotif(loadedNotif);
    if ("Notification" in window) {
      setPermissionState(Notification.permission);
    }
    setIsHydrated(true);

    const raf = window.requestAnimationFrame(() => setCanAnimate(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const changeTheme = useCallback((t: Theme) => {
    setTheme(t);
    localStorage.setItem("hades_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.style.backgroundColor = t === "dark" ? "#0a0a0a" : "#f5f5f5";
  }, []);

  const pushDescription = useMemo(() => {
    if (permissionState === "denied") {
      return "브라우저에서 알림이 차단되어 있습니다";
    }
    if (isActivating) {
      return "알림을 설정하는 중...";
    }
    return notif.master
      ? "알림이 활성화되어 있습니다"
      : "알림을 켜면 새 소식을 받을 수 있어요";
  }, [isActivating, notif.master, permissionState]);

  const toggleMaster = useCallback(async () => {
    if (isActivating) return;

    if (!notif.master) {
      setIsActivating(true);
      try {
        const success = await activatePush();
        if (success) {
          const next = { ...notif, master: true };
          setNotif(next);
          saveNotifSettings(next);
          setPermissionState("granted");
        } else if ("Notification" in window) {
          setPermissionState(Notification.permission);
        }
      } finally {
        setIsActivating(false);
      }
      return;
    }

    const next = { ...notif, master: false };
    setNotif(next);
    saveNotifSettings(next);
    await deactivatePush();
  }, [notif, isActivating]);

  const toggleSub = useCallback(
    async (key: keyof Omit<NotificationSettings, "master">) => {
      const next = { ...notif, [key]: !notif[key] };
      setNotif(next);
      saveNotifSettings(next);
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
                <span className="settings-item-desc">앱의 전체 색상을 변경합니다</span>
              </div>
            </div>

            {isHydrated ? (
              <div className={`theme-selector ${canAnimate ? "" : "no-animate"}`}>
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
            ) : (
              <div className="settings-placeholder" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>

      <div className="settings-group">
        <span className="settings-group-title">알림 설정</span>
        <div className="settings-card">
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon">🔔</div>
              <div className="settings-item-text">
                <span className="settings-item-label">푸시 알림</span>
                <span className="settings-item-desc">{isHydrated ? pushDescription : "설정을 불러오는 중..."}</span>
              </div>
            </div>
            {isHydrated ? (
              <Toggle
                active={notif.master}
                onToggle={toggleMaster}
                disabled={isActivating}
                canAnimate={canAnimate}
              />
            ) : (
              <div className="toggle-placeholder" aria-hidden="true" />
            )}
          </div>

          {isHydrated && notif.master && (
            <div className="notification-sub-settings">
              <div className="settings-item">
                <div className="settings-item-left">
                  <div className="settings-item-icon">📡</div>
                  <div className="settings-item-text">
                    <span className="settings-item-label">라이브 방송 알림</span>
                    <span className="settings-item-desc">멤버가 방송을 시작하면 알림</span>
                  </div>
                </div>
                <Toggle
                  active={notif.liveBroadcast}
                  onToggle={() => void toggleSub("liveBroadcast")}
                  canAnimate={canAnimate}
                />
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <div className="settings-item-icon">🗳️</div>
                  <div className="settings-item-text">
                    <span className="settings-item-label">새 투표 알림</span>
                    <span className="settings-item-desc">새로운 투표가 등록되면 알림</span>
                  </div>
                </div>
                <Toggle
                  active={notif.newVote}
                  onToggle={() => void toggleSub("newVote")}
                  canAnimate={canAnimate}
                />
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <div className="settings-item-icon">▶️</div>
                  <div className="settings-item-text">
                    <span className="settings-item-label">유튜브 업로드 알림</span>
                    <span className="settings-item-desc">새 영상이 업로드되면 알림</span>
                  </div>
                </div>
                <Toggle
                  active={notif.newYoutube}
                  onToggle={() => void toggleSub("newYoutube")}
                  canAnimate={canAnimate}
                />
              </div>
            </div>
          )}
        </div>
      </div>

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

      <Link href="/privacy" className="settings-privacy-link">
        개인정보처리방침
      </Link>
    </main>
  );
}
