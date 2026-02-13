import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const androidIconVersion = "android-v10";

  return {
    name: "",
    short_name: "HADES INFO",
    description: "하데스에 대한 정보를 빠르게 받아보세요",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icons/splash_logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: `/icon-512?v=${androidIconVersion}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
