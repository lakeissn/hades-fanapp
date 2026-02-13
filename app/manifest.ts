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
  {
    src: "/icon-192",
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/icon-512",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/icon-192",
    sizes: "192x192",
    type: "image/png",
    purpose: "maskable",
  },
  {
    src: "/icon-512",
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
