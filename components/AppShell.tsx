"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import BottomNav from "./BottomNav";
import InstallPrompt from "./InstallPrompt";

// 상단 네비게이션 링크 (설정 제외)
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

  // 테마 초기화
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("hades_theme") ?? "dark";
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  // 알림 권한
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const dismissed = localStorage.getItem("hades_notice_dismissed") === "1";
    const permission = Notification.permission;
    if (permission === "granted") { setNoticeState("hidden"); return; }
    if (permission === "denied") { setNoticeState(dismissed ? "hidden" : "denied"); return; }
    setNoticeState(dismissed ? "hidden" : "default");
  }, []);

  const hideNotice = useCallback(() => {
    localStorage.setItem("hades_notice_dismissed", "1");
    setNoticeState("hidden");
  }, []);

  const requestNoticePermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.removeItem("hades_notice_dismissed");
      setNoticeState("hidden");
      // 서비스 워커 등록 시도
      if ("serviceWorker" in navigator) {
        try { await navigator.serviceWorker.register("/sw.js"); } catch {}
      }
      return;
    }
    setNoticeState(permission === "denied" ? "denied" : "default");
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // 메뉴 열린 상태에서 라우트 변경 시 닫기
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="app-shell">
      <div className="header-wrap">
        <header className="header">
          <Link className="logo" href="/" aria-label="HADES FANAPP 홈으로 이동">
            HADES
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

      {/* 알림 허용 배너 */}
      {noticeState !== "hidden" && (
        <div className="notice-banner" role="status" aria-live="polite">
          <p>
            {noticeState === "denied"
              ? "알림이 차단되어 있어요. 브라우저 설정에서 허용해 주세요."
              : "알림을 켜면 라이브/투표 소식을 바로 받을 수 있어요."}
          </p>
          <div className="notice-actions">
            {noticeState === "default" && (
              <button type="button" className="notice-allow" onClick={requestNoticePermission}>
                허용
              </button>
            )}
            <button type="button" className="notice-later" onClick={hideNotice}>
              {noticeState === "denied" ? "닫기" : "나중에"}
            </button>
          </div>
        </div>
      )}

      {/* PWA 설치 유도 */}
      <InstallPrompt />

      <div className="container">{children}</div>

      {/* 하단 네비게이션 */}
      <BottomNav />
    </div>
  );
}
