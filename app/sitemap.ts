import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.anshrajput.com", lastModified: new Date("2026-11-14"), changeFrequency: "monthly", priority: 1 },
    { url: "https://www.anshrajput.com/resume", lastModified: new Date("2026-11-14"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.anshrajput.com/privacy", lastModified: new Date("2026-11-14"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
