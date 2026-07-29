/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

type GalleryImage = { id: string; url: string };

export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [selected, setSelected] = useState(0);
  const current = images[selected];

  if (!current) return null;

  return <div>
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
      <img className="h-full w-full object-cover" src={current.url} alt={`${productName}${images.length > 1 ? ` — imagen ${selected + 1}` : ""}`} />
    </div>
    {images.length > 1 ? <div className="mt-3 grid grid-cols-3 gap-3" aria-label="Más imágenes del producto">
      {images.map((image, index) => <button className={`aspect-square overflow-hidden rounded-md border-2 bg-white transition ${selected === index ? "border-[#f5a524] ring-2 ring-amber-100" : "border-transparent hover:border-slate-300"}`} type="button" aria-label={`Ver imagen ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)} key={image.id}>
        <img className="h-full w-full object-cover" src={image.url} alt="" />
      </button>)}
    </div> : null}
  </div>;
}
