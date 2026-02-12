"use client";

import { useEffect, useState, useCallback } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 이미 설치된 경우
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // 이미 닫은 경우 (3일간 표시 안 함)
    const dismissed = localStorage.getItem("hades_install_dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < 3 * 24 * 60 * 60 * 1000) return;
    }

    // iOS 감지
    const ua = navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iosDevice);

    // Chrome/Edge/Samsung 등 beforeinstallprompt 지원 브라우저
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari에서는 beforeinstallprompt가 없으므로 수동 표시
    if (iosDevice && !standalone) {
      setTimeout(() => setShowPrompt(true), 2000);
    }

    // Firefox 등 beforeinstallprompt 미지원 + 비-iOS에서도 표시
    const timer = setTimeout(() => {
      if (!iosDevice && !standalone) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // iOS에서는 안내 표시
      alert("Safari 하단의 공유 버튼(□↑)을 누른 후\n'홈 화면에 추가'를 선택해 주세요.");
    } else {
      // 기타 브라우저 안내
      alert("브라우저 메뉴에서 '앱 설치' 또는 '홈 화면에 추가'를 선택해 주세요.");
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem("hades_install_dismissed", String(Date.now()));
    setShowPrompt(false);
  }, []);

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-icon">📱</div>
      <div className="install-prompt-text">
        <strong>앱으로 설치하기</strong>
        <span>
          {isIOS
            ? "홈 화면에 추가하면 앱처럼 사용할 수 있어요"
            : "설치하면 더 빠르게 접속할 수 있어요"}
        </span>
      </div>
      <div className="install-prompt-actions">
        <button className="install-btn" onClick={handleInstall}>
          {isIOS ? "방법 보기" : "설치"}
        </button>
        <button className="install-dismiss" onClick={handleDismiss}>
          닫기
        </button>
      </div>
    </div>
  );
}
