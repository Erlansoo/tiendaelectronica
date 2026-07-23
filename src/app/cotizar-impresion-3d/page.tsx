import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintQuoteWorkspace } from "@/components/PrintQuoteWorkspace";
import { LocalizedText } from "@/components/LocalizedText";
import { PublicHeader } from "@/components/PublicHeader";

export default function PrintQuotePage() {
  return (
    <>
      <PublicHeader />
      <main className="bg-neutral-50">
        <section className="border-b border-neutral-200 bg-black text-white">
          <div className="mx-auto grid min-h-[520px] max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
            <div>
              <Link className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-[#f5a524]" href="/">
                <ArrowLeft size={16} aria-hidden />
                <LocalizedText id="quoteBackToStore" />
              </Link>
              <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-[#f5a524]"><LocalizedText id="quoteEyebrow" /></p>
              <h1 className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">
                <LocalizedText id="quoteHeroTitle" />
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
                <LocalizedText id="quoteHeroDescription" />
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30">
              <h2 className="text-2xl font-semibold"><LocalizedText id="quoteTechnologyTitle" /></h2>
              <p className="mt-3 text-white/70">
                <LocalizedText id="quoteTechnologyDescription" />
              </p>
            </div>
          </div>
        </section>

        <PrintQuoteWorkspace />

        <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">
          <aside className="rounded-md border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-black"><LocalizedText id="quoteBeforeUpload" /></h2>
            <ul className="mt-4 space-y-3 text-sm text-neutral-600">
              <li><LocalizedText id="quoteUseMillimeters" /></li>
              <li><LocalizedText id="quoteFileSize" /></li>
              <li><LocalizedText id="quoteSupportedFormats" /></li>
              <li><LocalizedText id="quoteStlPreview" /></li>
              <li><LocalizedText id="quoteManualReview" /></li>
            </ul>
          </aside>
        </section>
      </main>
    </>
  );
}
