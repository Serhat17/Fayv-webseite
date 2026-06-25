"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface TextRevealProps {
  text: string;
  className?: string;
}

export function TextReveal({ text, className }: TextRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className={cn("inline-block overflow-hidden", className)}>
      <span
        className={cn(
          "inline-block transition-all duration-700 ease-out",
          isVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        )}
      >
        {text}
      </span>
    </span>
  );
}
