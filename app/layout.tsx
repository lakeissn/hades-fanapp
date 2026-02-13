import "./globals.css";
import AppShell from "../components/AppShell";
import NotificationPoller from "../components/NotificationPoller";
import NotificationManager from "../components/NotificationManager";
import StartupOverlay from "../components/StartupOverlay";

export const metadata = {
  title: "HADES INFO",
  description: "하데스 팬앱",
  themeColor: "#000000",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-512",
    shortcut: "/icon-512",
    apple: "/apple-icon.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* (FIX #7) viewport-fit=cover로 iPhone 노치/다이나믹 아일랜드 대응 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        {/*
          ── CSS-first splash ──
          WebAPK 시스템 스플래시 → 브라우저 첫 paint 사이 갭을 없애기 위해
          인라인 <style>로 즉시 검정 배경 보장.
          #__splash는 아래 body에 raw HTML로 삽입됨.
        */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { background: #000 !important; }
              #__splash {
                position: fixed; inset: 0; z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                background: #000; pointer-events: none;
                /* fade-out은 JS가 .splash-fade 클래스를 추가하면 작동 */
                opacity: 1; transition: opacity 0.35s ease-out;
              }
              #__splash.splash-fade { opacity: 0; }
              #__splash img {
                width: clamp(240px, 70vw, 520px);
                max-height: 44vh; height: auto;
                object-fit: contain; display: block;
                border: none; box-shadow: none;
                background: transparent; padding: 0;
              }
            `,
          }}
        />
      </head>
      {/*
        body에 inline background: #000 → CSS 파일 로드 전에도 검정 배경 보장.
        WebAPK 스플래시(#000) → 우리 HTML 첫 paint(#000) 전환이 무색하게 됨.
      */}
      <body style={{ background: "#000" }}>
        {/*
          ── Raw HTML splash overlay ──
          서버에서 렌더링되어 HTML에 포함 → 브라우저 첫 paint에서 바로 표시.
          React 하이드레이션을 기다리지 않으므로 WebAPK 스플래시 직후 즉시 보임.
          StartupOverlay 컴포넌트가 하이드레이션 후 fade-out + 제거를 담당.
        */}
        <div id="__splash" aria-hidden="true">
          <img
            src="/icons/splash_logo.png"
            alt=""
            fetchPriority="high"
          />
        </div>

        {/* StartupOverlay: 하이드레이션 후 #__splash를 fade-out → 제거 */}
        <StartupOverlay />
        <AppShell>{children}</AppShell>
        {/* FCM 기반 백그라운드 푸시 (서버 발송) */}
        <NotificationManager />
        {/* 기존 폴링 기반 포그라운드 알림 (클라이언트 폴링) - 호환성 유지 */}
        <NotificationPoller />
      </body>
    </html>
  );
}
