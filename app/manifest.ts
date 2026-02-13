import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const androidIconVersion = "android-v10";

  return {
    name: "",
    short_name: "",
    description: "하데스 팬앱",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icons/splash_logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
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
