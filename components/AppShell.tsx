"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import BottomNav from "./BottomNav";
import HeaderSettingsDropdown from "./HeaderSettingsDropdown";
import InstallPrompt from "./InstallPrompt";
import NotificationBanner from "./NotificationBanner";
import { activatePush } from "./NotificationManager";

type NotificationSettings = {
  master: boolean;
  liveBroadcast: boolean;
  newVote: boolean;
  newYoutube: boolean;
};

const DEFAULT_NOTIF_SETTINGS: NotificationSettings = {
  master: false,
  liveBroadcast: false,
  newVote: false,
  newYoutube: false,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const [noticeState, setNoticeState] = useState<"hidden" | "default" | "denied">("hidden");
  const [isNoticeRequesting, setIsNoticeRequesting] = useState(false);
  const [smartBannerVisible, setSmartBannerVisible] = useState(false);

  const evaluateNoticeState = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const rawSettings = localStorage.getItem("hades_notif_settings");
    if (!rawSettings) {
      localStorage.setItem("hades_notif_settings", JSON.stringify(DEFAULT_NOTIF_SETTINGS));
    }

    const permission = Notification.permission;
    const dismissed = localStorage.getItem("hades_notice_dismissed") === "1";
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (permission === "granted") {
      setNoticeState("hidden");
      return;
    }

    if (permission === "denied") {
      setNoticeState(dismissed && !isStandalone ? "hidden" : "denied");
      return;
    }

    setNoticeState(dismissed && !isStandalone ? "hidden" : "default");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    evaluateNoticeState();

    const refreshNoticeState = () => evaluateNoticeState();
    window.addEventListener("focus", refreshNoticeState);
    window.addEventListener("pageshow", refreshNoticeState);
    document.addEventListener("visibilitychange", refreshNoticeState);

    return () => {
      window.removeEventListener("focus", refreshNoticeState);
      window.removeEventListener("pageshow", refreshNoticeState);
      document.removeEventListener("visibilitychange", refreshNoticeState);
    };
  }, [evaluateNoticeState]);

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

      const next = { ...current, master: true, liveBroadcast: true, newVote: true, newYoutube: true };
      localStorage.setItem("hades_push_granted_at", String(Date.now()));
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

  useEffect(() => {
    setMenuOpen(false);
    setSettingsOpen(false);
  }, [pathname]);

  const hideInstallBanner = pathname === "/add-to-home";
  const hasSmartBanner = smartBannerVisible && !hideInstallBanner;

  useEffect(() => {
    if (hideInstallBanner && smartBannerVisible) {
      setSmartBannerVisible(false);
    }
  }, [hideInstallBanner, smartBannerVisible]);

  return (
    <div className={`app-shell ${hasSmartBanner ? "has-smart-banner" : ""}`}>
      {!hideInstallBanner && <InstallPrompt onVisibilityChange={setSmartBannerVisible} />}

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

          <div className="header-actions">
            <button
              ref={settingsBtnRef}
              className="header-settings-btn"
              type="button"
              aria-expanded={settingsOpen}
              aria-label="설정"
              onClick={() => setSettingsOpen((o) => !o)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
            <HeaderSettingsDropdown
              isOpen={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              anchorRef={settingsBtnRef}
            />
          </div>

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

      <div className={`container ${pathname === "/add-to-home" ? "page-add-to-home" : ""}`}>
        {children}
      </div>
      <footer className="pc-footer">
        <div className="pc-footer-inner">
          <div className="pc-footer-top">
            <div className="pc-footer-brand-block">
              <Link href="/" className="pc-footer-brand">
                <img src="/icons/hades_helper.png" alt="" width={22} height={22} />
                HADES INFO
              </Link>
              <p className="pc-footer-copy">© 2026 Team HADES INFO. All rights reserved.</p>
            </div>
            <Link href="/privacy" className="pc-footer-privacy">개인정보처리방침</Link>
          </div>
          <div className="pc-footer-notice">
            <h4>서비스 안내</h4>
            <p>본 서비스는 자발적으로 제작·운영하는 비공식 팬 사이트이며, 하데스 공식과 어떠한 제휴·연계 관계도 없습니다. 음원 차트, 투표 현황, 라이브 방송 정보 등 사이트에 표시되는 모든 데이터는 참고 목적으로 제공되며, 공식 집계 결과와 차이가 있을 수 있습니다. 콘텐츠에 대한 권리 침해나 문의 사항이 있을 경우, 운영진에게 연락 부탁드립니다.</p>
          </div>
        </div>
      </footer>
      <BottomNav />

      {noticeState !== "hidden" && (
        <NotificationBanner
          variant={noticeState === "denied" ? "denied" : "default"}
          message={noticeState === "denied"
            ? "알림이 차단되어 있어요. 브라우저 설정에서 허용해 주세요."
            : "알림을 켜면 라이브·투표 소식을 바로 받을 수 있어요."}
          onAllow={noticeState === "default" ? requestNoticePermission : undefined}
          onDismiss={hideNotice}
          isLoading={isNoticeRequesting}
        />
      )}
    </div>
  );
}
