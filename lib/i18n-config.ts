import { Locale } from "./i18n";

export const locales: readonly Locale[] = ["en", "de"] as const;
export const defaultLocale: Locale = "en";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fayv.app";

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function localePathFor(locale: Locale, path = "") {
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  return `/${locale}${trimmed ? `/${trimmed}` : ""}`;
}

export function absoluteUrl(locale: Locale, path = "") {
  return `${SITE_URL}${localePathFor(locale, path)}`;
}
