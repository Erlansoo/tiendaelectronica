"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Crosshair, MousePointer2, Rotate3D, ZoomIn } from "lucide-react";
import * as THREE from "three";
import { OrbitControls, STLLoader, TransformControls } from "three-stdlib";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useLocale } from "@/components/useLocale";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const allowedExtensions = [".stl", ".obj", ".step", ".stp", ".3mf"];
const scalePresets = [1, 0.1, 0.01, 0.001];
const printerBeds = [
  { label: "200 x 200 x 200 mm", x: 200, y: 200, z: 200 },
  { label: "250 x 250 x 250 mm", x: 250, y: 250, z: 250 },
  { label: "300 x 300 x 300 mm", x: 300, y: 300, z: 300 },
  { label: "400 x 400 x 400 mm", x: 400, y: 400, z: 400 },
];

type Dimensions = {
  x: number;
  y: number;
  z: number;
};

export function PrintQuoteWorkspace() {
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const buildPlateRef = useRef<THREE.Group | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const selectedBedRef = useRef(printerBeds[1]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [previewNote, setPreviewNote] = useState<TranslationKey>("quotePreviewPrompt");
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [bedIndex, setBedIndex] = useState(1);
  const [placementMode, setPlacementMode] = useState<"automatic" | "manual">("automatic");
  const [copyCount, setCopyCount] = useState(1);
  const [manualPosition, setManualPosition] = useState({ x: 0, y: 0 });

  const selectedBed = printerBeds[bedIndex];
  selectedBedRef.current = selectedBed;
  const fileSummary = useMemo(() => {
    if (!file) return translate("quoteNoFile", locale);
    return `${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  }, [file, locale]);
  const scaledDimensions = dimensions
    ? {
        x: dimensions.x * scaleFactor,
        y: dimensions.y * scaleFactor,
        z: dimensions.z * scaleFactor,
      }
    : null;
  const suggestedScale = dimensions ? suggestScale(dimensions, selectedBed) : 1;
  const fitsSelectedBed = scaledDimensions
    ? scaledDimensions.x <= selectedBed.x && scaledDimensions.y <= selectedBed.y && scaledDimensions.z <= selectedBed.z
    : true;
  const modelLooksTiny = scaledDimensions
    ? Math.max(scaledDimensions.x, scaledDimensions.y, scaledDimensions.z) > 0 &&
      Math.max(scaledDimensions.x, scaledDimensions.y, scaledDimensions.z) < 5
    : false;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4, 3, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    scene.background = new THREE.Color("#071012");
    scene.add(new THREE.HemisphereLight("#d9f7f5", "#10191b", 1.9));
    const key = new THREE.DirectionalLight("#ffffff", 3.2);
    key.position.set(5, 8, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#55c7bd", 1.1);
    fill.position.set(-5, 3, -4);
    scene.add(fill);

    const placeholder = wrapModel(createPlaceholderModel());
    modelRef.current = placeholder;
    scene.add(placeholder);
    frameModel(placeholder);

    const transform = new TransformControls(camera, renderer.domElement);
    transform.setMode("translate");
    transform.setTranslationSnap(1);
    transform.visible = false;
    transform.attach(placeholder);
    const transformEvents = transform as unknown as {
      addEventListener: (type: string, listener: (event: { value?: boolean }) => void) => void;
    };
    transformEvents.addEventListener("dragging-changed", (event) => {
      controls.enabled = !event.value;
    });
    transformEvents.addEventListener("objectChange", () => {
      if (!modelRef.current) return;
      constrainToBuildPlate(modelRef.current, selectedBedRef.current);
      setManualPosition({ x: Number(modelRef.current.position.x.toFixed(1)), y: Number(modelRef.current.position.z.toFixed(1)) });
    });
    transformRef.current = transform;
    scene.add(transform);

    let frameId = 0;
    function animate() {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    function resize() {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      controls.dispose();
      transform.detach();
      transform.dispose();
      if (modelRef.current) disposeObject(modelRef.current);
      if (buildPlateRef.current) disposeObject(buildPlateRef.current);
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (buildPlateRef.current) {
      scene.remove(buildPlateRef.current);
      disposeObject(buildPlateRef.current);
    }

    const plate = createBuildPlate(selectedBed.x, selectedBed.z);
    buildPlateRef.current = plate;
    scene.add(plate);
    if (modelRef.current) {
      constrainToBuildPlate(modelRef.current, selectedBed);
    }
  }, [selectedBed]);

  useEffect(() => {
    const transform = transformRef.current;
    if (!transform || !modelRef.current) return;
    transform.visible = placementMode === "manual";
    if (placementMode === "automatic") {
      autoPlaceModel(modelRef.current, selectedBed);
    }
  }, [placementMode, selectedBed]);

  function frameModel(object: THREE.Object3D) {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    const distance = maxSize * 2.25;

    // Keep the model's lowest point on the build plate instead of centering it through the grid.
    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= box.min.y;
    const elevatedTarget = Math.max(size.y * 0.3, maxSize * 0.08);
    camera.position.set(distance * 1.05, distance * 0.82 + elevatedTarget, distance * 1.05);
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
    controls.target.set(0, elevatedTarget, 0);
    controls.update();
  }

  function replaceModel(object: THREE.Object3D) {
    const scene = sceneRef.current;
    if (!scene) return;
    if (modelRef.current) {
      scene.remove(modelRef.current);
      disposeObject(modelRef.current);
    }
    const model = wrapModel(object);
    modelRef.current = model;
    scene.add(model);
    transformRef.current?.attach(model);
    autoPlaceModel(model, selectedBed);
    setCopyCount(1);
    setManualPosition({ x: 0, y: 0 });
    frameModel(model);
  }

  function applyModelScale(nextScale: number) {
    const safeScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
    setScaleFactor(safeScale);
    if (modelRef.current) {
      modelRef.current.scale.setScalar(safeScale);
      constrainToBuildPlate(modelRef.current, selectedBed);
      frameModel(modelRef.current);
    }
  }

  function resetView() {
    if (modelRef.current) frameModel(modelRef.current);
  }

  function applyAutomaticPlacement() {
    const model = modelRef.current;
    if (!model) return;
    autoPlaceModel(model, selectedBed);
    setManualPosition({ x: 0, y: 0 });
    frameModel(model);
  }

  function setPlacementPosition(axis: "x" | "y", value: number) {
    const model = modelRef.current;
    if (!model || !Number.isFinite(value)) return;
    if (axis === "x") model.position.x = value;
    else model.position.z = value;
    constrainToBuildPlate(model, selectedBed);
    setManualPosition({ x: Number(model.position.x.toFixed(1)), y: Number(model.position.z.toFixed(1)) });
  }

  function rotateModel() {
    const model = modelRef.current;
    if (!model) return;
    model.rotation.y += Math.PI / 2;
    constrainToBuildPlate(model, selectedBed);
    frameModel(model);
  }

  function setCopies(nextCount: number) {
    const model = modelRef.current;
    if (!model) return;
    const safeCount = Math.max(1, Math.min(12, Math.round(nextCount) || 1));
    arrangeCopies(model, safeCount, selectedBed);
    setCopyCount(safeCount);
    constrainToBuildPlate(model, selectedBed);
    frameModel(model);
  }

  async function loadStlPreview(selected: File) {
    const buffer = await selected.arrayBuffer();
    const geometry = new STLLoader().parse(buffer);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const size = geometry.boundingBox?.getSize(new THREE.Vector3()) ?? new THREE.Vector3();
    const detectedDimensions = {
      x: Math.abs(size.x),
      y: Math.abs(size.y),
      z: Math.abs(size.z),
    };
    const recommendedScale = suggestScale(detectedDimensions, selectedBed);

    setDimensions(detectedDimensions);
    setScaleFactor(recommendedScale);

    const material = new THREE.MeshStandardMaterial({
      color: "#f5a524",
      metalness: 0.08,
      roughness: 0.48,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.setScalar(recommendedScale);
    replaceModel(mesh);
    setPreviewNote("quotePreviewLoaded");
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    setFile(null);
    setDimensions(null);
    applyModelScale(1);

    if (!selected) return;
    const lowerName = selected.name.toLowerCase();
    const validExtension = allowedExtensions.some((extension) => lowerName.endsWith(extension));

    if (!validExtension) {
      setError("quoteInvalidFile");
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("quoteFileTooLarge");
      event.target.value = "";
      return;
    }

    setFile(selected);

    if (lowerName.endsWith(".stl")) {
      await loadStlPreview(selected);
    } else {
      replaceModel(createPlaceholderModel());
      setPreviewNote("quotePreviewUnavailable");
    }
  }

  return (
    <section className="mx-auto grid max-w-[1600px] gap-6 px-5 py-10 sm:px-6 lg:grid-cols-[minmax(340px,0.72fr)_minmax(620px,1.28fr)] lg:px-8">
      <div className="rounded-md border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-black">{translate("quoteTitle", locale)}</h2>
        <p className="mt-2 text-sm text-neutral-600">
          {translate("quoteUploadHelp", locale)}
        </p>

        <label className="mt-6 grid gap-2 text-sm font-semibold text-black">
          {translate("quoteFile", locale)}
          <input
            accept=".stl,.obj,.step,.stp,.3mf"
            className="rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700 file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#f5a524] hover:file:text-black"
            type="file"
            onChange={onFileChange}
          />
        </label>
        <p className="mt-2 text-sm text-neutral-500">{fileSummary}</p>
        {error ? <p className="mt-2 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{translate(error, locale)}</p> : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-black">
            {translate("quotePrinterBed", locale)}
            <select
              className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800"
              value={bedIndex}
              onChange={(event) => setBedIndex(Number(event.target.value))}
            >
              {printerBeds.map((bed, index) => (
                <option key={bed.label} value={index}>
                  {bed.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-black">
            {translate("quotePrintTechnology", locale)}
            <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
              <option>FDM / FFF filament</option>
              <option>MSLA resin</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-black">
            {translate("quoteMaterial", locale)}
            <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
              <option>PLA</option>
              <option>PETG</option>
              <option>ABS</option>
              <option>TPU</option>
              <option>{translate("quoteStandardResin", locale)}</option>
              <option>{translate("quoteToughResin", locale)}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-black">
            {translate("quoteColor", locale)}
            <input className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800" placeholder={translate("quoteColorPlaceholder", locale)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-black">
            {translate("quoteQuantity", locale)}
            <input className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800" min={1} type="number" defaultValue={1} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-black">
            {translate("quoteInfill", locale)}
            <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
              <option>20%</option>
              <option>40%</option>
              <option>60%</option>
              <option>100%</option>
              <option>{translate("quoteInfillNotApplicable", locale)}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-black">
            {translate("quoteLayerHeight", locale)}
            <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
              <option>{translate("quoteLayerStandard", locale)}</option>
              <option>{translate("quoteLayerFine", locale)}</option>
              <option>{translate("quoteLayerDraft", locale)}</option>
              <option>{translate("quoteLayerResin", locale)}</option>
            </select>
          </label>
        </div>

        <section className="mt-5 rounded-lg border border-[#b7d8d5] bg-[#f2fbfa] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">{translate("quotePlacement", locale)}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {translate(placementMode === "automatic" ? "quoteAutomaticHelp" : "quoteManualHelp", locale)}
              </p>
            </div>
            <div className="flex rounded-md border border-[#a8ccc8] bg-white p-1">
              <button
                className={`rounded px-3 py-2 text-sm font-semibold ${placementMode === "automatic" ? "bg-[#0f3d3d] text-white" : "text-slate-700"}`}
                type="button"
                onClick={() => {
                  setPlacementMode("automatic");
                  applyAutomaticPlacement();
                }}
              >
                {translate("quoteAutomaticMode", locale)}
              </button>
              <button
                className={`rounded px-3 py-2 text-sm font-semibold ${placementMode === "manual" ? "bg-[#0f3d3d] text-white" : "text-slate-700"}`}
                type="button"
                onClick={() => setPlacementMode("manual")}
              >
                {translate("quoteManualMode", locale)}
              </button>
            </div>
          </div>

          {placementMode === "manual" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm font-semibold text-slate-800">
                {translate("quotePositionX", locale)}
                <input className="h-10 rounded-md border border-slate-300 bg-white px-3" step="1" type="number" value={manualPosition.x} onChange={(event) => setPlacementPosition("x", Number(event.target.value))} />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-800">
                {translate("quotePositionY", locale)}
                <input className="h-10 rounded-md border border-slate-300 bg-white px-3" step="1" type="number" value={manualPosition.y} onChange={(event) => setPlacementPosition("y", Number(event.target.value))} />
              </label>
              <button className="self-end rounded-md border border-[#558c87] bg-white px-3 py-2.5 text-sm font-semibold text-[#174946] hover:bg-[#dff4f1]" type="button" onClick={rotateModel}>
                {translate("quoteRotate", locale)}
              </button>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#c9e2df] pt-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              {translate("quoteCopies", locale)}
              <input className="h-10 w-24 rounded-md border border-slate-300 bg-white px-3" min={1} max={12} type="number" value={copyCount} onChange={(event) => setCopies(Number(event.target.value))} />
            </label>
            <p className="max-w-sm pb-2 text-sm text-slate-600">{translate("quoteCopiesHelp", locale)}</p>
          </div>
        </section>

        {dimensions ? (
          <div className="mt-5 rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-black">{translate("quoteDimensions", locale)}</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  {translate("quoteOriginal", locale)} X {formatMm(dimensions.x)} / Y {formatMm(dimensions.y)} / Z {formatMm(dimensions.z)}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {translate("quoteScaled", locale)} X {formatMm(scaledDimensions!.x)} / Y {formatMm(scaledDimensions!.y)} / Z {formatMm(scaledDimensions!.z)}
                </p>
              </div>
              <button
                className="rounded-full border border-black px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524]"
                type="button"
                onClick={() => applyModelScale(suggestedScale)}
              >
                {translate("quoteUseSuggestedScale", locale)} {suggestedScale}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="grid gap-1 text-sm font-semibold text-black">
                {translate("quoteScaleFactor", locale)}
                <input
                  aria-label="Scale factor"
                  className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800"
                  min={0.0001}
                  step={0.001}
                  type="number"
                  value={scaleFactor}
                  onChange={(event) => applyModelScale(Number(event.target.value))}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {scalePresets.map((preset) => (
                  <button
                    className="rounded-full border border-neutral-300 px-3 py-2 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524]"
                    key={preset}
                    type="button"
                    onClick={() => applyModelScale(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {!fitsSelectedBed ? (
              <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
                {translate("quoteOutsideBed", locale)}
              </p>
            ) : null}
            {modelLooksTiny ? (
              <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                {translate("quoteTinyModel", locale)}
              </p>
            ) : null}
          </div>
        ) : null}

        <label className="mt-4 grid gap-1 text-sm font-semibold text-black">
          {translate("quoteNotes", locale)}
          <textarea className="min-h-28 rounded-md border border-neutral-300 px-3 py-2 text-neutral-800" placeholder={translate("quoteNotesPlaceholder", locale)} />
        </label>

        <button
          className="mt-5 w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f5a524] hover:text-black hover:shadow-xl hover:shadow-[#f5a524]/20 disabled:cursor-not-allowed disabled:bg-neutral-400"
          disabled={!file || Boolean(error) || !fitsSelectedBed}
          type="button"
        >
          {translate("quoteSendRequest", locale)}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#284447] bg-[#071012] text-white shadow-2xl shadow-black/25">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#244044] bg-[#0b1719] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1d4546] text-[#8ce1da]"><Box size={17} aria-hidden /></span>
              <h2 className="font-semibold">{translate("quoteViewer", locale)}</h2>
            </div>
            <p className="mt-2 text-xs text-white/60">{translate("quoteViewerHelp", locale)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#346063] bg-[#10282a] px-3 py-1 text-xs font-semibold text-[#8ce1da]">{translate("quoteStlBadge", locale)}</span>
            <button className="inline-flex items-center gap-2 rounded-md border border-[#34595c] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-[#8ce1da] hover:text-[#8ce1da]" type="button" onClick={resetView}>
              <Crosshair size={14} aria-hidden />
              {translate("quoteResetView", locale)}
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-md border border-[#315456] bg-[#0d1f21]/90 px-3 py-2 text-xs text-[#b7d9d7] backdrop-blur">
            <span className="font-semibold text-white">{translate("quoteBuildPlate", locale)}</span>
            <span className="ml-2 text-[#78cfc8]">{selectedBed.label}</span>
          </div>
          <div ref={containerRef} className="h-[560px] w-full sm:h-[640px]" aria-label="Interactive 3D file viewer" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#244044] bg-[#0b1719] px-5 py-3">
          <p className="text-sm text-white/65">{translate(previewNote, locale)}</p>
          <div className="flex items-center gap-3 text-xs text-[#a7cfcc]">
            <span className="inline-flex items-center gap-1.5"><Rotate3D size={14} aria-hidden /> {translate("quoteOrbitControl", locale)}</span>
            <span className="inline-flex items-center gap-1.5"><MousePointer2 size={14} aria-hidden /> {translate("quotePanControl", locale)}</span>
            <span className="inline-flex items-center gap-1.5"><ZoomIn size={14} aria-hidden /> {translate("quoteZoomControl", locale)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function suggestScale(dimensions: Dimensions, bed: Dimensions) {
  const fittingScale = scalePresets.find(
    (scale) => dimensions.x * scale <= bed.x && dimensions.y * scale <= bed.y && dimensions.z * scale <= bed.z,
  );
  if (fittingScale) return fittingScale;

  const maxRatio = Math.max(dimensions.x / bed.x, dimensions.y / bed.y, dimensions.z / bed.z);
  if (maxRatio <= 0) return 1;
  return Number((1 / maxRatio).toFixed(4));
}

function formatMm(value: number) {
  return `${value.toFixed(value >= 10 ? 1 : 3)} mm`;
}

function wrapModel(object: THREE.Object3D) {
  const group = new THREE.Group();
  group.add(object);
  return group;
}

function autoPlaceModel(model: THREE.Group, bed: Dimensions) {
  model.position.set(0, 0, 0);
  constrainToBuildPlate(model, bed);
}

function constrainToBuildPlate(model: THREE.Group, bed: Dimensions) {
  const box = new THREE.Box3().setFromObject(model);
  const halfWidth = bed.x / 2;
  const halfDepth = bed.z / 2;

  if (box.getSize(new THREE.Vector3()).x <= bed.x) {
    if (box.min.x < -halfWidth) model.position.x += -halfWidth - box.min.x;
    if (box.max.x > halfWidth) model.position.x -= box.max.x - halfWidth;
  } else {
    model.position.x -= box.getCenter(new THREE.Vector3()).x;
  }

  const updatedBox = new THREE.Box3().setFromObject(model);
  if (updatedBox.getSize(new THREE.Vector3()).z <= bed.z) {
    if (updatedBox.min.z < -halfDepth) model.position.z += -halfDepth - updatedBox.min.z;
    if (updatedBox.max.z > halfDepth) model.position.z -= updatedBox.max.z - halfDepth;
  } else {
    model.position.z -= updatedBox.getCenter(new THREE.Vector3()).z;
  }

  const seatedBox = new THREE.Box3().setFromObject(model);
  model.position.y -= seatedBox.min.y;
}

function arrangeCopies(model: THREE.Group, count: number, bed: Dimensions) {
  const source = model.children[0];
  if (!source) return;

  while (model.children.length > 1) model.remove(model.children[model.children.length - 1]);
  source.position.set(0, 0, 0);

  const sourceBox = new THREE.Box3().setFromObject(source);
  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  const spacing = Math.max(3, Math.max(sourceSize.x, sourceSize.z) * 0.08);
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const stepX = sourceSize.x + spacing;
  const stepZ = sourceSize.z + spacing;

  for (let index = 0; index < count; index += 1) {
    const item = index === 0 ? source : source.clone(true);
    if (index > 0) model.add(item);
    item.position.set(
      (index % columns - (columns - 1) / 2) * stepX,
      0,
      (Math.floor(index / columns) - (rows - 1) / 2) * stepZ,
    );
  }

  autoPlaceModel(model, bed);
}

function createPlaceholderModel() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: "#f5a524",
    metalness: 0.18,
    roughness: 0.42,
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 1.55), material);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.58, 1.35, 48), material);
  tower.position.set(-0.55, 0.82, 0);
  const cap = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 16, 64), material);
  cap.position.set(0.55, 0.5, 0);
  cap.rotation.x = Math.PI / 2;
  group.add(base, tower, cap);
  return group;
}

function createBuildPlate(width: number, depth: number) {
  const group = new THREE.Group();
  const displayWidth = Math.max(8, Math.min(width, 300));
  const displayDepth = Math.max(8, Math.min(depth, 300));
  const plateShape = roundedRectangleShape(displayWidth, displayDepth, Math.min(displayWidth, displayDepth) * 0.035);
  const plate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(plateShape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.04, bevelSegments: 3 }),
    new THREE.MeshStandardMaterial({ color: "#1c2426", roughness: 0.72, metalness: 0.38 }),
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = -0.16;
  group.add(plate);

  const grid = new THREE.GridHelper(Math.max(displayWidth, displayDepth), 32, "#73d7cf", "#25484b");
  grid.scale.set(displayWidth / Math.max(displayWidth, displayDepth), 1, displayDepth / Math.max(displayWidth, displayDepth));
  grid.position.y = 0.012;
  group.add(grid);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(plate.geometry),
    new THREE.LineBasicMaterial({ color: "#78d8d0" }),
  );
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = -0.16;
  group.add(edge);
  return group;
}

function roundedRectangleShape(width: number, depth: number, radius: number) {
  const x = -width / 2;
  const y = -depth / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + depth - radius);
  shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  shape.lineTo(x + radius, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}
