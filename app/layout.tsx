import { cookies } from "next/headers";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { defaultLocale, isValidLocale, SITE_URL } from "@/lib/i18n-config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read locale cookie set by middleware so SSR ships the correct lang attribute.
  // This is critical for SEO — Google reads the SSR lang to determine page language.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("fayv-locale")?.value;
  const lang = cookieLocale && isValidLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
