"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import BottomNav from "./BottomNav";
import InstallPrompt from "./InstallPrompt";
import { activatePush } from "./NotificationManager";

type NotificationSettings = {
  master: boolean;
  liveBroadcast: boolean;
  newVote: boolean;
  newYoutube: boolean;
};

const DEFAULT_NOTIF_SETTINGS: NotificationSettings = {
  master: false,
  liveBroadcast: true,
  newVote: true,
  newYoutube: true,
};

const headerLinks = [
  { href: "/", label: "홈" },
  { href: "/votes", label: "투표" },
  { href: "/chart", label: "차트" },
  { href: "/guides", label: "가이드" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeState, setNoticeState] = useState<"hidden" | "default" | "denied">("hidden");
  const [isNoticeRequesting, setIsNoticeRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const dismissed = localStorage.getItem("hades_notice_dismissed") === "1";
    const permission = Notification.permission;
    if (permission === "granted") {
      setNoticeState("hidden");
      return;
    }
    if (permission === "denied") {
      setNoticeState(dismissed ? "hidden" : "denied");
      return;
    }
    setNoticeState(dismissed ? "hidden" : "default");
  }, []);

  const hideNotice = useCallback(() => {
    localStorage.setItem("hades_notice_dismissed", "1");
    setNoticeState("hidden");
  }, []);

  const requestNoticePermission = useCallback(async () => {
    if (typeof window === "undefined" || isNoticeRequesting) return;

    setIsNoticeRequesting(true);
    setNoticeState("hidden");

    const activated = await activatePush();
    if (activated) {
      const raw = localStorage.getItem("hades_notif_settings");
      let current: NotificationSettings = DEFAULT_NOTIF_SETTINGS;

      if (raw) {
        try {
          current = { ...DEFAULT_NOTIF_SETTINGS, ...JSON.parse(raw) } as NotificationSettings;
        } catch {
          current = DEFAULT_NOTIF_SETTINGS;
        }
      }

      const next = { ...current, master: true };
      localStorage.setItem("hades_notif_settings", JSON.stringify(next));
      window.dispatchEvent(new Event("hades_prefs_changed"));

      localStorage.removeItem("hades_notice_dismissed");
      setIsNoticeRequesting(false);
      return;
    }

    if ("Notification" in window) {
      setNoticeState(Notification.permission === "denied" ? "denied" : "default");
    }
    setIsNoticeRequesting(false);
  }, [isNoticeRequesting]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="app-shell">
      <div className="header-wrap">
        <header className="header" style={{ borderTop: "none", boxShadow: "none" }}>
          <Link className="logo" href="/" aria-label="HADES INFO 홈으로 이동">
            <img className="logo-icon" src="/icons/hades_helper.png" alt="" width={36} height={36} />
            HADES INFO
          </Link>

          <nav className="header-nav" aria-label="주요 메뉴">
            {headerLinks.map((link) => (
              <Link
                key={link.href}
                className={`nav-link ${isActive(link.href) ? "active" : ""}`}
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            className="hamburger"
            type="button"
            aria-expanded={menuOpen}
            aria-label="메뉴 열기"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
          {menuOpen && (
            <div className="menu-panel">
              {headerLinks.map((link) => (
                <Link
                  key={link.href}
                  className={`menu-link ${isActive(link.href) ? "active" : ""}`}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </header>
      </div>

      {noticeState !== "hidden" && (
        <div
          className="notice-banner"
          role="status"
          aria-live="polite"
          style={{ top: "calc(64px + env(safe-area-inset-top, 0px) + 8px)", bottom: "auto", paddingBottom: 12 }}
        >
          <p>
            {noticeState === "denied"
              ? "알림이 차단되어 있어요. 브라우저 설정에서 허용해 주세요."
              : "알림을 켜면 라이브/투표 소식을 바로 받을 수 있어요."}
          </p>
          <div className="notice-actions">
            {noticeState === "default" && (
              <button type="button" className="notice-allow" onClick={requestNoticePermission} disabled={isNoticeRequesting}>
                허용
              </button>
            )}
            <button type="button" className="notice-later" onClick={hideNotice} disabled={isNoticeRequesting}>
              {noticeState === "denied" ? "닫" : "나중에"}
            </button>
          </div>
        </div>
      )}

      <InstallPrompt />
      <div className="container">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
