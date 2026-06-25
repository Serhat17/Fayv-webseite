import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl, locales } from "@/lib/i18n-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // Homepage entries — one per locale, each with alternates for hreflang.
  const homeEntries: MetadataRoute.Sitemap = locales.map((locale) => ({
    url: absoluteUrl(locale),
    lastModified,
    changeFrequency: "weekly",
    priority: locale === "en" ? 1.0 : 0.9,
    alternates: {
      languages: {
        en: absoluteUrl("en"),
        de: absoluteUrl("de"),
        "x-default": absoluteUrl("en"),
      },
    },
  }));

  // Root URL (will redirect, but include for completeness)
  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...homeEntries,
  ];
}
