"use client";

import { useEffect } from "react";

export function PublicHeaderScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    const featuredSection = document.getElementById("featured");
    let isDocked = root.hasAttribute("data-public-header-docked");
    let ticking = false;

    const updateHeaderState = () => {
      ticking = false;
      const releaseThreshold = 96;
      const fallbackThreshold = 360;
      const threshold = featuredSection
        ? featuredSection.offsetTop - window.innerHeight * 0.18
        : fallbackThreshold;

      if (window.scrollY >= threshold) {
        isDocked = true;
      } else if (window.scrollY <= releaseThreshold) {
        isDocked = false;
      }

      root.toggleAttribute("data-public-header-docked", isDocked);
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateHeaderState);
    };

    updateHeaderState();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      root.removeAttribute("data-public-header-docked");
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return null;
}
