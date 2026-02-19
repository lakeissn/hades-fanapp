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

const NOTICE_REQUESTING_KEY = "hades_notice_requesting";

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

    const isPermissionPending =
      isNoticeRequesting ||
      sessionStorage.getItem(NOTICE_REQUESTING_KEY) === "1";

    if (isPermissionPending) {
      setNoticeState("hidden");
      return;
    }

    const rawSettings = localStorage.getItem("hades_notif_settings");
    if (!rawSettings) {
      localStorage.setItem("hades_notif_settings", JSON.stringify(DEFAULT_NOTIF_SETTINGS));
    }

    const permission = Notification.permission;
    const dismissed = localStorage.getItem("hades_notice_dismissed") === "1";
    const declined = localStorage.getItem("hades_notice_declined") === "1";
    if (permission === "granted") {
      setNoticeState("hidden");
      return;
    }

    if (permission === "denied") {
      // 사용자가 이미 알림 권한을 거절한 경우 배너를 반복 노출하지 않는다.
      setNoticeState("hidden");
      return;
    }

    if (declined) {
      setNoticeState("hidden");
      return;
    }

    // 한 번 수동으로 닫거나 거절한 이후에는 자동 재노출하지 않는다.
    setNoticeState(dismissed ? "hidden" : "default");
  }, [isNoticeRequesting]);

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
    localStorage.setItem("hades_notice_declined", "1");
    setNoticeState("hidden");
  }, []);

  const requestNoticePermission = useCallback(async () => {
    if (typeof window === "undefined" || isNoticeRequesting) return;

    setIsNoticeRequesting(true);
    sessionStorage.setItem(NOTICE_REQUESTING_KEY, "1");
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
      localStorage.removeItem("hades_notice_declined");
      sessionStorage.removeItem(NOTICE_REQUESTING_KEY);
      setIsNoticeRequesting(false);
      return;
    }

    if ("Notification" in window) {
      // 권한 요청 후 허용되지 않은 경우(denied/default 모두) 재노출을 막는다.
      localStorage.setItem("hades_notice_dismissed", "1");
      localStorage.setItem("hades_notice_declined", "1");
      setNoticeState("hidden");
    }
    sessionStorage.removeItem(NOTICE_REQUESTING_KEY);
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
            <ul className="pc-footer-notice-list">
              <li>
                <strong>비공식 팬 사이트</strong>
                <span>하데스 공식과 제휴·연계되지 않은 자발적 팬 프로젝트입니다.</span>
              </li>
              <li>
                <strong>데이터 참고용 제공</strong>
                <span>차트·투표·라이브 정보는 참고용이며 공식 집계와 차이가 있을 수 있습니다.</span>
              </li>
              <li>
                <strong>문의 및 권리 요청</strong>
                <span>권리 침해 또는 수정 요청은 운영진 문의를 통해 접수해 주세요.</span>
              </li>
            </ul>
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
