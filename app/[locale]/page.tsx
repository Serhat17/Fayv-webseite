import { notFound } from "next/navigation";
import { Locale, t } from "@/lib/i18n";
import { isValidLocale } from "@/lib/i18n-config";
import { Navbar } from "@/components/Navbar";
import { AppShowcase } from "@/components/AppShowcase";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { WaitlistSection } from "@/components/WaitlistSection";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";

// Pre-render at build time for both locales
export const dynamic = "force-static";

export default async function Home(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isValidLocale(locale)) notFound();

  const i = t(locale as Locale);

  return (
    <ThemeProvider>
      <main className="flex-1">
        <Navbar locale={locale as Locale} translations={i.nav} />
        <AppShowcase
          locale={locale as Locale}
          heroTranslations={i.hero}
          featureTranslations={i.features}
        />
        <Testimonials translations={i.testimonials} />
        <FAQ locale={locale as Locale} />
        <WaitlistSection locale={locale as Locale} translations={i.waitlist} />
        <Footer translations={i.footer} />
      </main>
    </ThemeProvider>
  );
}
