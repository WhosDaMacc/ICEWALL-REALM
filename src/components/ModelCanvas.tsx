import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Plain three.js renderer — deliberately NOT @react-three/fiber: fiber 9
// (via its `its-fine` dependency) statically references React.use, which
// React 18 does not export, so importing fiber breaks the production
// build outright (webpack: "'use' is not exported from 'react'").
// Plain three.js compiles and runs fine on React 18.
//
// The model is framed by its own bounding box: Tripo GLBs arrive at
// arbitrary scale and offset, so the scene re-scales to ~1.8 units tall
// (times `zoom`) and re-centres on the origin. Drag orbits, scroll zooms.
//
// Spin is time-based, not frame-based: the model itself rotates by
// elapsed seconds in the render loop. The first version used
// OrbitControls.autoRotate, which turns a fixed angle per update() call
// — at a healthy 60 fps that spins fine, but in a software-rendered or
// throttled browser the frame rate collapses and the model looks frozen
// (verified live: silhouette unchanged over 10 s). Rotating by delta
// time keeps one slow turn every ~18 s at any frame rate. The turn
// pauses while the user is dragging, so they always have full control.
const ModelCanvas: React.FC<{
  modelUrl: string;
  // Closer framing for models whose bounding box is dominated by a wide
  // span (the phoenix's wings), which otherwise reads small in the card.
  zoom?: number;
  onLoaded: () => void;
  onError: () => void;
}> = ({ modelUrl, zoom = 1, onLoaded, onError }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onLoaded, onError });
  callbacksRef.current = { onLoaded, onError };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let raf = 0;
    let cancelled = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let scene: THREE.Scene | null = null;
    let model: THREE.Group | null = null;
    let dragging = false;
    let lastTick = performance.now();

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      callbacksRef.current.onError();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      100
    );
    camera.position.set(0, 0.4, 3.4);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-4, 2, -3);
    scene.add(fill);

    controls = new OrbitControls(camera, renderer.domElement);
    // No autoRotate on the camera: the model turns itself by elapsed
    // time instead (see the tick loop), so the spin never depends on
    // frame rate. Dragging pauses the turn via the pointer listeners.
    controls.autoRotate = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 1.6;
    controls.maxDistance = 6;

    const onPointerDown = () => {
      dragging = true;
    };
    const onPointerUp = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerUp);

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      gltf => {
        if (cancelled || !scene) return;
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const max = Math.max(size.x, size.y, size.z) || 1;
        const scale = (1.8 * zoom) / max;
        gltf.scene.scale.setScalar(scale);
        gltf.scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        model = gltf.scene;
        scene.add(gltf.scene);
        callbacksRef.current.onLoaded();
      },
      undefined,
      () => {
        if (!cancelled) callbacksRef.current.onError();
      }
    );

    const onResize = () => {
      if (!mount || !renderer) return;
      const w = mount.clientWidth;
      const h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const tick = () => {
      if (cancelled) return;
      raf = requestAnimationFrame(tick);
      // Time-based turn: one slow revolution every ~18 s at any frame
      // rate. Clamped so a tab-switch stutter never jumps the model.
      const now = performance.now();
      const dt = Math.min((now - lastTick) / 1000, 0.1);
      lastTick = now;
      if (model && !dragging) model.rotation.y += dt * 0.35;
      controls?.update();
      if (renderer && scene) renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerUp);
      controls?.dispose();
      if (scene) {
        scene.traverse(obj => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(material)) material.forEach(m => m.dispose());
          else if (material) material.dispose();
        });
      }
      renderer?.dispose();
      if (renderer && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />;
};

export default ModelCanvas;
