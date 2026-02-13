// app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const androidIconVersion = "android-v12"; // 버전 올려서 캐시 갱신

  return {
    // ✅ 런처 이름 정상 복원
    name: "HADES INFO",
    short_name: "HADES INFO",
    description: "하데스 팬앱",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      // ① 스플래시 전용 — 불투명 검정 배경 + 큰 로고 (프레이밍 방지)
      //    WebAPK는 가장 큰 "any" 아이콘을 스플래시에 사용
      {
        src: `/splash-icon-512?v=${androidIconVersion}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // ② 런처 아이콘 — maskable (홈 화면 전용, 스플래시에 쓰이지 않음)
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
