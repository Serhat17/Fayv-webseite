import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "./lib/i18n-config";

const LOCALE_COOKIE = "fayv-locale";

function detectLocale(req: NextRequest): string {
  // 1. Explicit cookie wins (user already chose)
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && (locales as readonly string[]).includes(cookie)) return cookie;

  // 2. Accept-Language negotiation
  const accept = req.headers.get("accept-language") || "";
  const preferred = accept
    .split(",")
    .map((entry) => entry.trim().split(";")[0].toLowerCase())
    .map((tag) => tag.split("-")[0]);

  for (const tag of preferred) {
    if ((locales as readonly string[]).includes(tag)) return tag;
  }

  return defaultLocale;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Already prefixed with a locale → continue
  const hasLocale = (locales as readonly string[]).some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLocale) return NextResponse.next();

  const detected = detectLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${detected}${pathname === "/" ? "" : pathname}`;

  const res = NextResponse.redirect(url);
  res.cookies.set(LOCALE_COOKIE, detected, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export const config = {
  // Skip API, _next, static assets, and files with extensions (favicon, og images)
  matcher: ["/((?!api|_next|admin|.*\\..*).*)"],
};
