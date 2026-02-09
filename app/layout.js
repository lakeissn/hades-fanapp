export const metadata = {
  title: "Hades Fanapp",
  description: "Hades fanapp MVP",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
                Hades Fanapp MVP
              </p>
              <h1 className="text-3xl font-semibold">하데스 팬앱</h1>
            </div>
            <nav className="flex items-center gap-3 text-sm">
              <a
                className="rounded-full border border-slate-700 px-4 py-2 text-slate-200 transition hover:border-rose-400 hover:text-rose-200"
                href="/"
              >
                홈
              </a>
              <a
                className="rounded-full border border-slate-700 px-4 py-2 text-slate-200 transition hover:border-rose-400 hover:text-rose-200"
                href="/guides"
              >
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
