"use client";

import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { translate } from "@/lib/i18n";

type Language = "es" | "en";

export function LanguageToggle() {
  const [language, setLanguage] = useState<Language>("es");

  useEffect(() => {
    const loadPreference = () => {
      const consent = document.cookie.split("; ").find((cookie) => cookie.startsWith("nubel-cookie-consent="))?.split("=")[1];
      const accepted = consent === "accepted";

      if (!accepted) {
        window.localStorage.removeItem("nubel-language");
        setLanguage("es");
        return;
      }

      setLanguage(window.localStorage.getItem("nubel-language") === "en" ? "en" : "es");
    };

    loadPreference();
    window.addEventListener("nubel-consent-change", loadPreference);
    return () => window.removeEventListener("nubel-consent-change", loadPreference);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    const nextLanguage = language === "es" ? "en" : "es";

    setLanguage(nextLanguage);
    const consent = document.cookie.split("; ").find((cookie) => cookie.startsWith("nubel-cookie-consent="))?.split("=")[1];
    if (consent === "accepted") window.localStorage.setItem("nubel-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dataset.lang = nextLanguage;
    window.dispatchEvent(new CustomEvent("nubel-language-change"));
  };

  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/30 px-3 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black"
      type="button"
      onClick={toggleLanguage}
      aria-label={translate("languageToggle", language)}
      suppressHydrationWarning
    >
      <Globe2 size={16} aria-hidden />
      {language.toUpperCase()}
    </button>
  );
}
