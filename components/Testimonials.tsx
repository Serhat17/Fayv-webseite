"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

interface TestimonialItem {
  name: string;
  role: string;
  text: string;
  avatar: string;
}

interface TestimonialsProps {
  translations: {
    label: string;
    title: string;
    items: readonly TestimonialItem[];
  };
}

// Deterministic gradient pair per name → consistent avatar across renders.
function gradientFor(name: string): { from: string; to: string } {
  const palette: { from: string; to: string }[] = [
    { from: "#fde68a", to: "#f97316" }, // amber → orange
    { from: "#fbcfe8", to: "#a855f7" }, // pink → violet
    { from: "#bae6fd", to: "#0ea5e9" }, // sky → blue
    { from: "#d9f99d", to: "#65a30d" }, // lime → green
    { from: "#fecaca", to: "#dc2626" }, // rose → red
    { from: "#e9d5ff", to: "#7c3aed" }, // lavender → indigo
    { from: "#fed7aa", to: "#ea580c" }, // peach → orange
    { from: "#a7f3d0", to: "#059669" }, // mint → emerald
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function Avatar({ name, initials, size = 12 }: { name: string; initials: string; size?: number }) {
  const { from, to } = gradientFor(name);
  const px = size * 4;
  return (
    <div
      className="rounded-full flex items-center justify-center text-background font-semibold shadow-inner"
      style={{
        width: px,
        height: px,
        background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        fontSize: px * 0.4,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function Testimonials({ translations: t }: TestimonialsProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    let revert: (() => void) | undefined;

    (async () => {
      const { default: gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".testimonials-header",
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            scrollTrigger: { trigger: ".testimonials-header", start: "top 80%" },
          }
        );
        gsap.fromTo(
          ".testimonial-featured",
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            scrollTrigger: { trigger: ".testimonial-featured", start: "top 75%" },
          }
        );
        gsap.fromTo(
          ".testimonial-card",
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: { trigger: ".testimonial-grid", start: "top 75%" },
          }
        );
      }, sectionRef);

      revert = () => ctx.revert();
    })();

    return () => revert?.();
  }, [reducedMotion]);

  const featured = t.items[0];
  const rest = t.items.slice(1);

  return (
    <section ref={sectionRef} id="testimonials" className="relative py-36 bg-section-alt scroll-mt-24">
      <div className="site-container">
        {/* Header */}
        <div className="testimonials-header max-w-2xl mb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-px bg-accent" />
            <span className="text-[11px] font-medium tracking-[0.3em] text-muted uppercase">
              {t.label}
            </span>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium text-foreground leading-[1.05] tracking-[-0.01em]">
            {t.title}
          </h2>
        </div>

        {/* Featured testimonial — large editorial quote */}
        <div className="testimonial-featured border-t border-card-border pt-12 mb-20">
          <div className="max-w-3xl">
            <p className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground leading-[1.4] tracking-[-0.01em] mb-8">
              &ldquo;{featured.text}&rdquo;
            </p>
            <div className="flex items-center gap-4">
              <Avatar name={featured.name} initials={featured.avatar} size={12} />
              <div>
                <p className="text-sm font-semibold text-foreground">{featured.name}</p>
                <p className="text-xs text-muted">{featured.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grid of other testimonials */}
        <div className="testimonial-grid grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-card-border">
          {rest.map((item, i) => (
            <div key={i} className="testimonial-card bg-background p-8 flex flex-col justify-between">
              <p className="text-sm text-muted leading-[1.7] mb-8">&ldquo;{item.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <Avatar name={item.name} initials={item.avatar} size={8} />
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
