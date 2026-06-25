"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MagicCard } from "./ui/MagicCard";
import { Sparkles, Shirt, Users, CloudSun } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const iconMap = {
  sparkles: Sparkles,
  shirt: Shirt,
  users: Users,
  "cloud-sun": CloudSun,
};

interface FeatureItem {
  title: string;
  description: string;
  icon: string;
}

interface FeaturesProps {
  translations: {
    label: string;
    title: string;
    subtitle: string;
    items: readonly FeatureItem[];
  };
}

export function Features({ translations: t }: FeaturesProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        ".features-header",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: ".features-header",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // Staggered card animation
      gsap.fromTo(
        ".feature-card",
        { opacity: 0, y: 50, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".features-grid",
            start: "top 75%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative py-36 bg-background"
    >
      <div className="site-container">
        {/* Header */}
        <div className="features-header text-center max-w-2xl mx-auto mb-20">
          <span className="inline-block text-xs font-bold tracking-[0.3em] text-accent mb-5 uppercase">
            {t.label}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            {t.title}
          </h2>
          <p className="text-muted text-base md:text-lg leading-relaxed">{t.subtitle}</p>
        </div>

        {/* Grid */}
        <div className="features-grid grid md:grid-cols-2 gap-8">
          {t.items.map((feature, i) => {
            const IconComponent = iconMap[feature.icon as keyof typeof iconMap] || Sparkles;
            return (
              <div key={i} className="feature-card">
                <MagicCard className="p-8 md:p-10 h-full">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-surface border border-card-border flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </MagicCard>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
