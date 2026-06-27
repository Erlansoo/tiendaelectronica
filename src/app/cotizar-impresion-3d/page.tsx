import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintQuoteForm } from "@/components/PrintQuoteForm";
import { PublicHeader } from "@/components/PublicHeader";
import { ThreeQuotePreview } from "@/components/ThreeQuotePreview";

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
                Back to Nubel Store
              </Link>
              <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-[#f5a524]">3D Printing Quote</p>
              <h1 className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">
                Upload your model and request a print quote.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
                Send STL, OBJ, STEP, STP or 3MF files under 100 MB. Nubel Systems reviews the file and prepares a quote for material, time and finish.
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/30">
              <ThreeQuotePreview />
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_0.75fr] lg:px-8">
          <PrintQuoteForm />
          <aside className="rounded-md border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-black">Before uploading</h2>
            <ul className="mt-4 space-y-3 text-sm text-neutral-600">
              <li>Use millimeters when possible.</li>
              <li>Files must be under 100 MB.</li>
              <li>Supported formats: STL, OBJ, STEP, STP and 3MF.</li>
              <li>Complex models may need manual review before pricing.</li>
            </ul>
          </aside>
        </section>
      </main>
    </>
  );
}
