"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const tabs = [
  {
    href: "/",
    label: "홈",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        {active ? (
          <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V10.5z" />
        ) : (
          <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V10.5z" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    ),
  },
  {
    href: "/votes",
    label: "투표",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        {active ? (
          <path d="M9 12l2 2 4-4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
        ) : (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    ),
  },
  {
    href: "/chart",
    label: "차트",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        {active ? (
          <>
            <rect x="2" y="10" width="5" height="12" rx="1" />
            <rect x="9.5" y="4" width="5" height="18" rx="1" />
            <rect x="17" y="7" width="5" height="15" rx="1" />
          </>
        ) : (
          <>
            <rect x="2" y="10" width="5" height="12" rx="1" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="9.5" y="4" width="5" height="18" rx="1" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="17" y="7" width="5" height="15" rx="1" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    ),
  },
  {
    href: "/guides",
    label: "가이드",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        {active ? (
          <path d="M4 4a2 2 0 012-2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm10-1v5h5M8 13h8M8 17h5" />
        ) : (
          <>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v6h6M8 13h8M8 17h5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "설정",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.8}>
        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" fill={active ? "currentColor" : "none"} />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      <div className="bottom-nav-inner">
        {tabs.map((tab) => {
          const active = isActive(tab.href, pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`bottom-nav-item ${active ? "active" : ""}`}
            >
              {tab.icon(active)}
              <span className="bottom-nav-label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
