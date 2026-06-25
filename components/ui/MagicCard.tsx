"use client";

import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

interface MagicCardProps {
  children: React.ReactNode;
  className?: string;
  gradientColor?: string;
}

export function MagicCard({
  children,
  className,
  gradientColor = "rgba(0, 0, 0, 0.03)",
}: MagicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-card-border bg-card",
        "transition-all duration-500",
        "hover:border-foreground/10 hover:shadow-lg hover:shadow-black/5",
        className
      )}
    >
      {/* Gradient follow cursor */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: isHovered
            ? `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, ${gradientColor}, transparent 70%)`
            : "none",
        }}
      />
      {/* Border beam effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: isHovered
            ? `radial-gradient(200px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0,0,0,0.04), transparent 70%)`
            : "none",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
