import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Companion — Career & Lifestyle AI",
    short_name: "Companion",
    description:
      "Job search with CV tailoring, recommendations, brain games, live football, and a daily tech briefing.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d15",
    theme_color: "#0b0d15",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
