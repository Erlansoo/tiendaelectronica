"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls, STLLoader } from "three-stdlib";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [previewNote, setPreviewNote] = useState("Upload an STL file to preview it here.");
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [bedIndex, setBedIndex] = useState(1);

  const selectedBed = printerBeds[bedIndex];
  const fileSummary = useMemo(() => {
    if (!file) return "No file selected";
    return `${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  }, [file]);
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

    const grid = new THREE.GridHelper(8, 32, "#ffffff", "#555555");
    scene.add(grid);
    scene.add(new THREE.AmbientLight("#ffffff", 1.2));
    const key = new THREE.DirectionalLight("#ffffff", 2.4);
    key.position.set(4, 5, 6);
    scene.add(key);

    const placeholder = createPlaceholderModel();
    modelRef.current = placeholder;
    scene.add(placeholder);
    frameModel(placeholder);

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
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  function frameModel(object: THREE.Object3D) {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    const distance = maxSize * 1.9;

    object.position.sub(center);
    camera.position.set(distance, distance * 0.75, distance);
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function replaceModel(object: THREE.Object3D) {
    const scene = sceneRef.current;
    if (!scene) return;
    if (modelRef.current) {
      scene.remove(modelRef.current);
      disposeObject(modelRef.current);
    }
    modelRef.current = object;
    scene.add(object);
    frameModel(object);
  }

  function applyModelScale(nextScale: number) {
    const safeScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
    setScaleFactor(safeScale);
    if (modelRef.current) {
      modelRef.current.scale.setScalar(safeScale);
      frameModel(modelRef.current);
    }
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
    setPreviewNote("STL preview loaded. Rotate, zoom and pan with your mouse.");
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError("");
    setFile(null);
    setDimensions(null);
    applyModelScale(1);

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

    if (lowerName.endsWith(".stl")) {
      await loadStlPreview(selected);
    } else {
      replaceModel(createPlaceholderModel());
      setPreviewNote("File accepted for quote. Preview is currently available for STL files.");
    }
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
      <div className="rounded-md border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-black">Quote your 3D print</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Upload a 3D file under 100 MB. STL dimensions are detected and checked against printer bed size.
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
            Printer bed
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
            Print technology
            <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
              <option>FDM / FFF filament</option>
              <option>MSLA resin</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-black">
            Material
            <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
              <option>PLA</option>
              <option>PETG</option>
              <option>ABS</option>
              <option>TPU</option>
              <option>Standard resin</option>
              <option>Tough resin</option>
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
              <option>Not applicable for resin</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-black">
            Layer height
            <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
              <option>0.20 mm standard</option>
              <option>0.12 mm fine</option>
              <option>0.28 mm draft</option>
              <option>Resin high detail</option>
            </select>
          </label>
        </div>

        {dimensions ? (
          <div className="mt-5 rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-black">Detected dimensions</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Original: X {formatMm(dimensions.x)} / Y {formatMm(dimensions.y)} / Z {formatMm(dimensions.z)}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Scaled: X {formatMm(scaledDimensions!.x)} / Y {formatMm(scaledDimensions!.y)} / Z {formatMm(scaledDimensions!.z)}
                </p>
              </div>
              <button
                className="rounded-full border border-black px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524]"
                type="button"
                onClick={() => applyModelScale(suggestedScale)}
              >
                Use suggested scale {suggestedScale}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="grid gap-1 text-sm font-semibold text-black">
                Scale factor
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
                This model is outside the selected printer bed. Choose a larger machine or apply a smaller scale.
              </p>
            ) : null}
            {modelLooksTiny ? (
              <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                This model looks extremely small. Confirm units or increase scale if the STL was exported in meters.
              </p>
            ) : null}
          </div>
        ) : null}

        <label className="mt-4 grid gap-1 text-sm font-semibold text-black">
          Notes
          <textarea className="min-h-28 rounded-md border border-neutral-300 px-3 py-2 text-neutral-800" placeholder="Dimensions, finish, deadline or special requirements." />
        </label>

        <button
          className="mt-5 w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f5a524] hover:text-black hover:shadow-xl hover:shadow-[#f5a524]/20 disabled:cursor-not-allowed disabled:bg-neutral-400"
          disabled={!file || Boolean(error) || !fitsSelectedBed}
          type="button"
        >
          Send quote request
        </button>
      </div>

      <div className="rounded-md border border-black/10 bg-black p-4 text-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <h2 className="font-semibold">3D file viewer</h2>
            <p className="mt-1 text-xs text-white/60">Rotate, zoom and pan the model.</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#f5a524]">STL preview</span>
        </div>
        <div ref={containerRef} className="h-[520px] w-full" aria-label="Interactive 3D file viewer" />
        <p className="border-t border-white/10 pt-3 text-sm text-white/70">{previewNote}</p>
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
