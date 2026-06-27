"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ThreeQuotePreview() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(3, 1.7, 4);
    camera.lookAt(0, 0.35, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

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
    group.position.y = -0.15;

    const grid = new THREE.GridHelper(5, 20, "#ffffff", "#555555");
    grid.position.y = -0.45;
    scene.add(grid);

    scene.add(new THREE.AmbientLight("#ffffff", 1.2));
    const key = new THREE.DirectionalLight("#ffffff", 2.6);
    key.position.set(3, 4, 5);
    scene.add(key);

    let frameId = 0;
    function animate() {
      group.rotation.y += 0.008;
      group.rotation.x = Math.sin(Date.now() * 0.001) * 0.04;
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
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="h-[360px] w-full" aria-label="3D print quotation preview" />;
}
