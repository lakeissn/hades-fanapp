"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Props = {
  onVisibilityChange?: (visible: boolean) => void;
};

export default function InstallPrompt({ onVisibilityChange }: Props) {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // 모바일/태블릿 감지
    const ua = navigator.userAgent;
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      || ("ontouchstart" in window && window.innerWidth < 1024);
    setIsMobileDevice(mobile);
    if (!mobile) return;

    // 이미 닫은 경우 (3일간 표시 안 함)
    const dismissed = localStorage.getItem("hades_install_dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < 3 * 24 * 60 * 60 * 1000) return;
    }

    // iOS 감지
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

    // 비-iOS 모바일에서도 표시
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

  useEffect(() => {
    const visible = !isStandalone && isMobileDevice && showPrompt;
    onVisibilityChange?.(visible);
  }, [showPrompt, isStandalone, isMobileDevice, onVisibilityChange]);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      router.push("/add-to-home");
    }
  }, [deferredPrompt, router]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem("hades_install_dismissed", String(Date.now()));
    setShowPrompt(false);
  }, []);

  if (isStandalone || !showPrompt || !isMobileDevice) return null;

  return (
    <div className="smart-banner" role="banner">
      <button type="button" className="smart-banner-close" onClick={handleDismiss} aria-label="닫기">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
      <img className="smart-banner-icon" src="/icons/hades_helper.png" alt="" width={40} height={40} />
      <div className="smart-banner-info">
        <strong>HADES INFO</strong>
        <span>{isIOS ? "홈 화면에 추가하여 앱으로 보기" : "앱으로 설치하면 더 빠르게"}</span>
      </div>
      <button type="button" className="smart-banner-action" onClick={handleInstall}>
        {deferredPrompt ? "설치" : "설치"}
      </button>
    </div>
  );
}
