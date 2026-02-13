import "./globals.css";
import AppShell from "../components/AppShell";
import NotificationPoller from "../components/NotificationPoller";
import NotificationManager from "../components/NotificationManager";
import StartupSplash from "../components/StartupSplash";

export const metadata = {
  title: "HADES INFO",
  description: "데스 팬앱",
  themeColor: "#0a0a0a",
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
      </head>
      <body>
        <StartupSplash />
        <AppShell>{children}</AppShell>
        {/* FCM 기반 백그라운드 푸시 (서버 발송) */}
        <NotificationManager />
        {/* 기존 폴링 기반 포그라운드 알림 (클라이언트 폴링) - 호환성 유지 */}
        <NotificationPoller />
      </body>
    </html>
  );
}
