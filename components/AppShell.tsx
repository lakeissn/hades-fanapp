"use client";

import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isGuides = pathname?.startsWith("/guides");

  return (
    <div className="app-shell">
      <header className="header">
        <div className="logo">Hades Fanapp</div>
        <nav>
          <a className={`nav-link ${pathname === "/" ? "active" : ""}`} href="/">
            홈
          </a>
          <a className={`nav-link ${isGuides ? "active" : ""}`} href="/guides">
            가이드
          </a>
        </nav>
      </header>
      <div className="container">{children}</div>
      <nav className="tabbar">
        <a className={pathname === "/" ? "active" : ""} href="/">
          홈
        </a>
        <a className={isGuides ? "active" : ""} href="/guides">
          가이드
        </a>
        <a href="#" aria-disabled>
          알림
        </a>
        <a href="#" aria-disabled>
          설정
        </a>
      </nav>
    </div>
  );
}
