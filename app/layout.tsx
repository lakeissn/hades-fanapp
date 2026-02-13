diff --git a/app/layout.tsx b/app/layout.tsx
index 915db9381001d5e2d59feb3499f488f0f4f5c292..634d840951ee6be6a3c99fd6a7a434db487c087e 100644
--- a/app/layout.tsx
+++ b/app/layout.tsx
@@ -1,47 +1,46 @@
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
-    icon: "/icons/hades_helper.png",
-    apple: "/icons/hades_helper.png",
+    icon: "/icon",
+    apple: "/apple-icon",
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
         <AppShell>{children}</AppShell>
         {/* FCM 기반 백그라운드 푸시 (서버 발송) */}
         <NotificationManager />
         {/* 기존 폴링 기반 포그라운드 알림 (클라이언트 폴링) - 호환성 유지 */}
         <NotificationPoller />
       </body>
     </html>
   );
 }
