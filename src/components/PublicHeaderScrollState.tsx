"use client";

import { useEffect } from "react";

export function PublicHeaderScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    const featuredSection = document.getElementById("featured");

    const updateHeaderState = () => {
      const fallbackThreshold = 360;
      const threshold = featuredSection
        ? featuredSection.offsetTop - window.innerHeight * 0.18
        : fallbackThreshold;

      root.toggleAttribute("data-public-header-docked", window.scrollY >= threshold);
    };

    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
    window.addEventListener("resize", updateHeaderState);

    return () => {
      root.removeAttribute("data-public-header-docked");
      window.removeEventListener("scroll", updateHeaderState);
      window.removeEventListener("resize", updateHeaderState);
    };
  }, []);

  return null;
}
