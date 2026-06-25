"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { PhoneMockup } from "./ui/PhoneMockup";
import { ArrowRight } from "lucide-react";

interface HeroProps {
  translations: {
    tagline: string;
    title1: string;
    title2: string;
    description: string;
    cta: string;
    users: string;
  };
}

export function Hero({ translations: t }: HeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.fromTo(
        ".hero-tagline",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.3 }
      )
        .fromTo(
          ".hero-title-line",
          { opacity: 0, y: 60 },
          { opacity: 1, y: 0, duration: 1, stagger: 0.12 },
          "-=0.3"
        )
        .fromTo(
          ".hero-desc",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          "-=0.5"
        )
        .fromTo(
          ".hero-cta",
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5 },
          "-=0.3"
        )
        .fromTo(
          ".hero-meta",
          { opacity: 0 },
          { opacity: 1, duration: 0.5 },
          "-=0.2"
        );

      // Phone entrance
      gsap.fromTo(
        phoneRef.current,
        { opacity: 0, y: 80 },
        {
          opacity: 1,
          y: 0,
          duration: 1.4,
          delay: 0.6,
          ease: "power3.out",
        }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center bg-background overflow-hidden"
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 w-full site-container">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center min-h-screen py-32">
          {/* Text content */}
          <div className="max-w-xl pt-20 lg:pt-0">
            {/* Tagline */}
            <div className="hero-tagline flex items-center gap-3 mb-10 opacity-0">
              <div className="w-8 h-px bg-accent" />
              <span className="text-[11px] font-medium tracking-[0.3em] text-muted uppercase">
                {t.tagline}
              </span>
            </div>

            {/* Editorial headline */}
            <h1 className="mb-10">
              <span className="hero-title-line block font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-medium text-foreground leading-[1.0] tracking-[-0.02em] opacity-0">
                {t.title1}
              </span>
              <span className="hero-title-line block font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-medium italic text-foreground/80 leading-[1.0] tracking-[-0.02em] mt-2 opacity-0">
                {t.title2}
              </span>
            </h1>

            {/* Description */}
            <p className="hero-desc text-base md:text-lg text-muted leading-[1.8] mb-10 max-w-md opacity-0">
              {t.description}
            </p>

            {/* CTA */}
            <div className="hero-cta flex items-center gap-6 opacity-0">
              <a
                href="#waitlist"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background text-sm font-medium tracking-wider uppercase rounded-none hover:opacity-90 transition-opacity"
              >
                {t.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <div className="hidden sm:block w-px h-10 bg-card-border" />
              <span className="hidden sm:block text-xs text-muted">
                <strong className="text-foreground font-semibold">2,400+</strong>{" "}
                {t.users}
              </span>
            </div>

            {/* Editorial accent line */}
            <div className="hero-meta mt-16 flex items-center gap-4 opacity-0">
              <div className="w-12 h-px bg-accent" />
              <span className="text-[10px] tracking-[0.25em] text-muted uppercase">
                Available 2026
              </span>
            </div>
          </div>

          {/* Phone mockup */}
          <div
            ref={phoneRef}
            className="hidden lg:flex justify-center items-center opacity-0"
          >
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
