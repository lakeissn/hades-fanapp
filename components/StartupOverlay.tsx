"use client";

import { useEffect } from "react";

const SESSION_KEY = "hades_splash_shown";
const DISPLAY_MS = 500; // 로고 표시 시간
const FADE_MS = 350; // CSS transition과 동일

/**
 * CSS-first splash (#__splash)의 생명주기를 관리하는 headless 컴포넌트.
 *
 * #__splash는 layout.tsx에서 raw HTML로 삽입되어 첫 paint에 바로 보입니다.
 * 이 컴포넌트는 React 하이드레이션 후:
 *   - 세션 첫 방문: DISPLAY_MS 후 fade-out → DOM 제거
 *   - 재방문(SPA 내비게이션): 즉시 제거
 */
export default function StartupOverlay() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const splash = document.getElementById("__splash");
    if (!splash) return;

    const alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";

    if (alreadyShown) {
      // 이미 본 세션 → 즉시 제거 (SPA 내비게이션이므로 사실상 도달하기 어려움)
      splash.remove();
      return;
    }

    // 세션 첫 방문 → 로고 보여준 뒤 fade-out
    sessionStorage.setItem(SESSION_KEY, "1");

    const fadeTimer = setTimeout(() => {
      splash.classList.add("splash-fade");
    }, DISPLAY_MS);

    const removeTimer = setTimeout(() => {
      splash.remove();
    }, DISPLAY_MS + FADE_MS + 50); // 여유 50ms

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return null; // Headless — UI는 layout.tsx의 #__splash가 담당
}
