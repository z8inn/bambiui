import type { MetadataRoute } from "next";
import { brandColor } from "./studio/brand";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "bambiui",
    short_name: "bambiui",
    description:
      "Create your own design system. Customize global and component tokens with a live Base UI preview.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf8",
    theme_color: brandColor,
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
      {
        src: "/icon-maskable-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}
