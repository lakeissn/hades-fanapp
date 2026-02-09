export const metadata = {
  title: "Hades Fanapp",
  description: "Hades fanapp MVP",
};

const containerStyle = {
  minHeight: "100vh",
  backgroundColor: "#0f172a",
  color: "#e2e8f0",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const layoutStyle = {
  maxWidth: "960px",
  margin: "0 auto",
  padding: "40px 24px",
};

const headerStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  marginBottom: "32px",
};

const navLinkStyle = {
  padding: "8px 16px",
  borderRadius: "999px",
  border: "1px solid #334155",
  textDecoration: "none",
  color: "#e2e8f0",
  fontSize: "14px",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body style={containerStyle}>
        <div style={layoutStyle}>
          <header style={headerStyle}>
            <div>
              <p style={{ fontSize: "12px", letterSpacing: "0.25em", color: "#94a3b8" }}>
                Hades Fanapp MVP
              </p>
              <h1 style={{ fontSize: "28px", margin: "8px 0 0" }}>하데스 팬앱</h1>
            </div>
            <nav style={{ display: "flex", gap: "12px", fontSize: "14px" }}>
              <a href="/" style={navLinkStyle}>
                홈
              </a>
              <a href="/guides" style={navLinkStyle}>
                가이드
              </a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
