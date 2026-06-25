"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/i18n-config";

interface FAQProps {
  locale: Locale;
}

interface QA {
  q: string;
  a: string;
}

const FAQ_CONTENT: Record<Locale, { label: string; title: string; subtitle: string; items: QA[] }> = {
  en: {
    label: "FAQ",
    title: "Questions, answered.",
    subtitle: "Everything you need to know before joining the waitlist.",
    items: [
      {
        q: "When does FAYV launch?",
        a: "We're targeting a public iOS launch in Q3 2026. Waitlist members get early access weeks before everyone else and exclusive launch perks.",
      },
      {
        q: "How much will FAYV cost?",
        a: "FAYV will be free to use with all core features included. A premium tier with advanced AI styling, unlimited outfit history, and exclusive community features will be available as an optional subscription.",
      },
      {
        q: "Will it be on Android?",
        a: "We're launching on iOS first to nail the experience. Android is on the roadmap once we hit our iOS milestones — waitlist members will be first to know.",
      },
      {
        q: "How does the AI know my style?",
        a: "FAYV learns from a quick style onboarding (your favorite brands, colors, fit) and improves continuously based on what you actually wear and rate. The more you use it, the better it gets.",
      },
      {
        q: "Is my data private?",
        a: "Yes. Your wardrobe photos are stored encrypted and never shared without your consent. We don't sell data — full stop. Read our privacy policy for details.",
      },
      {
        q: "Do I have to upload every piece of clothing?",
        a: "No. Start with your favorites or just the items you wear most often — FAYV works with whatever you give it and adapts as you add more.",
      },
      {
        q: "Can I share outfits with friends?",
        a: "Absolutely. You can post outfits to the community, share to Instagram or TikTok with one tap, or send privately via direct message.",
      },
    ],
  },
  de: {
    label: "FAQ",
    title: "Fragen, beantwortet.",
    subtitle: "Alles was du vor dem Beitritt zur Warteliste wissen musst.",
    items: [
      {
        q: "Wann launcht FAYV?",
        a: "Wir planen den iOS-Launch für Q3 2026. Mitglieder der Warteliste erhalten Wochen vorher Zugriff und exklusive Launch-Vorteile.",
      },
      {
        q: "Was wird FAYV kosten?",
        a: "FAYV ist kostenlos mit allen Kernfunktionen. Ein Premium-Tier mit erweitertem KI-Styling, unbegrenzter Outfit-Historie und exklusiven Community-Features wird als optionales Abo verfügbar sein.",
      },
      {
        q: "Wird es Android geben?",
        a: "Wir launchen zuerst auf iOS, um das Erlebnis zu perfektionieren. Android ist auf der Roadmap — Wartelisten-Mitglieder erfahren es zuerst.",
      },
      {
        q: "Wie kennt die KI meinen Style?",
        a: "FAYV lernt durch ein kurzes Style-Onboarding (Lieblingsmarken, Farben, Passform) und verbessert sich kontinuierlich basierend auf dem was du wirklich trägst und bewertest. Je mehr du es nutzt, desto besser wird es.",
      },
      {
        q: "Sind meine Daten sicher?",
        a: "Ja. Deine Kleiderschrank-Fotos werden verschlüsselt gespeichert und niemals ohne deine Zustimmung geteilt. Wir verkaufen keine Daten — Punkt. Details in unserer Datenschutzerklärung.",
      },
      {
        q: "Muss ich jedes Kleidungsstück hochladen?",
        a: "Nein. Starte mit deinen Favoriten oder den Teilen die du am häufigsten trägst — FAYV funktioniert mit dem was du gibst und passt sich an, wenn du mehr hinzufügst.",
      },
      {
        q: "Kann ich Outfits mit Freunden teilen?",
        a: "Absolut. Du kannst Outfits in der Community posten, mit einem Tap auf Instagram oder TikTok teilen oder per Direktnachricht privat versenden.",
      },
    ],
  },
};

export function FAQ({ locale }: FAQProps) {
  const content = FAQ_CONTENT[locale];
  const [open, setOpen] = useState<number | null>(0);

  // FAQPage schema for rich SERP snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/${locale}/#faq`,
    mainEntity: content.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section id="faq" className="relative py-36 bg-background scroll-mt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="site-container">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-accent" />
              <span className="text-[11px] font-medium tracking-[0.3em] text-muted uppercase">
                {content.label}
              </span>
            </div>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium text-foreground leading-[1.05] tracking-[-0.01em] mb-4">
              {content.title}
            </h2>
            <p className="text-base md:text-lg text-muted leading-relaxed">{content.subtitle}</p>
          </div>

          {/* Items */}
          <div className="divide-y divide-card-border border-y border-card-border">
            {content.items.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-6 py-6 text-left group"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                  >
                    <span className="font-serif text-lg md:text-xl text-foreground group-hover:text-accent transition-colors">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 flex-shrink-0 text-muted transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-accent" : ""
                      }`}
                    />
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    className={`grid transition-all duration-300 ${
                      isOpen ? "grid-rows-[1fr] opacity-100 pb-6" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm md:text-base text-muted leading-relaxed max-w-2xl">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
