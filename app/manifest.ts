import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HADES FANAPP",
    short_name: "HADES",
    description: "하데스 팬앱",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#0b0b14",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
