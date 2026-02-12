import "./globals.css";
import AppShell from "../components/AppShell";
import NotificationPoller from "../components/NotificationPoller";

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
        <NotificationPoller />
      </body>
    </html>
  );
}
