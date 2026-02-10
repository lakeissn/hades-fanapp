import "./globals.css";
import AppShell from "../components/AppShell";

export const metadata = {
  title: "Hades Fanapp",
  description: "Hades fanapp MVP",
  themeColor: "#0b0b14",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
