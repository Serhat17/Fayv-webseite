"use client";

import { Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n-config";

interface LanguageToggleProps {
  locale: Locale;
}

/**
 * URL-based language switch — preserves the current path and swaps the locale
 * prefix. This makes the language choice indexable, shareable, and persists
 * across reloads via the cookie set by the middleware.
 */
export function LanguageToggle({ locale }: LanguageToggleProps) {
  const pathname = usePathname() || "/";
  const otherLocale: Locale = locale === "en" ? "de" : "en";

  // Replace the leading locale segment in the current pathname.
  const localeRegex = new RegExp(`^/(${locales.join("|")})(?=/|$)`);
  const nextPath = pathname.replace(localeRegex, `/${otherLocale}`) || `/${otherLocale}`;

  return (
    <Link
      href={nextPath}
      hrefLang={otherLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-card-border bg-surface hover:bg-surface-hover transition-all duration-300 text-xs font-medium text-muted hover:text-foreground"
      aria-label={otherLocale === "de" ? "Auf Deutsch wechseln" : "Switch to English"}
      // The middleware updates the locale cookie on the next request — no client state needed.
    >
      <Globe className="w-3.5 h-3.5" />
      <span className="uppercase">{otherLocale}</span>
    </Link>
  );
}
