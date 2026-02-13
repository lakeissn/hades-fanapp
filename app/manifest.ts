import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const androidIconVersion = "android-v11";

  return {
    // Zero-width space: Chrome/WebAPK에서 빈 문자열보다 라벨 렌더링 억제에 효과적
    name: "\u200B",
    short_name: "\u200B",
    description: "하데스 팬앱",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      // ① 스플래시용 아이콘 — WebAPK가 가장 큰 "any" 아이콘을 스플래시에 사용
      {
        src: "/icons/splash_logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // ② 런처 아이콘 — 홈 화면에서만 사용 (maskable로 분리하면 스플래시에 쓰이지 않음)
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
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
