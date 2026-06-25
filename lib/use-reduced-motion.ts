"use client";

import { useEffect, useState } from "react";

/**
 * Reads `prefers-reduced-motion` and reacts to changes.
 * Returns `true` if the user has requested reduced motion — animations
 * should be skipped or replaced with simple fades.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return reduced;
}
