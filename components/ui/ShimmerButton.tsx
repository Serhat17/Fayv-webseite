"use client";

import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface ShimmerButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}

export function ShimmerButton({
  children,
  className,
  onClick,
  type = "button",
  disabled = false,
}: ShimmerButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2",
        "rounded-full px-8 py-4 font-semibold text-sm tracking-wider uppercase",
        "bg-foreground text-background",
        "overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.02]",
        "active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {/* Shimmer overlay */}
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent
            animate-shimmer"
        />
      </span>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
