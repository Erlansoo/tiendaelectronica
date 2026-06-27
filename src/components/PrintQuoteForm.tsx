"use client";

import { useMemo, useState } from "react";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const allowedExtensions = [".stl", ".obj", ".step", ".stp", ".3mf"];

export function PrintQuoteForm() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const fileSummary = useMemo(() => {
    if (!file) return "No file selected";
    return `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  }, [file]);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError("");
    setFile(null);

    if (!selected) return;
    const lowerName = selected.name.toLowerCase();
    const validExtension = allowedExtensions.some((extension) => lowerName.endsWith(extension));

    if (!validExtension) {
      setError("Upload an STL, OBJ, STEP, STP or 3MF file.");
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("The file must be smaller than 100 MB.");
      event.target.value = "";
      return;
    }

    setFile(selected);
  }

  return (
    <form className="rounded-md border border-black/10 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-black">Quote your 3D print</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Upload a 3D file under 100 MB and add print preferences. The final quote is reviewed by Nubel Systems.
      </p>

      <label className="mt-6 grid gap-2 text-sm font-semibold text-black">
        3D file
        <input
          accept=".stl,.obj,.step,.stp,.3mf"
          className="rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700 file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#f5a524] hover:file:text-black"
          type="file"
          onChange={onFileChange}
        />
      </label>
      <p className="mt-2 text-sm text-neutral-500">{fileSummary}</p>
      {error ? <p className="mt-2 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-black">
          Material
          <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
            <option>PLA</option>
            <option>PETG</option>
            <option>ABS</option>
            <option>TPU</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-black">
          Color
          <input className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800" placeholder="Black, white, custom..." />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-black">
          Quantity
          <input className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800" min={1} type="number" defaultValue={1} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-black">
          Infill
          <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
            <option>20%</option>
            <option>40%</option>
            <option>60%</option>
            <option>100%</option>
          </select>
        </label>
      </div>

      <label className="mt-4 grid gap-1 text-sm font-semibold text-black">
        Notes
        <textarea className="min-h-28 rounded-md border border-neutral-300 px-3 py-2 text-neutral-800" placeholder="Dimensions, finish, deadline or special requirements." />
      </label>

      <button
        className="mt-5 w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f5a524] hover:text-black hover:shadow-xl hover:shadow-[#f5a524]/20 disabled:cursor-not-allowed disabled:bg-neutral-400"
        disabled={!file || Boolean(error)}
        type="button"
      >
        Send quote request
      </button>
    </form>
  );
}
