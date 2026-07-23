"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

function readLocale(): Locale {
  return document.documentElement.dataset.lang === "en" ? "en" : "es";
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>("es");

  useEffect(() => {
    const updateLocale = () => setLocale(readLocale());
    updateLocale();
    window.addEventListener("nubel-language-change", updateLocale);
    return () => window.removeEventListener("nubel-language-change", updateLocale);
  }, []);

  return locale;
}
