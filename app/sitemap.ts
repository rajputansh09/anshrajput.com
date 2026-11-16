import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://anshrajput.com", lastModified: new Date("2026-11-14"), changeFrequency: "monthly", priority: 1 },
    { url: "https://anshrajput.com/resume", lastModified: new Date("2026-11-14"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://anshrajput.com/privacy", lastModified: new Date("2026-11-14"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
