"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";
import { Locale } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/use-reduced-motion";

interface WaitlistProps {
  locale: Locale;
  translations: {
    label: string;
    title: string;
    description: string;
    placeholder: string;
    cta: string;
    privacy: string;
    success: string;
  };
}

type Status = "idle" | "loading" | "success" | "already" | "error";

const errorMessages: Record<Locale, Record<string, string>> = {
  en: {
    invalid_email: "Please enter a valid email address.",
    disposable_email: "Disposable email addresses are not allowed.",
    internal_error: "Something went wrong. Please try again.",
    network: "Connection failed. Please try again.",
    already: "You're already on the waitlist — see you at launch!",
  },
  de: {
    invalid_email: "Bitte gib eine gültige E-Mail-Adresse ein.",
    disposable_email: "Wegwerf-E-Mails sind nicht erlaubt.",
    internal_error: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    network: "Verbindung fehlgeschlagen. Bitte versuche es erneut.",
    already: "Du bist bereits auf der Warteliste — bis zum Launch!",
  },
};

export function WaitlistSection({ locale, translations: t }: WaitlistProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();

  // Live waitlist counter
  useEffect(() => {
    let cancelled = false;
    fetch("/api/waitlist", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && typeof d?.count === "number") setCount(d.count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Lazy-load GSAP only when motion is allowed
  useEffect(() => {
    if (reducedMotion) return;
    let revert: (() => void) | undefined;

    (async () => {
      const { default: gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".waitlist-content",
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: ".waitlist-content", start: "top 80%" },
          }
        );
      }, sectionRef);

      revert = () => ctx.revert();
    })();

    return () => {
      revert?.();
    };
  }, [reducedMotion]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setStatus("error");
      setErrorMsg(errorMessages[locale].invalid_email);
      return;
    }

    setStatus("loading");
    setErrorMsg(null);

    // Capture UTM params if present
    const params = new URLSearchParams(window.location.search);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          locale,
          referrer: document.referrer || null,
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.status === "already_subscribed") {
          setStatus("already");
        } else {
          setStatus("success");
          // Optimistically bump the visible counter
          setCount((c) => (c == null ? c : c + 1));
        }
        return;
      }

      const code = data.error || "internal_error";
      setStatus("error");
      setErrorMsg(errorMessages[locale][code] || errorMessages[locale].internal_error);
    } catch {
      setStatus("error");
      setErrorMsg(errorMessages[locale].network);
    }
  }

  const successLabel = status === "already" ? errorMessages[locale].already : t.success;

  return (
    <section
      ref={sectionRef}
      id="waitlist"
      className="relative bg-foreground text-background overflow-hidden scroll-mt-24"
    >
      {/* Subtle diagonal accent line */}
      <div className="absolute top-0 right-0 w-px h-32 bg-accent/40" />

      <div className="site-container py-36">
        <div className="waitlist-content max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-8 h-px bg-accent" />
            <span className="text-[11px] font-medium tracking-[0.3em] text-background/50 uppercase">
              {t.label}
            </span>
            <div className="w-8 h-px bg-accent" />
          </div>

          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium text-background leading-[1.05] tracking-[-0.01em] mb-6">
            {t.title}
          </h2>

          <p className="text-background/50 text-base md:text-lg leading-relaxed mb-12 max-w-md mx-auto">
            {t.description}
          </p>

          {status === "success" || status === "already" ? (
            <div className="flex items-center justify-center gap-4 py-6" role="status" aria-live="polite">
              <div className="w-10 h-10 rounded-full border border-background/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-accent" />
              </div>
              <p className="text-lg font-medium text-background">{successLabel}</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto"
              noValidate
            >
              <label htmlFor="waitlist-email" className="sr-only">
                {t.placeholder}
              </label>
              <input
                id="waitlist-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder={t.placeholder}
                required
                autoComplete="email"
                inputMode="email"
                aria-invalid={status === "error"}
                aria-describedby={status === "error" ? "waitlist-error" : undefined}
                className="flex-1 w-full px-6 py-4 bg-transparent border border-background/20 text-background text-sm placeholder:text-background/30 focus:outline-none focus:border-background/50 transition-all duration-300"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="group inline-flex items-center gap-2 px-8 py-4 bg-background text-foreground text-sm font-medium tracking-wider uppercase whitespace-nowrap hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{locale === "de" ? "Sende..." : "Sending..."}</span>
                  </>
                ) : (
                  <>
                    {t.cta}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          )}

          {status === "error" && errorMsg && (
            <p
              id="waitlist-error"
              role="alert"
              className="mt-4 inline-flex items-center gap-2 text-sm text-accent"
            >
              <AlertCircle className="w-4 h-4" />
              {errorMsg}
            </p>
          )}

          <p className="text-[11px] text-background/30 mt-8">{t.privacy}</p>

          {/* Live counter — only render once we have a real number */}
          {typeof count === "number" && count > 0 && (
            <p className="text-xs text-background/40 mt-4">
              {locale === "de"
                ? `${count.toLocaleString("de-DE")} Style-Enthusiasten warten bereits`
                : `${count.toLocaleString("en-US")} style enthusiasts already on the list`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
