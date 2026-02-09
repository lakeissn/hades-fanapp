"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "홈" },
  { href: "/votes", label: "투표" },
  { href: "/guides", label: "가이드" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <div className="header-wrap">
        <header className="header">
          <div className="logo">Hades Fanapp</div>
          <nav className="header-nav" aria-label="주요 메뉴">
            {links.map((link) => (
              <a
                key={link.href}
                className={`nav-link ${pathname === link.href ? "active" : ""}`}
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
                  className={`menu-link ${pathname === link.href ? "active" : ""}`}
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
      <div className="container">{children}</div>
    </div>
  );
}
