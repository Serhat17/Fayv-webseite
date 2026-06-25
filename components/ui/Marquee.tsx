"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  pauseOnHover?: boolean;
  direction?: "left" | "right";
  speed?: number;
}

export function Marquee({
  children,
  className,
  pauseOnHover = true,
  direction = "left",
  speed = 40,
}: MarqueeProps) {
  return (
    <div
      className={cn("group flex overflow-hidden", className)}
    >
      <div
        className={cn(
          "flex shrink-0 gap-6 py-4",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        style={{
          animation: `scroll-${direction} ${speed}s linear infinite`,
        }}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex shrink-0 gap-6 py-4",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        style={{
          animation: `scroll-${direction} ${speed}s linear infinite`,
        }}
        aria-hidden
      >
        {children}
      </div>
      <style jsx>{`
        @keyframes scroll-left {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }
        @keyframes scroll-right {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
