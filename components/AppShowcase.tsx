"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sparkles, Shirt, Users, CloudSun, ArrowRight } from "lucide-react";
import { Locale } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

interface ShowcaseScreen {
  title: string;
  description: string;
  icon: string;
}

interface AppShowcaseProps {
  locale: Locale;
  heroTranslations: {
    tagline: string;
    title1: string;
    title2: string;
    description: string;
    cta: string;
    users: string;
  };
  featureTranslations: {
    label: string;
    title: string;
    subtitle: string;
    items: readonly ShowcaseScreen[];
  };
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  shirt: Shirt,
  users: Users,
  "cloud-sun": CloudSun,
};

// Phone screen content for each feature
function PhoneScreen({ index, active }: { index: number; active: boolean }) {
  const screens = [
    // AI Outfit Generator
    <div key={0} className="flex flex-col h-full px-4 pt-14">
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <p className="text-[8px] text-white/50 uppercase tracking-widest">AI Stylist</p>
          <p className="text-[13px] text-white font-semibold mt-0.5">Today&apos;s Pick</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white/60" />
        </div>
      </div>
      <div className="flex-1 px-1">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-3">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {["👕", "👖", "👟"].map((e, i) => (
              <div key={i} className="aspect-square rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">{e}</div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white/40">Style Score</span>
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1 rounded-full bg-white/10">
                <div className="h-full w-[92%] rounded-full bg-accent" />
              </div>
              <span className="text-[9px] text-white/60 font-medium">92%</span>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className="text-[9px] text-white/40 mb-2">Why this works</p>
          <p className="text-[10px] text-white/70 leading-relaxed">Clean lines meet casual comfort. The neutral palette keeps it versatile.</p>
        </div>
      </div>
    </div>,

    // Virtual Wardrobe
    <div key={1} className="flex flex-col h-full px-4 pt-14">
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <p className="text-[8px] text-white/50 uppercase tracking-widest">Wardrobe</p>
          <p className="text-[13px] text-white font-semibold mt-0.5">Your Closet</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
          <Shirt className="w-3.5 h-3.5 text-white/60" />
        </div>
      </div>
      <div className="flex-1 px-1">
        <div className="flex gap-2 mb-3">
          {["All", "Tops", "Pants", "Shoes"].map((cat, i) => (
            <div key={i} className={`px-3 py-1.5 rounded-full text-[9px] ${i === 0 ? "bg-white text-black font-medium" : "bg-white/5 text-white/50 border border-white/10"}`}>
              {cat}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10" />
          ))}
        </div>
      </div>
    </div>,

    // Style Community
    <div key={2} className="flex flex-col h-full px-4 pt-14">
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <p className="text-[8px] text-white/50 uppercase tracking-widest">Community</p>
          <p className="text-[13px] text-white font-semibold mt-0.5">Trending Now</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
          <Users className="w-3.5 h-3.5 text-white/60" />
        </div>
      </div>
      <div className="flex-1 px-1 space-y-2.5">
        {[
          { name: "Sophia M.", likes: "234" },
          { name: "Liam K.", likes: "189" },
          { name: "Emma R.", likes: "312" },
        ].map((post, i) => (
          <div key={i} className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-white/10" />
              <span className="text-[10px] text-white/70 font-medium">{post.name}</span>
            </div>
            <div className="h-20 rounded-xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 mb-2" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-white/40">♥ {post.likes}</span>
              <span className="text-[9px] text-white/40">💬 12</span>
            </div>
          </div>
        ))}
      </div>
    </div>,

    // Weather-Smart
    <div key={3} className="flex flex-col h-full px-4 pt-14">
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <p className="text-[8px] text-white/50 uppercase tracking-widest">Weather</p>
          <p className="text-[13px] text-white font-semibold mt-0.5">Smart Picks</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
          <CloudSun className="w-3.5 h-3.5 text-white/60" />
        </div>
      </div>
      <div className="flex-1 px-1">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">☀️</span>
            <div>
              <p className="text-[14px] text-white font-semibold">22°C</p>
              <p className="text-[9px] text-white/40">Sunny, light breeze</p>
            </div>
          </div>
          <div className="w-full h-px bg-white/10 mb-3" />
          <p className="text-[9px] text-white/50 mb-2">Recommended layers</p>
          <div className="flex gap-2">
            {["Light T-Shirt", "Shorts", "Sneakers"].map((item, i) => (
              <div key={i} className="px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[8px] text-white/60">{item}</div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className="text-[9px] text-white/40 mb-2">Weekly forecast</p>
          <div className="flex justify-between">
            {["Mo", "Di", "Mi", "Do", "Fr"].map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[8px] text-white/30">{day}</span>
                <span className="text-[11px]">{["☀️", "⛅", "☀️", "🌧️", "☀️"][i]}</span>
                <span className="text-[8px] text-white/50">{[22, 19, 24, 16, 21][i]}°</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
  ];

  return (
    <div
      className={`absolute inset-0 transition-all duration-500 ${
        active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      {screens[index]}
    </div>
  );
}

export function AppShowcase({ locale, heroTranslations: hero, featureTranslations: features }: AppShowcaseProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  // Map panel index to phone screen: hero(0)→screen0, feature0(1)→screen0, feature1(2)→screen1, etc.
  const screenIndex = Math.max(0, activeIndex - 1);

  // Track active panel with IntersectionObserver (reliable across devices/browsers)
  useEffect(() => {
    const panels = document.querySelectorAll(".showcase-panel");
    if (!panels.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.panelIndex);
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      // Fires when an element crosses the middle of the viewport
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    panels.forEach((panel) => observer.observe(panel));
    return () => observer.disconnect();
  }, []);

  // GSAP scroll animations (desktop only, purely visual — no state tracking here)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect prefers-reduced-motion — show everything in its resting state
    // and skip all scroll-driven animations. We still rely on the
    // IntersectionObserver above for content tracking.
    if (reducedMotion) {
      const panels = sectionRef.current?.querySelectorAll<HTMLElement>(".panel-content");
      panels?.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
        el.style.filter = "none";
      });
      return;
    }

    const mm = gsap.matchMedia();

    // === MOBILE animations ===
    mm.add("(max-width: 1023px)", () => {
      const ctx = gsap.context(() => {
        // Animate hero text on mobile — use gsap.from() so elements are visible by default
        gsap.from(".mobile-hero-text", {
          opacity: 0,
          y: 30,
          duration: 0.8,
          delay: 0.2,
          ease: "power3.out",
          clearProps: "opacity,transform",
        });

        gsap.from(".mobile-hero-phone", {
          opacity: 0,
          y: 50,
          duration: 1,
          delay: 0.5,
          ease: "power3.out",
          clearProps: "opacity,transform",
        });

        gsap.utils.toArray<HTMLElement>(".mobile-feature-card").forEach((card) => {
          gsap.from(card, {
            opacity: 0,
            y: 40,
            duration: 0.7,
            ease: "power3.out",
            clearProps: "opacity,transform",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
            },
          });
        });
      }, sectionRef);

      return () => ctx.revert();
    });

    // === DESKTOP animations (scroll effects only) ===
    mm.add("(min-width: 1024px)", () => {
      const ctx = gsap.context(() => {
        const panels = gsap.utils.toArray<HTMLElement>(".showcase-panel");

        panels.forEach((panel, i) => {
          const content = panel.querySelector(".panel-content") as HTMLElement;
          if (!content) return;

          content.style.willChange = "transform, opacity, filter";

          if (i === 0) {
            gsap.set(content, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" });

            ScrollTrigger.create({
              trigger: panel,
              start: "top top",
              end: "bottom 50%",
              scrub: true,
              onUpdate: (self) => {
                const p = self.progress;
                gsap.set(content, { opacity: 1 - p, y: -100 * p, scale: 1 + 0.12 * p });
                content.style.filter = `blur(${16 * p}px)`;
              },
            });
          } else {
            gsap.set(content, { opacity: 0, y: 60, scale: 0.96, filter: "blur(8px)" });

            ScrollTrigger.create({
              trigger: panel,
              start: "top 85%",
              end: "top 30%",
              scrub: true,
              onUpdate: (self) => {
                const p = self.progress;
                gsap.set(content, { opacity: p, y: 60 * (1 - p), scale: 0.96 + 0.04 * p });
                content.style.filter = `blur(${8 * (1 - p)}px)`;
              },
            });

            if (i < panels.length - 1) {
              ScrollTrigger.create({
                trigger: panel,
                start: "bottom 80%",
                end: "bottom 15%",
                scrub: true,
                onUpdate: (self) => {
                  const p = self.progress;
                  gsap.set(content, { opacity: 1 - p, y: -80 * p, scale: 1 + 0.1 * p });
                  content.style.filter = `blur(${14 * p}px)`;
                },
              });
            }
          }
        });
      }, sectionRef);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, [reducedMotion]);

  // Small reusable phone component for mobile
  const MiniPhone = ({ featureIndex, className = "" }: { featureIndex: number; className?: string }) => (
    <div className={`relative w-[220px] h-[460px] rounded-[2.4rem] border-[5px] border-[#2a2a2a] bg-black shadow-2xl shadow-black/20 overflow-hidden ${className}`}>
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[72px] h-[22px] bg-black rounded-full z-20" />
      <div className="relative w-full h-full rounded-[1.9rem] bg-gradient-to-b from-[#0a0a0a] to-[#111] overflow-hidden">
        <PhoneScreen index={featureIndex} active={true} />
      </div>
      <div className="absolute inset-0 rounded-[1.9rem] bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
    </div>
  );

  return (
    <section ref={sectionRef} id="features" className="relative bg-background">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 site-container-wide">
        {/* ========== MOBILE LAYOUT ========== */}
        <div className="lg:hidden">
          {/* Mobile Hero */}
          <div className="min-h-screen flex flex-col justify-center px-4 pt-24 pb-8">
            <div className="mobile-hero-text">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-px bg-accent" />
                <span className="text-[11px] font-medium tracking-[0.3em] text-muted uppercase">
                  {hero.tagline}
                </span>
              </div>

              <h1 className="mb-8">
                <span className="block font-serif text-4xl sm:text-5xl font-medium text-foreground leading-[1.05] tracking-[-0.02em]">
                  {hero.title1}
                </span>
                <span className="block font-serif text-4xl sm:text-5xl font-medium italic text-foreground/80 leading-[1.05] tracking-[-0.02em] mt-1">
                  {hero.title2}
                </span>
              </h1>

              <p className="text-base text-muted leading-[1.8] mb-8 max-w-sm">
                {hero.description}
              </p>

              <a
                href="#waitlist"
                className="group inline-flex items-center gap-3 px-7 py-3.5 bg-foreground text-background text-sm font-medium tracking-wider uppercase hover:opacity-90 transition-opacity"
              >
                {hero.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>

              <div className="mt-6 flex items-center gap-3">
                <span className="text-xs text-muted">
                  <strong className="text-foreground font-semibold">2,400+</strong>{" "}
                  {hero.users}
                </span>
              </div>
            </div>

            {/* Mobile Hero Phone */}
            <div className="mobile-hero-phone flex justify-center mt-12">
              <MiniPhone featureIndex={0} />
            </div>
          </div>

          {/* Mobile Features Section Label */}
          <div className="px-4 pt-16 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-accent" />
              <span className="text-[11px] font-medium tracking-[0.3em] text-muted uppercase">
                {features.label}
              </span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-foreground leading-[1.1] tracking-[-0.01em]">
              {features.title}
            </h2>
          </div>

          {/* Mobile Feature Cards */}
          <div className="space-y-6 px-4 pb-20">
            {features.items.map((item, i) => {
              const Icon = iconMap[item.icon] || Sparkles;
              return (
                <div
                  key={i}
                  className="mobile-feature-card bg-surface/50 border border-card-border rounded-2xl overflow-hidden"
                >
                  {/* Feature content */}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-surface border border-card-border flex items-center justify-center">
                        <Icon className="w-4 h-4 text-foreground" />
                      </div>
                      <span className="text-[10px] tracking-[0.2em] text-muted uppercase font-medium">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl sm:text-3xl font-medium text-foreground mb-3 tracking-[-0.01em]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted leading-[1.7]">
                      {item.description}
                    </p>
                  </div>

                  {/* Inline phone preview */}
                  <div className="flex justify-center pb-6 pt-2">
                    <MiniPhone featureIndex={i} className="!w-[180px] !h-[380px] !rounded-[2rem] !border-[4px]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========== DESKTOP LAYOUT ========== */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_380px] gap-12 lg:gap-20">
          {/* Left: Scrolling panels */}
          <div>
            {/* Panel 0 — Hero */}
            <div className="showcase-panel min-h-screen flex items-center" data-panel-index="0">
              <div className="panel-content max-w-xl pt-32">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-8 h-px bg-accent" />
                  <span className="text-[11px] font-medium tracking-[0.3em] text-muted uppercase">
                    {hero.tagline}
                  </span>
                </div>

                <h1 className="mb-10">
                  <span className="block font-serif text-7xl lg:text-[5.5rem] font-medium text-foreground leading-[1.0] tracking-[-0.02em]">
                    {hero.title1}
                  </span>
                  <span className="block font-serif text-7xl lg:text-[5.5rem] font-medium italic text-foreground/80 leading-[1.0] tracking-[-0.02em] mt-2">
                    {hero.title2}
                  </span>
                </h1>

                <p className="text-lg text-muted leading-[1.8] mb-10 max-w-md">
                  {hero.description}
                </p>

                <div className="flex items-center gap-6">
                  <a
                    href="#waitlist"
                    className="group inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background text-sm font-medium tracking-wider uppercase hover:opacity-90 transition-opacity"
                  >
                    {hero.cta}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </a>
                  <div className="w-px h-10 bg-card-border" />
                  <span className="text-xs text-muted">
                    <strong className="text-foreground font-semibold">2,400+</strong>{" "}
                    {hero.users}
                  </span>
                </div>

                <div className="mt-16 flex items-center gap-4">
                  <div className="w-12 h-px bg-accent" />
                  <span className="text-[10px] tracking-[0.25em] text-muted uppercase">
                    Available 2026
                  </span>
                </div>
              </div>
            </div>

            {/* Panels 1–4 — Features */}
            {features.items.map((item, i) => {
              const Icon = iconMap[item.icon] || Sparkles;
              return (
                <div key={i} className="showcase-panel min-h-screen flex items-center" data-panel-index={i + 1}>
                  <div className="panel-content max-w-md">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-surface border border-card-border flex items-center justify-center">
                        <Icon className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="w-8 h-px bg-card-border" />
                      <span className="text-[10px] tracking-[0.2em] text-muted uppercase">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="font-serif text-4xl lg:text-5xl font-medium text-foreground mb-5 tracking-[-0.01em]">
                      {item.title}
                    </h3>
                    <p className="text-lg text-muted leading-[1.8]">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Sticky phone */}
          <div>
            <div className="sticky top-[15vh]">
              <div className="flex flex-col items-center">
                <div className="relative w-[280px] h-[580px] rounded-[3rem] border-[6px] border-[#2a2a2a] bg-black shadow-2xl shadow-black/20 overflow-hidden">
                  {/* Dynamic Island */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-black rounded-full z-20" />

                  {/* Screen content */}
                  <div className="relative w-full h-full rounded-[2.4rem] bg-gradient-to-b from-[#0a0a0a] to-[#111] overflow-hidden">
                    {features.items.map((_, i) => (
                      <PhoneScreen key={i} index={i} active={i === screenIndex} />
                    ))}
                  </div>

                  {/* Glass reflection */}
                  <div className="absolute inset-0 rounded-[2.4rem] bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Screen indicator dots */}
                <div className="flex justify-center gap-2 mt-8">
                  {features.items.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-500 ${
                        i === screenIndex
                          ? "w-8 bg-foreground"
                          : "w-2 bg-foreground/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
