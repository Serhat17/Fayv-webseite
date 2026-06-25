"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Step {
  number: string;
  title: string;
  description: string;
}

interface HowItWorksProps {
  translations: {
    label: string;
    title: string;
    steps: readonly Step[];
  };
}

export function HowItWorks({ translations: t }: HowItWorksProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hiw-header",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: ".hiw-header",
            start: "top 80%",
          },
        }
      );

      // Steps stagger in
      gsap.fromTo(
        ".hiw-step",
        { opacity: 0, x: -40 },
        {
          opacity: 1,
          x: 0,
          duration: 0.7,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".hiw-steps",
            start: "top 75%",
          },
        }
      );

      // Connecting line grows
      gsap.fromTo(
        ".hiw-line",
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".hiw-steps",
            start: "top 70%",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative py-36 bg-section-alt"
    >
      <div className="site-container" style={{ maxWidth: '960px' }}>
        {/* Header */}
        <div className="hiw-header text-center mb-20">
          <span className="inline-block text-xs font-bold tracking-[0.3em] text-accent mb-5 uppercase">
            {t.label}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            {t.title}
          </h2>
        </div>

        {/* Steps */}
        <div className="hiw-steps relative">
          {/* Connecting line */}
          <div className="absolute left-[43px] top-0 bottom-0 w-px hidden md:block">
            <div className="hiw-line w-full h-full bg-gradient-to-b from-card-border via-card-border/50 to-transparent origin-top" />
          </div>

          <div className="space-y-20">
            {t.steps.map((step, i) => (
              <div key={i} className="hiw-step flex items-start gap-10">
                {/* Number circle */}
                <div className="flex-shrink-0 relative">
                  <div className="w-[86px] h-[86px] rounded-2xl bg-foreground flex items-center justify-center">
                    <span className="text-2xl font-black text-background">
                      {step.number}
                    </span>
                  </div>
                  {/* Glow dot */}
                  <div className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-accent" />
                </div>

                {/* Content */}
                <div className="pt-3">
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted leading-relaxed max-w-md">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
