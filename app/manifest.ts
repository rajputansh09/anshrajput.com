import type { MetadataRoute } from "next";

// Web app manifest so the crest shows up when someone adds the site to their home screen
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ansh Rajput",
    short_name: "Ansh Rajput",
    description: "Software engineer building platforms that real businesses run on.",
    start_url: "/",
    display: "browser",
    background_color: "#07110c",
    theme_color: "#07110c",
    icons: [
      { src: "/icons/crest-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/crest-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/crest.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
