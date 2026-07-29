/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";

type GalleryImage = { id: string; url: string };

export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [selected, setSelected] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const current = images[selected];

  const previous = useCallback(() => setSelected((index) => (index - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setSelected((index) => (index + 1) % images.length), [images.length]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerOpen(false);
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerOpen, next, previous]);

  if (!current) return null;

  return <div>
    <button className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200" type="button" onClick={() => setViewerOpen(true)} aria-label="Ampliar imagen del producto">
      <img className="h-full w-full object-cover" src={current.url} alt={`${productName}${images.length > 1 ? ` — imagen ${selected + 1}` : ""}`} />
      <span className="absolute bottom-3 right-3 rounded bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">Ampliar</span>
    </button>
    {images.length > 1 ? <div className="mt-3 grid grid-cols-3 gap-3" aria-label="Más imágenes del producto">
      {images.map((image, index) => <button className={`aspect-square overflow-hidden rounded-md border-2 bg-white transition ${selected === index ? "border-[#f5a524] ring-2 ring-amber-100" : "border-transparent hover:border-slate-300"}`} type="button" aria-label={`Ver imagen ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)} key={image.id}>
        <img className="h-full w-full object-cover" src={image.url} alt="" />
      </button>)}
    </div> : null}
    {viewerOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4" role="dialog" aria-modal="true" aria-label="Visor de imágenes del producto" onMouseDown={() => setViewerOpen(false)}>
      <div className="relative flex h-full w-full max-w-5xl items-center justify-center" onMouseDown={(event) => event.stopPropagation()}>
        <button className="absolute right-0 top-0 z-10 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 shadow" type="button" onClick={() => setViewerOpen(false)}>Cerrar</button>
        {images.length > 1 ? <button className="absolute left-0 z-10 rounded-full bg-white/95 px-4 py-3 text-2xl font-semibold text-slate-900 shadow" type="button" aria-label="Imagen anterior" onClick={previous}>‹</button> : null}
        <img className="max-h-[86vh] max-w-[82vw] rounded-lg object-contain shadow-2xl" src={current.url} alt={`${productName} — imagen ampliada ${selected + 1}`} />
        {images.length > 1 ? <button className="absolute right-0 z-10 rounded-full bg-white/95 px-4 py-3 text-2xl font-semibold text-slate-900 shadow" type="button" aria-label="Imagen siguiente" onClick={next}>›</button> : null}
        {images.length > 1 ? <p className="absolute bottom-2 rounded-full bg-slate-950/80 px-3 py-1.5 text-sm font-semibold text-white">{selected + 1} de {images.length}</p> : null}
      </div>
    </div> : null}
  </div>;
}
