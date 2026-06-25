import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Locale, t } from "@/lib/i18n";
import { SITE_URL, absoluteUrl, isValidLocale, locales } from "@/lib/i18n-config";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isValidLocale(locale)) return {};

  const isGerman = locale === "de";

  const title = isGerman
    ? "FAYV — Dein KI-Stylist für täglich perfekte Outfits"
    : "FAYV — Your AI Stylist for Perfectly Curated Daily Outfits";

  const description = isGerman
    ? "FAYV ist die KI-gestützte Fashion-App: scannt deinen Kleiderschrank, schlägt Outfits nach Wetter und Style vor und verbindet dich mit einer Mode-Community. Jetzt auf die Warteliste."
    : "FAYV is the AI-powered fashion app that scans your wardrobe, suggests outfits based on weather and personal style, and connects you with a fashion community. Join the waitlist.";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: "%s — FAYV",
    },
    description,
    keywords: isGerman
      ? [
          "KI Fashion App",
          "AI Outfit Generator",
          "virtueller Kleiderschrank",
          "Outfit Planer",
          "Style App",
          "FAYV",
          "Mode KI",
          "Outfit Vorschläge",
          "Kleidung organisieren",
        ]
      : [
          "AI fashion app",
          "AI outfit generator",
          "virtual wardrobe app",
          "outfit planner",
          "style assistant",
          "FAYV",
          "AI stylist",
          "smart wardrobe",
          "what to wear app",
        ],
    authors: [{ name: "FAYV" }],
    creator: "FAYV",
    publisher: "FAYV",
    formatDetection: { email: false, telephone: false, address: false },
    alternates: {
      canonical: absoluteUrl(locale as Locale),
      languages: {
        en: absoluteUrl("en"),
        de: absoluteUrl("de"),
        "x-default": absoluteUrl("en"),
      },
    },
    openGraph: {
      type: "website",
      siteName: "FAYV",
      locale: isGerman ? "de_DE" : "en_US",
      url: absoluteUrl(locale as Locale),
      title,
      description,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "FAYV — Your Style. AI-Perfected.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
      creator: "@fayvapp",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: { url: "/apple-icon.png", sizes: "180x180" },
    },
  };
}

export default async function LocaleLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isValidLocale(locale)) notFound();

  const isGerman = locale === "de";

  // Structured data — Organization + SoftwareApplication + WebSite for rich SERP.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: "FAYV",
        url: SITE_URL,
        logo: `${SITE_URL}/icon-192.png`,
        sameAs: [
          "https://instagram.com/fayvapp",
          "https://tiktok.com/@fayvapp",
          "https://x.com/fayvapp",
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: "FAYV",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "iOS",
        description: isGerman
          ? "KI-gestützte Fashion-App mit virtuellem Kleiderschrank, Outfit-Generator und Style-Community."
          : "AI-powered fashion app with virtual wardrobe, outfit generator and style community.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#site`,
        url: SITE_URL,
        name: "FAYV",
        inLanguage: isGerman ? "de-DE" : "en-US",
        publisher: { "@id": `${SITE_URL}/#org` },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {props.children}
    </>
  );
}
