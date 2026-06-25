"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "./ui/ThemeToggle";
import { LanguageToggle } from "./ui/LanguageToggle";
import { Locale } from "@/lib/i18n";
import { Menu, X } from "lucide-react";

interface NavbarProps {
  locale: Locale;
  translations: {
    features: string;
    howItWorks: string;
    testimonials: string;
    joinWaitlist: string;
  };
}

export function Navbar({ locale, translations: t }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: t.features },
    { href: "#testimonials", label: t.testimonials },
    { href: "#faq", label: locale === "de" ? "FAQ" : "FAQ" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass border-b border-nav-border py-4" : "bg-transparent py-6"
      }`}
    >
      <div className="site-container flex items-center justify-between">
        {/* Logo */}
        <a href={`/${locale}`} className="flex items-center gap-2" aria-label="FAYV — Home">
          <span className="font-serif text-xl font-medium text-foreground tracking-[0.05em]">FAYV</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] text-muted hover:text-foreground transition-colors duration-300 tracking-wide"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-4">
          <LanguageToggle locale={locale} />
          <ThemeToggle />
          <a
            href="#waitlist"
            className="ml-3 px-6 py-2.5 bg-foreground text-background text-[11px] font-medium tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
          >
            {t.joinWaitlist}
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageToggle locale={locale} />
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-foreground"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-nav-border mt-2">
          <div className="px-6 py-8 flex flex-col gap-5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-muted hover:text-foreground transition-colors py-1"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#waitlist"
              onClick={() => setMobileOpen(false)}
              className="mt-2 px-6 py-3.5 bg-foreground text-background text-[11px] font-medium tracking-[0.15em] uppercase text-center hover:opacity-90 transition-opacity"
            >
              {t.joinWaitlist}
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
