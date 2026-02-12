import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HADES INFO",
    short_name: "HADES INFO",
    description: "하데스 팬앱",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icons/hades_helper.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/hades_helper.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/hades_helper.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
