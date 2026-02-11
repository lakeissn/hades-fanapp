"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "홈" },
  { href: "/votes", label: "투표" },
  { href: "/chart", label: "차트" },
  { href: "/guides", label: "가이드" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeState, setNoticeState] = useState<"hidden" | "default" | "denied">("hidden");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const dismissed = window.localStorage.getItem("hades_notice_dismissed") === "1";
    const permission = Notification.permission;
    if (permission === "granted") { setNoticeState("hidden"); return; }
    if (permission === "denied") { setNoticeState(dismissed ? "hidden" : "denied"); return; }
    setNoticeState(dismissed ? "hidden" : "default");
  }, []);

  const hideNotice = () => {
    if (typeof window !== "undefined") window.localStorage.setItem("hades_notice_dismissed", "1");
    setNoticeState("hidden");
  };

  const requestNoticePermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") { window.localStorage.removeItem("hades_notice_dismissed"); setNoticeState("hidden"); return; }
    if (permission === "denied") { setNoticeState("denied"); return; }
    setNoticeState("default");
  };

  // 현재 경로가 해당 링크의 시작 경로인지 체크 (가이드 하위 페이지 등)
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="app-shell">
      <div className="header-wrap">
        <header className="header">
          <Link className="logo" href="/" aria-label="HADES FANAPP 홈으로 이동">
            HADES FANAPP
          </Link>
          <nav className="header-nav" aria-label="주요 메뉴">
            {links.map((link) => (
              <a
                key={link.href}
                className={`nav-link ${isActive(link.href) ? "active" : ""}`}
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <button
            className="hamburger"
            type="button"
            aria-expanded={menuOpen}
            aria-label="메뉴 열기"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          {menuOpen && (
            <div className="menu-panel">
              {links.map((link) => (
                <a
                  key={link.href}
                  className={`menu-link ${isActive(link.href) ? "active" : ""}`}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </header>
      </div>

      {noticeState !== "hidden" && (
        <div className="notice-banner" role="status" aria-live="polite">
          <p>
            {noticeState === "denied"
              ? "알림이 차단되어 있어요. 브라우저 설정에서 알림을 허용해 주세요."
              : "알림을 켜면 새 투표/라이브 소식을 바로 받을 수 있어요."}
          </p>
          <div className="notice-actions">
            {noticeState === "default" && (
              <button type="button" className="notice-allow" onClick={requestNoticePermission}>
                알림 허용
              </button>
            )}
            <button type="button" className="notice-later" onClick={hideNotice}>
              {noticeState === "denied" ? "닫기" : "나중에"}
            </button>
          </div>
        </div>
      )}

      <div className="container">{children}</div>
    </div>
  );
}
