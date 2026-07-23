"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Crosshair, MousePointer2, Rotate3D, ZoomIn } from "lucide-react";
import * as THREE from "three";
import { OrbitControls, STLLoader, TransformControls } from "three-stdlib";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useLocale } from "@/components/useLocale";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MODEL_BED_CLEARANCE = 0.025;
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
    const viewport = container;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
    camera.position.set(4, 3, 5);
    cameraRef.current = camera;

    const isMobilePointer = window.matchMedia("(pointer: coarse)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobilePointer ? 1.35 : 2));
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    viewport.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    scene.background = new THREE.Color("#e3e8e7");
    scene.add(new THREE.HemisphereLight("#ffffff", "#9ba5a3", 2.15));
    const key = new THREE.DirectionalLight("#fffdf8", 3);
    key.position.set(5, 8, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#b9d8d3", 0.85);
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
    let isInViewport = true;
    let isPageVisible = document.visibilityState === "visible";
    function animate() {
      if (isInViewport && isPageVisible) {
        controls.update();
        renderer.render(scene, camera);
      }
      frameId = requestAnimationFrame(animate);
    }
    animate();

    function resize() {
      const width = Math.max(1, Math.round(viewport.clientWidth));
      const height = Math.max(1, Math.round(viewport.clientHeight));
      if (camera.aspect === width / height && renderer.domElement.clientWidth === width && renderer.domElement.clientHeight === height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (modelRef.current) frameModel(modelRef.current);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isInViewport = entry?.isIntersecting ?? true;
    }, { rootMargin: "160px" });
    intersectionObserver.observe(viewport);
    const handleVisibilityChange = () => {
      isPageVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      controls.dispose();
      transform.detach();
      transform.dispose();
      if (modelRef.current) disposeObject(modelRef.current);
      if (buildPlateRef.current) disposeObject(buildPlateRef.current);
      renderer.dispose();
      if (renderer.domElement.parentElement === viewport) {
        viewport.removeChild(renderer.domElement);
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
    const center = box.getCenter(new THREE.Vector3());

    // Keep the model's lowest point on the build plate instead of centering it through the grid.
    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= box.min.y;
    object.position.y += MODEL_BED_CLEARANCE;

    const bed = selectedBedRef.current;
    const objectBox = new THREE.Box3().setFromObject(object);
    const sceneBox = new THREE.Box3(
      new THREE.Vector3(-bed.x / 2, 0, -bed.z / 2),
      new THREE.Vector3(bed.x / 2, Math.max(1, objectBox.max.y), bed.z / 2),
    );
    sceneBox.union(objectBox);
    const sceneCenter = sceneBox.getCenter(new THREE.Vector3());
    const sceneSphere = sceneBox.getBoundingSphere(new THREE.Sphere());
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const limitingFov = Math.min(verticalFov, horizontalFov);
    const cameraDistance = (sceneSphere.radius / Math.sin(limitingFov / 2)) * 1.12;
    const cameraDirection = new THREE.Vector3(1.05, 0.82, 1.05).normalize();

    camera.position.copy(sceneCenter).add(cameraDirection.multiplyScalar(cameraDistance));
    camera.near = Math.max(0.1, cameraDistance / 100);
    camera.far = cameraDistance + sceneSphere.radius * 5;
    camera.updateProjectionMatrix();
    controls.target.copy(sceneCenter);
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
      color: "#35ad7d",
      metalness: 0.06,
      roughness: 0.5,
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

      <div className="overflow-hidden rounded-xl border border-[#c7cecd] bg-[#e3e8e7] text-slate-900 shadow-xl shadow-slate-900/10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d3d9d8] bg-[#f6f8f8] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#dcecea] text-[#17645e]"><Box size={17} aria-hidden /></span>
              <h2 className="font-semibold">{translate("quoteViewer", locale)}</h2>
            </div>
            <p className="mt-2 text-xs text-slate-500">{translate("quoteViewerHelp", locale)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#b6d3cf] bg-[#e8f3f1] px-3 py-1 text-xs font-semibold text-[#17645e]">{translate("quoteStlBadge", locale)}</span>
            <button className="inline-flex items-center gap-2 rounded-md border border-[#b8c2c1] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#4b8b85] hover:text-[#17645e]" type="button" onClick={resetView}>
              <Crosshair size={14} aria-hidden />
              {translate("quoteResetView", locale)}
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-md border border-white/70 bg-white/85 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
            <span className="font-semibold text-slate-900">{translate("quoteBuildPlate", locale)}</span>
            <span className="ml-2 text-[#17645e]">{selectedBed.label}</span>
          </div>
          <div ref={containerRef} className="h-[560px] w-full sm:h-[640px]" aria-label="Interactive 3D file viewer" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d3d9d8] bg-[#f6f8f8] px-5 py-3">
          <p className="text-sm text-slate-500">{translate(previewNote, locale)}</p>
          <div className="flex items-center gap-3 text-xs text-slate-600">
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
  model.position.y += MODEL_BED_CLEARANCE;
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
    color: "#35ad7d",
    metalness: 0.08,
    roughness: 0.48,
  });
  // The sample occupies exactly 50 mm on X, so its scale is meaningful against every bed.
  const base = new THREE.Mesh(new THREE.BoxGeometry(50, 4, 34), material);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 10, 28, 48), material);
  tower.position.set(-10, 16, 0);
  const cap = new THREE.Mesh(new THREE.TorusGeometry(11, 2, 16, 64), material);
  cap.position.set(12, 12, 0);
  cap.rotation.x = Math.PI / 2;
  group.add(base, tower, cap);
  return group;
}

function createBuildPlate(width: number, depth: number) {
  const group = new THREE.Group();
  const displayWidth = Math.max(8, width);
  const displayDepth = Math.max(8, depth);
  const cornerRadius = Math.min(displayWidth, displayDepth) * 0.035;
  const bodyShape = roundedRectangleShape(displayWidth + 10, displayDepth + 10, cornerRadius + 4);
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bodyShape, { depth: 0.9, bevelEnabled: true, bevelSize: 0.7, bevelThickness: 0.25, bevelSegments: 3 }),
    new THREE.MeshStandardMaterial({ color: "#252b2d", roughness: 0.62, metalness: 0.32 }),
  );
  body.rotation.x = -Math.PI / 2;
  body.position.y = -1.02;
  group.add(body);

  const plateShape = roundedRectangleShape(displayWidth, displayDepth, cornerRadius);
  const plate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(plateShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.05, bevelSegments: 3 }),
    new THREE.MeshStandardMaterial({ color: "#414849", roughness: 0.8, metalness: 0.16 }),
  );
  plate.renderOrder = 0;
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = -0.18;
  group.add(plate);

  const gridDivisions = Math.max(10, Math.round(Math.max(displayWidth, displayDepth) / 10));
  const grid = new THREE.GridHelper(Math.max(displayWidth, displayDepth), gridDivisions, "#e4a72d", "#697374");
  grid.scale.set(displayWidth / Math.max(displayWidth, displayDepth), 1, displayDepth / Math.max(displayWidth, displayDepth));
  grid.position.y = 0.008;
  grid.renderOrder = 1;
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMaterials.forEach((material) => {
    material.depthWrite = false;
    material.transparent = true;
    material.opacity = 0.76;
  });
  group.add(grid);

  const printableArea = roundedRectangleShape(displayWidth - 8, displayDepth - 8, Math.max(2, cornerRadius - 3));
  const printableBoundary = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      printableArea.getSpacedPoints(128).map((point) => new THREE.Vector3(point.x, 0, point.y)),
    ),
    new THREE.LineBasicMaterial({ color: "#cbd2d1", transparent: true, opacity: 0.72, depthWrite: false }),
  );
  printableBoundary.position.y = 0.014;
  printableBoundary.renderOrder = 2;
  group.add(printableBoundary);

  const origin = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.35, 32),
    new THREE.MeshBasicMaterial({ color: "#efb43c", side: THREE.DoubleSide, depthWrite: false }),
  );
  origin.rotation.x = -Math.PI / 2;
  origin.position.y = 0.018;
  origin.renderOrder = 3;
  group.add(origin);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(plate.geometry),
    new THREE.LineBasicMaterial({ color: "#202628" }),
  );
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = -0.18;
  edge.renderOrder = 2;
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
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}
