"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { translate } from "@/lib/i18n";
import { useLocale } from "@/components/useLocale";

const CONSENT_COOKIE = "nubel-cookie-consent";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
type Consent = "accepted" | "rejected";

function getConsent(): Consent | null {
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];

  return value === "accepted" || value === "rejected" ? value : null;
}

function saveConsent(value: Consent) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent("nubel-consent-change", { detail: value }));
}

function subscribeToConsent(onStoreChange: () => void) {
  window.addEventListener("nubel-consent-change", onStoreChange);
  return () => window.removeEventListener("nubel-consent-change", onStoreChange);
}

function getServerConsent() {
  return null;
}

export function CookieConsent() {
  const locale = useLocale();
  const consent = useSyncExternalStore(subscribeToConsent, getConsent, getServerConsent);
  const [isOpen, setIsOpen] = useState(false);

  const choose = (value: Consent) => {
    if (value === "rejected") window.localStorage.removeItem("nubel-language");
    saveConsent(value);
    setIsOpen(false);
  };

  if (consent !== null && !isOpen) {
    return (
      <button
        className="fixed bottom-4 left-4 z-50 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg hover:bg-slate-100"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        {translate("cookiePreferences", locale)}
      </button>
    );
  }

  return (
    <section className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-2xl" aria-label={translate("cookieDialogLabel", locale)} role="dialog" aria-modal="true">
      <h2 className="text-lg font-semibold text-slate-950">{translate("cookiePrivacyTitle", locale)}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {translate("cookiePrivacyBody", locale)}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        <Link className="font-semibold text-slate-950 underline" href="/politica-de-cookies">
          {translate("cookiePolicyLink", locale)}
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100" type="button" onClick={() => choose("rejected")}>
          {translate("cookieNecessaryOnly", locale)}
        </button>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" type="button" onClick={() => choose("accepted")}>
          {translate("cookieAcceptPreferences", locale)}
        </button>
      </div>
    </section>
  );
}
