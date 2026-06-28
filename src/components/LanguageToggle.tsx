"use client";

import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";

type Language = "es" | "en";

export function LanguageToggle() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "es";
    return window.localStorage.getItem("nubel-language") === "en" ? "en" : "es";
  });

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    const nextLanguage = language === "es" ? "en" : "es";

    setLanguage(nextLanguage);
    window.localStorage.setItem("nubel-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dataset.lang = nextLanguage;
  };

  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/30 px-3 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black"
      type="button"
      onClick={toggleLanguage}
      aria-label="Cambiar idioma"
      suppressHydrationWarning
    >
      <Globe2 size={16} aria-hidden />
      {language.toUpperCase()}
    </button>
  );
}
