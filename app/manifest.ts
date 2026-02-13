// app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const androidIconVersion = "android-v13"; // 캐시 갱신용 버전

  return {
    name: "HADES INFO",
    short_name: "HADES INFO",
    description: "하데스 팬앱",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      // ① 범용 아이콘 (any) — WebAPK 스플래시 + 브라우저 탭 등
      {
        src: `/icon-192?v=${androidIconVersion}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icon-512?v=${androidIconVersion}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // ② 런처 아이콘 — maskable (홈 화면 전용)
      {
        src: `/icon-192?v=${androidIconVersion}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `/icon-512?v=${androidIconVersion}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      // ③ Apple용
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
