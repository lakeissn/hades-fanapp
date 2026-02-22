import "./globals.css";
import AppShell from "../components/AppShell";
import NotificationPoller from "../components/NotificationPoller";
import NotificationManager from "../components/NotificationManager";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "HADES INFO",
  description: "하데스 팬앱",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
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
    <html lang="ko" data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
              try {
                var stored = localStorage.getItem("hades_theme");
                var theme = stored === "light" || stored === "dark"
                  ? stored
                  : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
                document.documentElement.setAttribute("data-theme", theme);
                document.documentElement.style.backgroundColor = theme === "dark" ? "#0a0a0a" : "#f5f5f5";
                if (document.body) {
                  document.body.style.backgroundColor = theme === "dark" ? "#0a0a0a" : "#f5f5f5";
                }
              } catch (_) {}
            })();`,
          }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>

        {/* FCM 기반 백그라운드 푸시 */}
        <NotificationManager />

        {/* 클라이언트 폴링 알림 */}
        <NotificationPoller />

        {/* ✅ Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
