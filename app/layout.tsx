import "./globals.css";
import AppShell from "../components/AppShell";
import NotificationPoller from "../components/NotificationPoller";
import NotificationManager from "../components/NotificationManager";

export const metadata = {
  title: "HADES INFO",
  description: "하데스 팬앱",
  themeColor: "#0a0a0a",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/hades_helper.png",
    apple: "/icons/hades_helper.png",
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
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
        {/* FCM 기반 백그라운드 푸시 (서버 발송) */}
        <NotificationManager />
        {/* 기존 폴링 기반 포그라운드 알림 (클라이언트 폴링) - 호환성 유지 */}
        <NotificationPoller />
      </body>
    </html>
  );
}
