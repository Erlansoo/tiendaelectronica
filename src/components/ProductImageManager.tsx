/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { ManufacturerFieldHelp } from "@/components/ManufacturerFieldHelp";

export type NewProductImage = { id: string; blob: Blob; previewUrl: string };
export type ExistingProductImage = { id: string; url: string };

const FRAME_SIZE = 320;
const OUTPUT_SIZE = 500;
const MAX_OUTPUT_BYTES = 1024 * 1024;

export function ProductImageManager({
  existingImages,
  onChange,
}: {
  existingImages: ExistingProductImage[];
  onChange: (value: { existingIds: string[]; newImages: NewProductImage[] }) => void;
}) {
  const [existing, setExisting] = useState(existingImages);
  const [newImages, setNewImages] = useState<NewProductImage[]>([]);
  const [queue, setQueue] = useState<File[]>([]);
  const [editing, setEditing] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => onChange({ existingIds: existing.map((image) => image.id), newImages }), [existing, newImages, onChange]);

  const total = existing.length + newImages.length;
  function choose(files: FileList | null) {
    if (!files) return;
    setFileError(null);
    const supplied = Array.from(files);
    const allowed = supplied.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024);
    if (allowed.length !== supplied.length) setFileError("Usa JPG, PNG o WebP de hasta 10 MB por imagen.");
    const accepted = allowed.slice(0, Math.max(0, 3 - total));
    if (!accepted.length) {
      if (allowed.length && total >= 3) setFileError("Cada producto admite como máximo tres imágenes.");
      return;
    }
    if (accepted.length < allowed.length) setFileError("Solo se añadieron las imágenes que caben hasta el máximo de tres.");
    setQueue(accepted.slice(1));
    setEditing(accepted[0]);
  }
  function finish(blob: Blob) {
    setNewImages((images) => [...images, { id: crypto.randomUUID(), blob, previewUrl: URL.createObjectURL(blob) }]);
    if (queue.length) {
      setEditing(queue[0]);
      setQueue(queue.slice(1));
    } else setEditing(null);
  }
  function removeExisting(id: string) { setExisting((images) => images.filter((image) => image.id !== id)); }
  function removeNew(id: string) {
    setNewImages((images) => {
      const target = images.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return images.filter((image) => image.id !== id);
    });
  }

  return <section className="rounded-md border border-slate-200 bg-white p-5 md:col-span-2">
    <h2 className="text-base font-semibold text-slate-950"><ManufacturerFieldHelp label="Imágenes del producto" help="Sube hasta tres fotos propias del producto. Ajusta el encuadre antes de guardar; Nubel las convierte a WebP 500×500, un formato ligero y uniforme con marca de agua." /></h2>
    <p className="mt-1 text-sm text-slate-600">Hasta tres imágenes. Antes de subirlas podrás encuadrarlas dentro del marco final; Nubel las guarda en WebP 500×500 con marca de agua. La primera será la portada.</p>
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {existing.map((image, index) => <ImageTile key={image.id} index={index} url={image.url} onRemove={() => removeExisting(image.id)} />)}
      {newImages.map((image, index) => <ImageTile key={image.id} index={existing.length + index} url={image.previewUrl} onRemove={() => removeNew(image.id)} />)}
      {total < 3 ? <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-600 transition hover:border-[#f5a524] hover:bg-amber-50"><span className="text-2xl">+</span><span className="mt-1">Añadir imagen</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { choose(event.target.files); event.currentTarget.value = ""; }} /></label> : null}
    </div>
    {fileError ? <p className="mt-3 text-sm text-amber-800">{fileError}</p> : null}
    {editing ? <ProductImageCropModal key={`${editing.name}-${editing.lastModified}`} file={editing} onCancel={() => { setEditing(null); setQueue([]); }} onConfirm={finish} /> : null}
  </section>;
}

function ImageTile({ index, url, onRemove }: { index: number; url: string; onRemove: () => void }) {
  return <div className="relative aspect-square overflow-hidden rounded-md border bg-slate-50">
    <img className="h-full w-full object-cover" src={url} alt={index === 0 ? "Imagen principal" : `Imagen ${index + 1}`} />
    <span className="absolute left-2 top-2 rounded bg-slate-950/80 px-2 py-1 text-[10px] font-bold text-white">{index === 0 ? "PORTADA" : `IMAGEN ${index + 1}`}</span>
    <button className="absolute right-2 top-2 rounded bg-white/95 px-2 py-1 text-xs font-bold text-rose-700 shadow" type="button" onClick={onRemove}>Quitar</button>
  </div>;
}

function ProductImageCropModal({ file, onCancel, onConfirm }: { file: File; onCancel: () => void; onConfirm: (blob: Blob) => void }) {
  const [sourceUrl] = useState(() => URL.createObjectURL(file));
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  useEffect(() => () => URL.revokeObjectURL(sourceUrl), [sourceUrl]);

  const baseScale = dimensions.width && dimensions.height ? Math.max(FRAME_SIZE / dimensions.width, FRAME_SIZE / dimensions.height) : 1;
  const displayWidth = dimensions.width * baseScale * zoom;
  const displayHeight = dimensions.height * baseScale * zoom;
  const clamp = (value: number, size: number) => Math.max(-Math.max(0, (size - FRAME_SIZE) / 2), Math.min(Math.max(0, (size - FRAME_SIZE) / 2), value));
  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setOffset({ x: clamp(drag.current.startX + event.clientX - drag.current.x, displayWidth), y: clamp(drag.current.startY + event.clientY - drag.current.y, displayHeight) });
  }
  async function save() {
    setError(null);
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE; canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return;
    const factor = OUTPUT_SIZE / FRAME_SIZE;
    const x = (FRAME_SIZE / 2 + offset.x - displayWidth / 2) * factor;
    const y = (FRAME_SIZE / 2 + offset.y - displayHeight / 2) * factor;
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(image, x, y, displayWidth * factor, displayHeight * factor);
    context.save(); context.globalAlpha = 0.58; context.fillStyle = "#ffffff"; context.font = "700 21px Arial, sans-serif"; context.textAlign = "right"; context.textBaseline = "bottom";
    context.fillText("NUBEL STORE", OUTPUT_SIZE - 22, OUTPUT_SIZE - 20); context.restore();
    let blob: Blob | null = null;
    for (const quality of [0.9, 0.82, 0.74, 0.66]) {
      const candidate = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (!candidate) continue;
      blob = candidate;
      if (candidate.size <= MAX_OUTPUT_BYTES) break;
    }
    if (!blob || blob.size > MAX_OUTPUT_BYTES) {
      setError("No se pudo optimizar la imagen por debajo de 1 MB. Prueba con otra foto o reduce el zoom.");
      return;
    }
    onConfirm(blob);
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Editar imagen del producto">
    <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">Encuadrar imagen</h3><p className="mt-1 text-sm text-slate-600">Arrastra la foto y usa el zoom. Solo lo que quede dentro del marco se guardará.</p></div><button className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100" type="button" onClick={onCancel}>Cerrar</button></div>
      <div className="mt-5 flex justify-center rounded-xl bg-slate-950 p-5 shadow-inner sm:p-8"><div className="relative touch-none overflow-hidden rounded-sm border-2 border-white bg-black shadow-[0_0_0_1px_rgba(245,165,36,0.9),0_10px_28px_rgba(0,0,0,0.55)]" style={{ width: FRAME_SIZE, height: FRAME_SIZE }} onPointerDown={(event) => { drag.current = { x: event.clientX, y: event.clientY, startX: offset.x, startY: offset.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        {sourceUrl ? <img className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none" style={{ width: displayWidth, height: displayHeight, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }} src={sourceUrl} alt="Vista previa de recorte" onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} /> : null}
        <div className="pointer-events-none absolute inset-0 border border-[#f5a524]" />
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-slate-950/85 px-2 py-1 text-[11px] font-semibold text-white">Área final · 500 × 500 px</span>
        <span className="pointer-events-none absolute left-1/3 top-0 h-full border-l border-white/35" /><span className="pointer-events-none absolute left-2/3 top-0 h-full border-l border-white/35" /><span className="pointer-events-none absolute left-0 top-1/3 w-full border-t border-white/35" /><span className="pointer-events-none absolute left-0 top-2/3 w-full border-t border-white/35" />
      </div></div>
      <p className="mt-3 text-center text-xs text-slate-500">El fondo negro queda fuera de la foto. El rectángulo delimitado representa exactamente la imagen que se publicará.</p>
      <label className="mt-5 grid gap-2 text-sm font-semibold">Zoom<input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => { const next = Number(event.target.value); setZoom(next); setOffset((current) => ({ x: clamp(current.x, dimensions.width * baseScale * next), y: clamp(current.y, dimensions.height * baseScale * next) })); }} /></label>
      {error ? <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
      <div className="mt-6 flex justify-end gap-3"><button className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={onCancel}>Cancelar</button><button className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={!dimensions.width} type="button" onClick={save}>Usar esta imagen</button></div>
    </div>
  </div>;
}
