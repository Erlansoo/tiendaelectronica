"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, BoxSelect, Crosshair, MousePointer2, Rotate3D, Trash2, ZoomIn } from "lucide-react";
import * as THREE from "three";
import { OrbitControls, STLLoader, TransformControls } from "three-stdlib";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useLocale } from "@/components/useLocale";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_MODELS = 5;
const MODEL_BED_CLEARANCE = 0.025;
const allowedExtensions = [".stl", ".obj", ".step", ".stp", ".3mf"];
const scalePresets = [1, 0.1, 0.01, 0.001];
const modelColors = ["#35ad7d", "#4f8edc", "#d88a35", "#9b6bd6", "#d65f78"];
const fdmPrinterBeds = [
  { label: "200 x 200 x 200 mm", x: 200, y: 200, z: 200 },
  { label: "250 x 250 x 250 mm", x: 250, y: 250, z: 250 },
  { label: "300 x 300 x 300 mm", x: 300, y: 300, z: 300 },
  { label: "400 x 400 x 400 mm", x: 400, y: 400, z: 400 },
];
const resinPrinterBeds = [
  { label: "Anycubic Photon Mono X 4K · 192 x 120 x 245 mm", x: 192, y: 245, z: 120 },
];

type Dimensions = {
  x: number;
  y: number;
  z: number;
};

type ModelEntry = {
  id: string;
  file: File;
  name: string;
  color: string;
  previewable: boolean;
  dimensions: Dimensions | null;
  scaleFactor: number;
  copyCount: number;
  baseSolidVolumeMm3: number | null;
  solidVolumeMm3: number | null;
  occupiedVolumeMm3: number | null;
  fitsBed: boolean;
};

export function PrintQuoteWorkspace() {
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const modelsRef = useRef<Map<string, THREE.Group>>(new Map());
  const placeholderRef = useRef<THREE.Group | null>(null);
  const selectionBoxRef = useRef<THREE.BoxHelper | null>(null);
  const buildPlateRef = useRef<THREE.Group | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const selectedBedRef = useRef(fdmPrinterBeds[1]);
  const selectedModelIdRef = useRef<string | null>(null);
  const placementModeRef = useRef<"automatic" | "manual">("automatic");
  const faceSelectionModeRef = useRef(false);
  const directDraggingRef = useRef(false);
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [previewNote, setPreviewNote] = useState<TranslationKey>("quotePreviewPrompt");
  const [bedIndex, setBedIndex] = useState(1);
  const [printTechnology, setPrintTechnology] = useState<"fdm" | "resin">("fdm");
  const [material, setMaterial] = useState("pla");
  const [placementMode, setPlacementMode] = useState<"automatic" | "manual">("automatic");
  const [qualityPreset, setQualityPreset] = useState<"draft" | "standard" | "detail">("standard");
  const [isSelectingSupportFace, setIsSelectingSupportFace] = useState(false);
  const [manualPosition, setManualPosition] = useState({ x: 0, y: 0 });
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const availablePrinterBeds = printTechnology === "resin" ? resinPrinterBeds : fdmPrinterBeds;
  const selectedBed = availablePrinterBeds[bedIndex] ?? availablePrinterBeds[0];
  const materialOptions = printTechnology === "resin"
    ? [
        { value: "pla-like-resin", label: translate("quotePlaLikeResin", locale) },
        { value: "standard-resin", label: translate("quoteStandardResin", locale) },
        { value: "abs-like-resin", label: translate("quoteAbsLikeResin", locale) },
        { value: "tough-resin", label: translate("quoteToughResin", locale) },
        { value: "water-wash-resin", label: translate("quoteWaterWashResin", locale) },
        { value: "high-temp-resin", label: translate("quoteHighTempResin", locale) },
        { value: "castable-resin", label: translate("quoteCastableResin", locale) },
      ]
    : [
        { value: "pla", label: "PLA" },
        { value: "petg", label: "PETG" },
        { value: "abs", label: "ABS" },
        { value: "asa", label: "ASA" },
        { value: "tpu", label: "TPU" },
        { value: "nylon", label: "Nylon / PA" },
        { value: "pc", label: "PC" },
      ];
  const basicLayerHeights = printTechnology === "resin"
    ? { draft: "0.10 mm", standard: "0.05 mm", detail: "0.03 mm" }
    : { draft: "0.28 mm", standard: "0.20 mm", detail: "0.12 mm" };
  selectedBedRef.current = selectedBed;
  selectedModelIdRef.current = selectedModelId;
  placementModeRef.current = placementMode;
  faceSelectionModeRef.current = isSelectingSupportFace;
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? null;
  const dimensions = selectedModel?.dimensions ?? null;
  const scaleFactor = selectedModel?.scaleFactor ?? 1;
  const copyCount = selectedModel?.copyCount ?? 1;
  const fileSummary = useMemo(() => {
    if (models.length === 0) return translate("quoteNoFile", locale);
    const totalSize = models.reduce((total, model) => total + model.file.size, 0);
    return `${models.length}/${MAX_MODELS} · ${(totalSize / 1024 / 1024).toFixed(2)} MB`;
  }, [models, locale]);
  const scaledDimensions = dimensions
    ? {
        x: dimensions.x * scaleFactor,
        y: dimensions.y * scaleFactor,
        z: dimensions.z * scaleFactor,
      }
    : null;
  const suggestedScale = dimensions ? suggestScale(dimensions, selectedBed) : 1;
  const fitsSelectedBed = models.every((model) => model.fitsBed);
  const modelLooksTiny = scaledDimensions
    ? Math.max(scaledDimensions.x, scaledDimensions.y, scaledDimensions.z) > 0 &&
      Math.max(scaledDimensions.x, scaledDimensions.y, scaledDimensions.z) < 5
    : false;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const viewport = container;
    const modelInstances = modelsRef.current;

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
    placeholderRef.current = placeholder;
    modelRef.current = placeholder;
    scene.add(placeholder);
    autoPlaceModel(placeholder, selectedBedRef.current);
    frameModel(placeholder);

    const transform = new TransformControls(camera, renderer.domElement);
    transform.setMode("translate");
    transform.setSpace("world");
    transform.setTranslationSnap(1);
    const transformAxes = transform as unknown as { showX: boolean; showY: boolean; showZ: boolean };
    transformAxes.showX = true;
    transformAxes.showY = false;
    transformAxes.showZ = true;
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
      const selectedId = selectedModelIdRef.current;
      if (selectedId) syncModelMetrics(selectedId);
    });
    transformRef.current = transform;
    scene.add(transform);

    let frameId = 0;
    let isInViewport = true;
    let isPageVisible = document.visibilityState === "visible";
    function animate() {
      if (isInViewport && isPageVisible) {
        controls.update();
        selectionBoxRef.current?.update();
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

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const intersectionPoint = new THREE.Vector3();
    const bedPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const dragOffset = new THREE.Vector3();
    const hoverMaterials = new Map<THREE.MeshStandardMaterial, { emissive: number; intensity: number }>();
    let hoveredModel: THREE.Group | null = null;
    let draggingModel: THREE.Group | null = null;
    let draggingPointerId: number | null = null;
    let pointerStart = { x: 0, y: 0, button: -1 };

    function updateRay(clientX: number, clientY: number) {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return true;
    }

    function pickModel(clientX: number, clientY: number) {
      if (!updateRay(clientX, clientY)) return null;
      let closestModel: THREE.Group | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const model of modelInstances.values()) {
        const box = new THREE.Box3().setFromObject(model);
        const hit = raycaster.ray.intersectBox(box, intersectionPoint);
        if (!hit) continue;
        const distance = raycaster.ray.origin.distanceTo(hit);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestModel = model;
        }
      }
      return closestModel;
    }

    function clearHover() {
      hoverMaterials.forEach((original, material) => {
        material.emissive.setHex(original.emissive);
        material.emissiveIntensity = original.intensity;
      });
      hoverMaterials.clear();
      hoveredModel = null;
    }

    function highlightModel(model: THREE.Group | null) {
      if (model === hoveredModel) return;
      clearHover();
      hoveredModel = model;
      if (!model) {
        renderer.domElement.style.cursor = "default";
        return;
      }
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (!(material instanceof THREE.MeshStandardMaterial) || hoverMaterials.has(material)) return;
          hoverMaterials.set(material, {
            emissive: material.emissive.getHex(),
            intensity: material.emissiveIntensity,
          });
          material.emissive.set("#f0a72f");
          material.emissiveIntensity = 0.48;
        });
      });
      renderer.domElement.style.cursor = "grab";
    }

    function activateModel(model: THREE.Group, showTransform: boolean) {
      const id = model.userData.modelId;
      if (typeof id !== "string") return;
      selectedModelIdRef.current = id;
      setSelectedModelId(id);
      modelRef.current = model;
      transform.detach();
      transform.attach(model);
      transform.visible = showTransform && placementModeRef.current === "manual";
      replaceSelectionBox(scene, selectionBoxRef, model);
      setManualPosition({
        x: Number(model.position.x.toFixed(1)),
        y: Number(model.position.z.toFixed(1)),
      });
    }

    function finishRightDrag(event?: PointerEvent) {
      const model = draggingModel;
      const id = typeof model?.userData.modelId === "string" ? model.userData.modelId : null;
      draggingModel = null;
      directDraggingRef.current = false;
      controls.enabled = true;
      if (model) {
        constrainToBuildPlate(model, selectedBedRef.current);
        transform.detach();
        transform.attach(model);
        transform.visible = true;
        selectionBoxRef.current?.update();
        setManualPosition({
          x: Number(model.position.x.toFixed(1)),
          y: Number(model.position.z.toFixed(1)),
        });
      }
      if (id) {
        setModels((current) => refreshModelMetrics(current, modelInstances, selectedBedRef.current, id));
      }
      if (event && renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      draggingPointerId = null;
      renderer.domElement.style.cursor = hoveredModel ? "grab" : "default";
    }

    const handlePointerDown = (event: PointerEvent) => {
      pointerStart = { x: event.clientX, y: event.clientY, button: event.button };
      if (event.button === 0 && placementModeRef.current === "manual" && faceSelectionModeRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        controls.enabled = false;
        renderer.domElement.style.cursor = "crosshair";
        return;
      }
      if (event.button !== 2) return;
      const model = pickModel(event.clientX, event.clientY);
      if (!model || placementModeRef.current !== "manual") return;
      const modelId = typeof model.userData.modelId === "string" ? model.userData.modelId : null;
      if (!modelId) return;
      if (selectedModelIdRef.current !== modelId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        activateModel(model, true);
        highlightModel(model);
        return;
      }
      if (!updateRay(event.clientX, event.clientY) || !raycaster.ray.intersectPlane(bedPlane, intersectionPoint)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      directDraggingRef.current = true;
      activateModel(model, false);
      draggingModel = model;
      draggingPointerId = event.pointerId;
      dragOffset.set(model.position.x - intersectionPoint.x, 0, model.position.z - intersectionPoint.z);
      controls.enabled = false;
      transform.visible = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (draggingModel && draggingPointerId === event.pointerId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (updateRay(event.clientX, event.clientY) && raycaster.ray.intersectPlane(bedPlane, intersectionPoint)) {
          draggingModel.position.x = intersectionPoint.x + dragOffset.x;
          draggingModel.position.z = intersectionPoint.z + dragOffset.z;
          constrainToBuildPlate(draggingModel, selectedBedRef.current);
          selectionBoxRef.current?.update();
          setManualPosition({
            x: Number(draggingModel.position.x.toFixed(1)),
            y: Number(draggingModel.position.z.toFixed(1)),
          });
        }
        return;
      }
      highlightModel(pickModel(event.clientX, event.clientY));
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (draggingModel && draggingPointerId === event.pointerId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        finishRightDrag(event);
        highlightModel(pickModel(event.clientX, event.clientY));
        return;
      }
      if (event.button === 0 && pointerStart.button === 0 && placementModeRef.current === "manual" && faceSelectionModeRef.current) {
        controls.enabled = true;
        if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) {
          renderer.domElement.style.cursor = "crosshair";
          return;
        }
        const selectedId = selectedModelIdRef.current;
        const selectedGroup = selectedId ? modelInstances.get(selectedId) : null;
        if (selectedGroup && updateRay(event.clientX, event.clientY)) {
          const faceHit = raycaster
            .intersectObject(selectedGroup, true)
            .find((hit) => hit.face && hit.object instanceof THREE.Mesh);
          if (faceHit?.face) {
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(faceHit.object.matrixWorld);
            const worldNormal = faceHit.face.normal.clone().applyNormalMatrix(normalMatrix).normalize();
            const alignment = new THREE.Quaternion().setFromUnitVectors(
              worldNormal,
              new THREE.Vector3(0, -1, 0),
            );
            selectedGroup.quaternion.premultiply(alignment);
            selectedGroup.updateMatrixWorld(true);
            constrainToBuildPlate(selectedGroup, selectedBedRef.current);
            selectionBoxRef.current?.update();
            setManualPosition({
              x: Number(selectedGroup.position.x.toFixed(1)),
              y: Number(selectedGroup.position.z.toFixed(1)),
            });
            setModels((current) =>
              refreshModelMetrics(current, modelInstances, selectedBedRef.current, selectedId ?? undefined),
            );
            faceSelectionModeRef.current = false;
            setIsSelectingSupportFace(false);
            transform.visible = true;
            renderer.domElement.style.cursor = "grab";
            return;
          }
        }
        renderer.domElement.style.cursor = "crosshair";
        return;
      }
      if (
        event.button === 0 &&
        pointerStart.button === 0 &&
        Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) <= 6
      ) {
        const model = pickModel(event.clientX, event.clientY);
        if (model) activateModel(model, true);
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (draggingPointerId === event.pointerId) finishRightDrag(event);
      controls.enabled = true;
    };
    const handlePointerLeave = () => {
      if (!draggingModel) clearHover();
    };
    const handleContextMenu = (event: MouseEvent) => event.preventDefault();

    renderer.domElement.addEventListener("pointerdown", handlePointerDown, true);
    renderer.domElement.addEventListener("pointermove", handlePointerMove, true);
    renderer.domElement.addEventListener("pointerup", handlePointerUp, true);
    renderer.domElement.addEventListener("pointercancel", handlePointerCancel, true);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("contextmenu", handleContextMenu);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown, true);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove, true);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp, true);
      renderer.domElement.removeEventListener("pointercancel", handlePointerCancel, true);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("contextmenu", handleContextMenu);
      clearHover();
      controls.enabled = true;
      controls.dispose();
      transform.detach();
      transform.dispose();
      replaceSelectionBox(scene, selectionBoxRef, null);
      modelInstances.forEach((model) => disposeObject(model));
      modelInstances.clear();
      if (placeholderRef.current) disposeObject(placeholderRef.current);
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
    if (modelsRef.current.size > 0) {
      if (placementModeRef.current === "automatic") arrangeModelsOnBuildPlate(modelsRef.current, selectedBed);
      else modelsRef.current.forEach((model) => constrainToBuildPlate(model, selectedBed));
      setModels((current) => refreshModelMetrics(current, modelsRef.current, selectedBed));
    } else if (placeholderRef.current) {
      autoPlaceModel(placeholderRef.current, selectedBed);
    }
    frameModel(modelRef.current ?? undefined);
  }, [selectedBed]);

  useEffect(() => {
    const transform = transformRef.current;
    if (!transform) return;
    transform.visible = placementMode === "manual" && Boolean(selectedModelIdRef.current) && Boolean(modelRef.current) && !directDraggingRef.current;
    if (placementMode === "automatic") {
      faceSelectionModeRef.current = false;
      arrangeModelsOnBuildPlate(modelsRef.current, selectedBedRef.current);
      setModels((current) => refreshModelMetrics(current, modelsRef.current, selectedBedRef.current));
      frameModel(modelRef.current ?? undefined);
    }
  }, [placementMode]);

  function frameModel(fallbackObject?: THREE.Object3D) {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const bed = selectedBedRef.current;
    const sceneBox = new THREE.Box3(
      new THREE.Vector3(-bed.x / 2, 0, -bed.z / 2),
      new THREE.Vector3(bed.x / 2, 1, bed.z / 2),
    );
    if (modelsRef.current.size > 0) {
      modelsRef.current.forEach((model) => sceneBox.union(new THREE.Box3().setFromObject(model)));
    } else if (fallbackObject) {
      sceneBox.union(new THREE.Box3().setFromObject(fallbackObject));
    }
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

  function updateSelectionBox(model: THREE.Group | null) {
    const scene = sceneRef.current;
    if (!scene) return;
    replaceSelectionBox(scene, selectionBoxRef, model);
  }

  function selectModel(id: string) {
    const model = modelsRef.current.get(id) ?? null;
    setSelectedModelId(id);
    modelRef.current = model;
    const transform = transformRef.current;
    if (transform) {
      transform.detach();
      if (model) transform.attach(model);
      transform.visible = Boolean(model) && placementMode === "manual";
    }
    updateSelectionBox(model);
    setManualPosition({
      x: Number((model?.position.x ?? 0).toFixed(1)),
      y: Number((model?.position.z ?? 0).toFixed(1)),
    });
  }

  function removePlaceholder() {
    const placeholder = placeholderRef.current;
    const scene = sceneRef.current;
    if (!placeholder || !scene) return;
    scene.remove(placeholder);
    disposeObject(placeholder);
    placeholderRef.current = null;
    if (modelRef.current === placeholder) modelRef.current = null;
  }

  function restorePlaceholder() {
    const scene = sceneRef.current;
    if (!scene || placeholderRef.current) return;
    const placeholder = wrapModel(createPlaceholderModel());
    placeholderRef.current = placeholder;
    modelRef.current = placeholder;
    autoPlaceModel(placeholder, selectedBedRef.current);
    scene.add(placeholder);
    transformRef.current?.detach();
    if (transformRef.current) transformRef.current.visible = false;
    updateSelectionBox(null);
    frameModel(placeholder);
  }

  function syncModelMetrics(id: string) {
    setModels((current) => refreshModelMetrics(current, modelsRef.current, selectedBedRef.current, id));
  }

  function syncAllModelMetrics() {
    setModels((current) => refreshModelMetrics(current, modelsRef.current, selectedBedRef.current));
  }

  function applyModelScale(nextScale: number) {
    if (!selectedModelId) return;
    const safeScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
    const model = modelsRef.current.get(selectedModelId);
    if (!model) return;
    setModels((current) => current.map((entry) => entry.id === selectedModelId ? { ...entry, scaleFactor: safeScale } : entry));
    model.scale.setScalar(safeScale);
    if (placementMode === "automatic") {
      arrangeModelsOnBuildPlate(modelsRef.current, selectedBed);
      frameModel(model);
    } else {
      constrainToBuildPlate(model, selectedBed);
    }
    syncAllModelMetrics();
  }

  function resetView() {
    frameModel(modelRef.current ?? placeholderRef.current ?? undefined);
  }

  function setPlacementPosition(axis: "x" | "y", value: number) {
    const model = modelRef.current;
    if (!model || !Number.isFinite(value)) return;
    if (axis === "x") model.position.x = value;
    else model.position.z = value;
    constrainToBuildPlate(model, selectedBed);
    setManualPosition({ x: Number(model.position.x.toFixed(1)), y: Number(model.position.z.toFixed(1)) });
    if (selectedModelId) syncModelMetrics(selectedModelId);
  }

  function rotateModel() {
    const model = modelRef.current;
    if (!model) return;
    model.rotation.y += Math.PI / 2;
    if (placementMode === "automatic") {
      arrangeModelsOnBuildPlate(modelsRef.current, selectedBed);
      frameModel(model);
    } else {
      constrainToBuildPlate(model, selectedBed);
    }
    syncAllModelMetrics();
  }

  function orientModel(axis: "x" | "y" | "z", angle: number) {
    const model = modelRef.current;
    if (!model || placementMode !== "manual") return;
    if (axis === "x") model.rotateX(angle);
    if (axis === "y") model.rotateY(angle);
    if (axis === "z") model.rotateZ(angle);
    model.updateMatrixWorld(true);
    constrainToBuildPlate(model, selectedBed);
    updateSelectionBox(model);
    if (selectedModelId) syncModelMetrics(selectedModelId);
  }

  function toggleSupportFaceSelection() {
    if (!selectedModel?.previewable || placementMode !== "manual") return;
    const nextValue = !isSelectingSupportFace;
    faceSelectionModeRef.current = nextValue;
    setIsSelectingSupportFace(nextValue);
    if (transformRef.current) transformRef.current.visible = !nextValue;
  }

  function changePlacementMode(mode: "automatic" | "manual") {
    faceSelectionModeRef.current = false;
    setIsSelectingSupportFace(false);
    setPlacementMode(mode);
  }

  function changePrintTechnology(technology: "fdm" | "resin") {
    setPrintTechnology(technology);
    setBedIndex(technology === "resin" ? 0 : 1);
    setMaterial(technology === "resin" ? "standard-resin" : "pla");
  }

  function setCopies(nextCount: number) {
    const model = modelRef.current;
    if (!model || !selectedModelId) return;
    const safeCount = Math.max(1, Math.min(12, Math.round(nextCount) || 1));
    arrangeCopies(model, safeCount, selectedBed);
    setModels((current) => current.map((entry) => entry.id === selectedModelId ? { ...entry, copyCount: safeCount } : entry));
    if (placementMode === "automatic") {
      arrangeModelsOnBuildPlate(modelsRef.current, selectedBed);
      frameModel(model);
    } else {
      constrainToBuildPlate(model, selectedBed);
    }
    syncAllModelMetrics();
  }

  async function createStlEntry(selected: File, id: string, color: string) {
    const buffer = await selected.arrayBuffer();
    const geometry = new STLLoader().parse(buffer);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const solidVolumeMm3 = calculateGeometryVolume(geometry);
    // STL files often preserve an authoring origin far away from the mesh.
    // Centering the geometry keeps the model pivot and transform axes inside its bounds.
    geometry.center();
    geometry.computeBoundingBox();
    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.06,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
    const detectedDimensions = {
      x: Math.abs(size.x),
      y: Math.abs(size.y),
      z: Math.abs(size.z),
    };
    const recommendedScale = suggestScale(detectedDimensions, selectedBed);
    const model = wrapModel(mesh);
    model.userData.modelId = id;
    model.scale.setScalar(recommendedScale);

    const entry: ModelEntry = {
      id,
      file: selected,
      name: selected.name,
      color,
      previewable: true,
      dimensions: detectedDimensions,
      scaleFactor: recommendedScale,
      copyCount: 1,
      baseSolidVolumeMm3: solidVolumeMm3,
      solidVolumeMm3: solidVolumeMm3 * Math.pow(recommendedScale, 3),
      occupiedVolumeMm3: null,
      fitsBed: true,
    };
    return { entry, model };
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const incomingFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    setError(null);
    if (incomingFiles.length === 0) return;
    const availableSlots = MAX_MODELS - models.length;
    if (availableSlots <= 0) {
      setError("quoteMaxModels");
      return;
    }

    setIsLoadingModels(true);
    const acceptedEntries: ModelEntry[] = [];
    const loadedModels: Array<{ id: string; model: THREE.Group }> = [];
    let rejection: TranslationKey | null = incomingFiles.length > availableSlots ? "quoteMaxModels" : null;

    for (const selected of incomingFiles.slice(0, availableSlots)) {
      const lowerName = selected.name.toLowerCase();
      const validExtension = allowedExtensions.some((extension) => lowerName.endsWith(extension));
      if (!validExtension) {
        rejection ??= "quoteInvalidFile";
        continue;
      }
      if (selected.size > MAX_FILE_SIZE) {
        rejection ??= "quoteFileTooLarge";
        continue;
      }

      const id = crypto.randomUUID();
      const color = modelColors[(models.length + acceptedEntries.length) % modelColors.length];
      if (lowerName.endsWith(".stl")) {
        try {
          const loaded = await createStlEntry(selected, id, color);
          acceptedEntries.push(loaded.entry);
          loadedModels.push({ id, model: loaded.model });
        } catch {
          rejection ??= "quoteStlReadError";
        }
      } else {
        acceptedEntries.push({
          id,
          file: selected,
          name: selected.name,
          color,
          previewable: false,
          dimensions: null,
          scaleFactor: 1,
          copyCount: 1,
          baseSolidVolumeMm3: null,
          solidVolumeMm3: null,
          occupiedVolumeMm3: null,
          fitsBed: true,
        });
      }
    }

    if (acceptedEntries.length > 0) {
      removePlaceholder();
      const scene = sceneRef.current;
      loadedModels.forEach(({ id, model }) => {
        modelsRef.current.set(id, model);
        scene?.add(model);
      });
      if (placementModeRef.current === "automatic") {
        arrangeModelsOnBuildPlate(modelsRef.current, selectedBed);
      } else {
        placeNewModelsWithoutMovingExisting(
          loadedModels.map(({ model }) => model),
          modelsRef.current,
          selectedBed,
        );
      }
      setModels((current) => [...current, ...acceptedEntries]);
      syncAllModelMetrics();
      const firstSelectable = acceptedEntries.find((entry) => entry.previewable) ?? acceptedEntries[0];
      selectModel(firstSelectable.id);
      setPreviewNote(loadedModels.length > 0 ? "quotePreviewLoaded" : "quotePreviewUnavailable");
      frameModel(modelsRef.current.get(firstSelectable.id));
    }
    setError(rejection);
    setIsLoadingModels(false);
  }

  function removeModel(id: string) {
    setError(null);
    const scene = sceneRef.current;
    const model = modelsRef.current.get(id);
    if (model) {
      scene?.remove(model);
      modelsRef.current.delete(id);
      disposeObject(model);
    }
    const remaining = models.filter((entry) => entry.id !== id);
    setModels(remaining);
    if (selectedModelId === id) {
      const next = remaining[0] ?? null;
      if (next) selectModel(next.id);
      else {
        setSelectedModelId(null);
        selectedModelIdRef.current = null;
        transformRef.current?.detach();
        updateSelectionBox(null);
        restorePlaceholder();
        setPreviewNote("quotePreviewPrompt");
      }
    }
    if (remaining.length > 0 && placementMode === "automatic") {
      arrangeModelsOnBuildPlate(modelsRef.current, selectedBed);
      syncAllModelMetrics();
      frameModel(modelRef.current ?? undefined);
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
            disabled={isLoadingModels || models.length >= MAX_MODELS}
            multiple
            type="file"
            onChange={onFileChange}
          />
        </label>
        <p className="mt-2 text-sm text-neutral-500">{fileSummary}</p>
        {isLoadingModels ? <p className="mt-2 text-sm font-semibold text-[#17645e]">{translate("quoteLoadingModels", locale)}</p> : null}
        {error ? <p className="mt-2 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{translate(error, locale)}</p> : null}

        {models.length > 0 ? (
          <div className="mt-4 grid gap-2" aria-label={translate("quoteModelList", locale)}>
            {models.map((entry) => (
              <div
                className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                  entry.id === selectedModelId ? "border-[#2b7a72] bg-[#edf8f6] ring-1 ring-[#2b7a72]/20" : "border-neutral-200 bg-white"
                }`}
                key={entry.id}
              >
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" type="button" onClick={() => selectModel(entry.id)}>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">{entry.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {(entry.file.size / 1024 / 1024).toFixed(2)} MB · {entry.previewable ? translate("quoteReadyToArrange", locale) : translate("quoteManualReviewBadge", locale)}
                    </span>
                  </span>
                </button>
                <button
                  aria-label={`${translate("quoteRemoveModel", locale)} ${entry.name}`}
                  className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  type="button"
                  onClick={() => removeModel(entry.id)}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/70 shadow-inner">
          <div className="border-b border-neutral-200 bg-white px-4 py-3">
            <h3 className="font-semibold text-slate-950">{translate("quoteConfigurationPanel", locale)}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{translate("quoteConfigurationScrollHelp", locale)}</p>
          </div>
          <div className="max-h-[680px] overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable]">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-black">
            {translate("quotePrintTechnology", locale)}
            <select
              className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800"
              value={printTechnology}
              onChange={(event) => changePrintTechnology(event.target.value as "fdm" | "resin")}
            >
              <option value="fdm">{translate("quoteFdmTechnology", locale)}</option>
              <option value="resin">{translate("quoteResinTechnology", locale)}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-black">
            {translate("quotePrinterBed", locale)}
            <select
              className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800"
              value={bedIndex}
              onChange={(event) => setBedIndex(Number(event.target.value))}
            >
              {availablePrinterBeds.map((bed, index) => (
                <option key={bed.label} value={index}>
                  {bed.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-black">
            {translate("quoteMaterial", locale)}
            <select
              className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800"
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
            >
              {materialOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
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
          {placementMode === "automatic" ? (
            <label className="grid gap-1 text-sm font-semibold text-black">
              {translate("quoteQualityPreset", locale)}
              <select
                className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800"
                value={qualityPreset}
                onChange={(event) => setQualityPreset(event.target.value as "draft" | "standard" | "detail")}
              >
                <option value="draft">{translate("quoteQualityDraft", locale)} · {basicLayerHeights.draft}</option>
                <option value="standard">{translate("quoteQualityStandard", locale)} · {basicLayerHeights.standard}</option>
                <option value="detail">{translate("quoteQualityDetail", locale)} · {basicLayerHeights.detail}</option>
              </select>
            </label>
          ) : printTechnology === "fdm" ? (
            <>
              <label className="grid gap-1 text-sm font-semibold text-black">
                {translate("quoteInfill", locale)}
                <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
                  <option>20%</option>
                  <option>40%</option>
                  <option>60%</option>
                  <option>100%</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold text-black">
                {translate("quoteLayerHeight", locale)}
                <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
                  <option>{translate("quoteLayerStandard", locale)}</option>
                  <option>{translate("quoteLayerFine", locale)}</option>
                  <option>{translate("quoteLayerDraft", locale)}</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="grid gap-1 text-sm font-semibold text-black">
                {translate("quoteLayerHeight", locale)}
                <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
                  <option>{translate("quoteResinLayerStandard", locale)}</option>
                  <option>{translate("quoteResinLayerFine", locale)}</option>
                  <option>{translate("quoteResinLayerDraft", locale)}</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold text-black">
                {translate("quoteResinSupports", locale)}
                <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
                  <option>{translate("quoteSupportsAutomatic", locale)}</option>
                  <option>{translate("quoteSupportsLight", locale)}</option>
                  <option>{translate("quoteSupportsMedium", locale)}</option>
                  <option>{translate("quoteSupportsHeavy", locale)}</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold text-black">
                {translate("quoteResinHollowing", locale)}
                <select className="h-11 rounded-md border border-neutral-300 px-3 text-neutral-800">
                  <option>{translate("quoteResinSolid", locale)}</option>
                  <option>{translate("quoteResinHollow2", locale)}</option>
                  <option>{translate("quoteResinHollow3", locale)}</option>
                </select>
              </label>
            </>
          )}
        </div>

        <section className="mt-5 rounded-lg border border-[#b7d8d5] bg-[#f2fbfa] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">{translate("quotePlacement", locale)}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {translate(
                  placementMode === "automatic"
                    ? "quoteAutomaticHelp"
                    : printTechnology === "resin"
                      ? "quoteResinManualHelp"
                      : "quoteManualHelp",
                  locale,
                )}
              </p>
            </div>
            <div className="flex rounded-md border border-[#a8ccc8] bg-white p-1">
              <button
                className={`rounded px-3 py-2 text-sm font-semibold ${placementMode === "automatic" ? "bg-[#0f3d3d] text-white" : "text-slate-700"}`}
                disabled={modelsRef.current.size === 0}
                type="button"
                onClick={() => changePlacementMode("automatic")}
              >
                {translate("quoteAutomaticMode", locale)}
              </button>
              <button
                className={`rounded px-3 py-2 text-sm font-semibold ${placementMode === "manual" ? "bg-[#0f3d3d] text-white" : "text-slate-700"}`}
                disabled={!selectedModel?.previewable}
                type="button"
                onClick={() => changePlacementMode("manual")}
              >
                {translate("quoteManualMode", locale)}
              </button>
            </div>
          </div>

          {placementMode === "manual" ? (
            <div className="mt-4 rounded-lg border border-[#c9e2df] bg-white/70 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm font-semibold text-slate-800">
                  {translate("quotePositionX", locale)}
                  <input className="h-10 rounded-md border border-slate-300 bg-white px-3" step="1" type="number" value={manualPosition.x} onChange={(event) => setPlacementPosition("x", Number(event.target.value))} />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-800">
                  {translate("quotePositionY", locale)}
                  <input className="h-10 rounded-md border border-slate-300 bg-white px-3" step="1" type="number" value={manualPosition.y} onChange={(event) => setPlacementPosition("y", Number(event.target.value))} />
                </label>
                <button className="self-end rounded-md border border-[#558c87] bg-white px-3 py-2.5 text-sm font-semibold text-[#174946] hover:bg-[#dff4f1]" type="button" onClick={rotateModel}>
                  {translate("quoteRotateOnBed", locale)}
                </button>
              </div>
              <div className="mt-4 border-t border-[#d7e8e6] pt-4">
                <p className="text-sm font-semibold text-slate-900">{translate("quoteOrientation", locale)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {translate(printTechnology === "resin" ? "quoteResinOrientationHelp" : "quoteOrientationHelp", locale)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {printTechnology === "resin" ? (
                    <>
                      <button className="rounded-md border border-[#558c87] bg-white px-3 py-2 text-sm font-semibold text-[#174946] hover:bg-[#dff4f1]" type="button" onClick={() => orientModel("x", Math.PI / 6)}>
                        {translate("quoteTilt30", locale)}
                      </button>
                      <button className="rounded-md border border-[#558c87] bg-white px-3 py-2 text-sm font-semibold text-[#174946] hover:bg-[#dff4f1]" type="button" onClick={() => orientModel("z", Math.PI / 4)}>
                        {translate("quoteTilt45", locale)}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="rounded-md border border-[#558c87] bg-white px-3 py-2 text-sm font-semibold text-[#174946] hover:bg-[#dff4f1]" type="button" onClick={() => orientModel("x", Math.PI / 2)}>
                        {translate("quoteLayOnSide", locale)}
                      </button>
                      <button className="rounded-md border border-[#558c87] bg-white px-3 py-2 text-sm font-semibold text-[#174946] hover:bg-[#dff4f1]" type="button" onClick={() => orientModel("z", Math.PI / 2)}>
                        {translate("quoteLayOnFront", locale)}
                      </button>
                    </>
                  )}
                  <button className="rounded-md border border-[#558c87] bg-white px-3 py-2 text-sm font-semibold text-[#174946] hover:bg-[#dff4f1]" type="button" onClick={() => orientModel("x", Math.PI)}>
                    {translate("quoteFlipModel", locale)}
                  </button>
                  <button
                    aria-pressed={isSelectingSupportFace}
                    className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                      isSelectingSupportFace
                        ? "border-[#f5a524] bg-[#f5a524] text-black"
                        : "border-[#174946] bg-[#174946] text-white hover:bg-[#0f3533]"
                    }`}
                    type="button"
                    onClick={toggleSupportFaceSelection}
                  >
                    {translate(isSelectingSupportFace ? "quoteCancelFaceSelection" : "quoteChooseSupportFace", locale)}
                  </button>
                </div>
                {isSelectingSupportFace ? (
                  <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                    {translate("quoteChooseFacePrompt", locale)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {selectedModel?.previewable ? <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#c9e2df] pt-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              {translate("quoteCopies", locale)}
              <input className="h-10 w-24 rounded-md border border-slate-300 bg-white px-3" min={1} max={12} type="number" value={copyCount} onChange={(event) => setCopies(Number(event.target.value))} />
            </label>
            <p className="max-w-sm pb-2 text-sm text-slate-600">{translate("quoteCopiesHelp", locale)}</p>
          </div> : null}
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

            <div className="mt-4 grid gap-3 border-t border-neutral-200 pt-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[#c9dedb] bg-white p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Box size={16} className="text-[#2b7a72]" aria-hidden />
                  {translate("quoteSolidVolume", locale)}
                </div>
                <p className="mt-2 text-xl font-semibold text-slate-950">{formatVolume(selectedModel?.solidVolumeMm3)}</p>
                <p className="mt-1 text-xs text-slate-500">{translate("quoteSolidVolumeHelp", locale)}</p>
              </div>
              <div className="rounded-lg border border-[#ead9b4] bg-white p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <BoxSelect size={16} className="text-[#b27616]" aria-hidden />
                  {translate("quoteOccupiedVolume", locale)}
                </div>
                <p className="mt-2 text-xl font-semibold text-slate-950">{formatVolume(selectedModel?.occupiedVolumeMm3)}</p>
                <p className="mt-1 text-xs text-slate-500">{translate("quoteOccupiedVolumeHelp", locale)}</p>
              </div>
            </div>
            <p className="mt-3 rounded-md bg-[#eef5f4] p-3 text-sm text-slate-700">
              {translate(printTechnology === "resin" ? "quoteResinVolumeReference" : "quoteFdmVolumeReference", locale)}
            </p>
          </div>
        ) : null}

        <label className="mt-4 grid gap-1 text-sm font-semibold text-black">
          {translate("quoteNotes", locale)}
          <textarea className="min-h-28 rounded-md border border-neutral-300 px-3 py-2 text-neutral-800" placeholder={translate("quoteNotesPlaceholder", locale)} />
        </label>

        <button
          className="mt-5 w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f5a524] hover:text-black hover:shadow-xl hover:shadow-[#f5a524]/20 disabled:cursor-not-allowed disabled:bg-neutral-400"
          disabled={models.length === 0 || isLoadingModels || !fitsSelectedBed}
          type="button"
        >
          {translate("quoteSendRequest", locale)}
        </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#c7cecd] bg-[#e3e8e7] text-slate-900 shadow-xl shadow-slate-900/10 lg:sticky lg:top-24 lg:self-start">
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
          {selectedModel?.previewable ? (
            <aside
              aria-live="polite"
              className="pointer-events-none absolute right-3 top-16 z-10 w-[min(215px,calc(100%-1.5rem))] rounded-xl border border-white/80 bg-white/90 p-3 shadow-lg shadow-slate-900/10 backdrop-blur sm:right-4 sm:top-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b7a72]">
                {translate("quoteSelectedModel", locale)}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selectedModel.color }} aria-hidden />
                <p className="truncate text-xs font-semibold text-slate-900">{selectedModel.name}</p>
              </div>
              <div className="mt-3 grid gap-2">
                <div className="rounded-lg bg-[#edf7f4] px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-500">{translate("quoteModelVolumeShort", locale)}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-950">{formatVolume(selectedModel.solidVolumeMm3)}</p>
                </div>
                <div className="rounded-lg bg-[#fff5df] px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-500">{translate("quoteBoundingVolumeShort", locale)}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-950">{formatVolume(selectedModel.occupiedVolumeMm3)}</p>
                </div>
              </div>
            </aside>
          ) : null}
          <div ref={containerRef} className="h-[560px] w-full sm:h-[640px]" aria-label="Interactive 3D file viewer" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d3d9d8] bg-[#f6f8f8] px-5 py-3">
          <p className="text-sm text-slate-500">{translate(previewNote, locale)}</p>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5"><Rotate3D size={14} aria-hidden /> {translate("quoteOrbitControl", locale)}</span>
            <span className="inline-flex items-center gap-1.5"><MousePointer2 size={14} aria-hidden /> {translate("quotePanControl", locale)}</span>
            <span className="inline-flex items-center gap-1.5">
              <BoxSelect size={14} aria-hidden />
              {translate(placementMode === "manual" ? "quoteMoveModelControl" : "quoteAutoArrangeControl", locale)}
            </span>
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

function formatVolume(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (value < 1000) return `${value.toFixed(value >= 100 ? 1 : 2)} mm³`;
  const cubicCentimeters = value / 1000;
  return `${cubicCentimeters.toFixed(cubicCentimeters >= 100 ? 1 : 2)} cm³`;
}

function refreshModelMetrics(
  entries: ModelEntry[],
  modelInstances: Map<string, THREE.Group>,
  bed: Dimensions,
  onlyId?: string,
) {
  return entries.map((entry) => {
    if (onlyId && entry.id !== onlyId) return entry;
    const model = modelInstances.get(entry.id);
    if (!model) return entry;
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    return {
      ...entry,
      solidVolumeMm3: entry.baseSolidVolumeMm3 === null
        ? null
        : entry.baseSolidVolumeMm3 * Math.pow(entry.scaleFactor, 3) * entry.copyCount,
      occupiedVolumeMm3: Math.max(0, size.x * size.y * size.z),
      fitsBed: size.x <= bed.x && size.y <= bed.y && size.z <= bed.z,
    };
  });
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

function arrangeModelsOnBuildPlate(models: Map<string, THREE.Group>, bed: Dimensions) {
  const spacing = 6;
  const margin = 6;
  const availableWidth = Math.max(1, bed.x - margin * 2);
  const rows: Array<{ items: Array<{ model: THREE.Group; size: THREE.Vector3; min: THREE.Vector3 }>; width: number; depth: number }> = [];

  models.forEach((model) => {
    model.position.set(0, 0, 0);
    const seatedBox = new THREE.Box3().setFromObject(model);
    model.position.y -= seatedBox.min.y;
    model.position.y += MODEL_BED_CLEARANCE;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const item = { model, size, min: box.min.clone() };
    let row = rows[rows.length - 1];
    const requiredWidth = row ? row.width + spacing + size.x : size.x;
    if (!row || (row.items.length > 0 && requiredWidth > availableWidth)) {
      row = { items: [], width: 0, depth: 0 };
      rows.push(row);
    }
    row.width += (row.items.length > 0 ? spacing : 0) + size.x;
    row.depth = Math.max(row.depth, size.z);
    row.items.push(item);
  });

  const totalDepth = rows.reduce((total, row, index) => total + row.depth + (index > 0 ? spacing : 0), 0);
  let zCursor = -totalDepth / 2;
  rows.forEach((row) => {
    let xCursor = -row.width / 2;
    row.items.forEach(({ model, size, min }) => {
      model.position.x += xCursor - min.x;
      model.position.z += zCursor + (row.depth - size.z) / 2 - min.z;
      constrainToBuildPlate(model, bed);
      xCursor += size.x + spacing;
    });
    zCursor += row.depth + spacing;
  });
}

function placeNewModelsWithoutMovingExisting(
  newModels: THREE.Group[],
  allModels: Map<string, THREE.Group>,
  bed: Dimensions,
) {
  const newModelSet = new Set(newModels);
  const occupiedBoxes: THREE.Box3[] = [];
  allModels.forEach((model) => {
    if (!newModelSet.has(model)) occupiedBoxes.push(new THREE.Box3().setFromObject(model));
  });

  const gap = 5;
  const step = 10;
  const overlapsOccupiedSpace = (candidate: THREE.Box3) =>
    occupiedBoxes.some((occupied) =>
      candidate.min.x < occupied.max.x + gap &&
      candidate.max.x > occupied.min.x - gap &&
      candidate.min.z < occupied.max.z + gap &&
      candidate.max.z > occupied.min.z - gap,
    );

  newModels.forEach((model) => {
    autoPlaceModel(model, bed);
    const centeredBox = new THREE.Box3().setFromObject(model);
    const size = centeredBox.getSize(new THREE.Vector3());
    if (size.x > bed.x || size.z > bed.z) {
      occupiedBoxes.push(centeredBox);
      return;
    }

    const halfWidth = bed.x / 2;
    const halfDepth = bed.z / 2;
    const minCenterX = -halfWidth + size.x / 2;
    const maxCenterX = halfWidth - size.x / 2;
    const minCenterZ = -halfDepth + size.z / 2;
    const maxCenterZ = halfDepth - size.z / 2;
    const candidates: Array<{ x: number; z: number }> = [{ x: 0, z: 0 }];
    for (let z = minCenterZ; z <= maxCenterZ + 0.001; z += step) {
      for (let x = minCenterX; x <= maxCenterX + 0.001; x += step) {
        candidates.push({ x, z });
      }
    }
    candidates.sort((a, b) => a.x * a.x + a.z * a.z - (b.x * b.x + b.z * b.z));

    const currentCenter = centeredBox.getCenter(new THREE.Vector3());
    let placed = false;
    for (const candidate of candidates) {
      const delta = new THREE.Vector3(candidate.x - currentCenter.x, 0, candidate.z - currentCenter.z);
      const candidateBox = centeredBox.clone().translate(delta);
      if (overlapsOccupiedSpace(candidateBox)) continue;
      model.position.add(delta);
      constrainToBuildPlate(model, bed);
      placed = true;
      break;
    }

    if (!placed) autoPlaceModel(model, bed);
    occupiedBoxes.push(new THREE.Box3().setFromObject(model));
  });
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
  const worldScale = model.getWorldScale(new THREE.Vector3());
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const stepX = (sourceSize.x + spacing) / Math.max(Math.abs(worldScale.x), 0.000001);
  const stepZ = (sourceSize.z + spacing) / Math.max(Math.abs(worldScale.z), 0.000001);

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

function calculateGeometryVolume(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  if (!(position instanceof THREE.BufferAttribute) || position.count < 3) return 0;
  const index = geometry.getIndex();
  const triangleCount = Math.floor((index?.count ?? position.count) / 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const cross = new THREE.Vector3();
  let signedVolume = 0;

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = triangle * 3;
    const aIndex = index ? index.getX(offset) : offset;
    const bIndex = index ? index.getX(offset + 1) : offset + 1;
    const cIndex = index ? index.getX(offset + 2) : offset + 2;
    a.fromBufferAttribute(position, aIndex);
    b.fromBufferAttribute(position, bIndex);
    c.fromBufferAttribute(position, cIndex);
    cross.crossVectors(b, c);
    signedVolume += a.dot(cross) / 6;
  }

  return Math.abs(signedVolume);
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

function replaceSelectionBox(
  scene: THREE.Scene,
  selectionBox: { current: THREE.BoxHelper | null },
  model: THREE.Group | null,
) {
  if (selectionBox.current) {
    scene.remove(selectionBox.current);
    disposeObject(selectionBox.current);
    selectionBox.current = null;
  }
  if (!model) return;
  const helper = new THREE.BoxHelper(model, "#f0a72f");
  helper.material.depthTest = false;
  helper.material.transparent = true;
  helper.material.opacity = 0.9;
  helper.renderOrder = 20;
  selectionBox.current = helper;
  scene.add(helper);
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
