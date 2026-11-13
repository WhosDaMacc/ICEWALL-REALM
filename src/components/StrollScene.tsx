import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AvatarOutfit } from '../utils/avatarOutfit';

// Plain three.js stroll scene — deliberately NOT @react-three/fiber:
// fiber 9 (via `its-fine`) statically references React.use, which React 18
// does not export, so importing fiber breaks the production build.
// Plain three.js compiles and runs fine on React 18.
//
// Third-person walk: the player's avatar (a simple stylized humanoid
// built from primitives — see below) strolls with their navitar through
// a procedural Forest or City. WASD / arrow keys move, buttons on the
// page do the same for touch, dragging orbits the camera around the
// walkers. Trees and buildings are visual only in v1 — there is NO
// collision — the walker is simply clamped to the ground bounds.
export type StrollEnvironment = 'forest' | 'city';

export interface StrollCompanion {
  name: string;
  element: string;
  modelUrl?: string;
  modelZoom?: number;
  // Resolved 2D art (look-picker pick, or the name map) — shown on a
  // billboard when the companion has no GLB.
  imageUrl?: string | null;
}

export interface TouchKeys {
  forward: boolean;
  left: boolean;
  right: boolean;
  back: boolean;
}

interface StrollSceneProps {
  environment: StrollEnvironment;
  companion: StrollCompanion | null;
  // The player's current outfit (see src/utils/avatarOutfit.ts). The
  // scene applies it to the walker live — swapping outfits never
  // rebuilds the scene.
  outfit: AvatarOutfit;
  touchKeys: React.MutableRefObject<TouchKeys>;
}

const BOUND = 28;
const WORLD = 60;
const WALK_SPEED = 4;
const TURN_SPEED = 2.4;

// Deterministic pseudo-random so the woods and the city look the same
// on every load (no layout jumps between visits).
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ELEMENT_COLORS: Record<string, string> = {
  ice: '#81D4FA',
  fire: '#FF5722',
  nature: '#4CAF50',
  shadow: '#9C27B0',
  light: '#FFC107',
  quantum: '#B388FF',
  electric: '#FFEA00',
  spiritual: '#80DEEA',
  water: '#2196F3',
};

// A small canvas sprite that floats above the walker so the player can
// always tell which figure is them.
function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = 'bold 44px Roboto, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(text, 128, 36);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 128, 36);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.5, 0.42, 1);
  return sprite;
}

// Facade texture for the city buildings: dark dusk face with a grid of
// windows, some lit warm. Used as both the colour map and the emissive
// map, so the lit windows glow against the dusk.
function makeFacadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const rng = mulberry32(99);
    ctx.fillStyle = '#232733';
    ctx.fillRect(0, 0, 128, 256);
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 6; col++) {
        const lit = rng() < 0.45;
        ctx.fillStyle = lit ? '#ffca7a' : '#11141d';
        ctx.fillRect(8 + col * 20, 10 + row * 20, 12, 12);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const StrollScene: React.FC<StrollSceneProps> = ({ environment, companion, outfit, touchKeys }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{
    setEnvironment: (env: StrollEnvironment) => void;
    setOutfit: (o: AvatarOutfit) => void;
  } | null>(null);

  // Rebuild the scene only when the companion changes (different model
  // or art); the environment toggle flips visibility without rebuilding.
  const companionKey = companion
    ? `${companion.name}|${companion.modelUrl ?? ''}|${companion.imageUrl ?? ''}|${companion.element}`
    : 'none';

  useEffect(() => {
    apiRef.current?.setEnvironment(environment);
  }, [environment]);

  useEffect(() => {
    apiRef.current?.setOutfit(outfit);
  }, [outfit]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let raf = 0;
    let cancelled = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let forest: THREE.Group | null = null;
    let city: THREE.Group | null = null;
    let hemi: THREE.HemisphereLight | null = null;
    let sun: THREE.DirectionalLight | null = null;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      200
    );

    hemi = new THREE.HemisphereLight(0xbfdcff, 0x3f6b4a, 0.9);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff2d9, 1.6);
    sun.position.set(8, 14, 6);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-6, 4, -6);
    scene.add(fill);

    // ---------- Forest: green ground, dirt path, instanced trees ----------
    forest = new THREE.Group();
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a7d44, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), groundMat);
    ground.rotation.x = -Math.PI / 2;
    forest.add(ground);
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 1 });
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3, WORLD), pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0.01;
    forest.add(path);
    const rng = mulberry32(1234);
    const treeCount = 90;
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 1.6, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 1 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const coneGeo = new THREE.ConeGeometry(1.3, 3.4, 8);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 1 });
    const cones = new THREE.InstancedMesh(coneGeo, coneMat, treeCount);
    const dummy = new THREE.Object3D();
    let placed = 0;
    let tries = 0;
    while (placed < treeCount && tries < 600) {
      tries++;
      const x = (rng() * 2 - 1) * BOUND;
      const z = (rng() * 2 - 1) * BOUND;
      if (Math.abs(x) < 3) continue; // keep the path clear
      if (Math.hypot(x, z - 8) < 5) continue; // keep the spawn clearing clear
      const s = 0.8 + rng() * 0.7;
      dummy.position.set(x, 0.8 * s, z);
      dummy.scale.setScalar(s);
      dummy.rotation.y = rng() * Math.PI * 2;
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);
      dummy.position.y = (1.6 + 1.7) * s;
      dummy.updateMatrix();
      cones.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    trunks.count = placed;
    cones.count = placed;
    forest.add(trunks);
    forest.add(cones);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 1 });
    for (let i = 0; i < 8; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + rng() * 0.5), rockMat);
      const x = (rng() * 2 - 1) * 24;
      const z = (rng() * 2 - 1) * 24;
      if (Math.abs(x) < 3) continue;
      rock.position.set(x, 0.25, z);
      rock.rotation.set(rng() * 3, rng() * 3, 0);
      forest.add(rock);
    }
    scene.add(forest);

    // ---------- City: asphalt, road grid, instanced buildings, lamps ----------
    city = new THREE.Group();
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD, WORLD),
      new THREE.MeshStandardMaterial({ color: 0x33373d, roughness: 1 })
    );
    asphalt.rotation.x = -Math.PI / 2;
    city.add(asphalt);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x232528, roughness: 1 });
    const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(6, WORLD), roadMat);
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.y = 0.01;
    city.add(roadZ);
    const roadX = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, 6), roadMat);
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.y = 0.01;
    city.add(roadX);
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xd7c200, roughness: 1 });
    for (let i = -26; i <= 26; i += 5) {
      if (Math.abs(i) < 5) continue; // keep the crossroads clear
      const dashZ = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 2), dashMat);
      dashZ.rotation.x = -Math.PI / 2;
      dashZ.position.set(0, 0.02, i);
      city.add(dashZ);
      const dashX = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.25), dashMat);
      dashX.rotation.x = -Math.PI / 2;
      dashX.position.set(i, 0.02, 0);
      city.add(dashX);
    }
    const facade = makeFacadeTexture();
    const buildingMat = new THREE.MeshStandardMaterial({
      map: facade,
      emissiveMap: facade,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.55,
      color: 0x9aa7b8,
      roughness: 0.9,
    });
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    boxGeo.translate(0, 0.5, 0);
    const buildingCount = 48;
    const buildings = new THREE.InstancedMesh(boxGeo, buildingMat, buildingCount);
    const cityRng = mulberry32(777);
    const bDummy = new THREE.Object3D();
    const bColor = new THREE.Color();
    let bPlaced = 0;
    let bTries = 0;
    while (bPlaced < buildingCount && bTries < 900) {
      bTries++;
      const x = (cityRng() * 2 - 1) * BOUND;
      const z = (cityRng() * 2 - 1) * BOUND;
      if (Math.abs(x) < 5.5 || Math.abs(z) < 5.5) continue; // keep the roads clear
      if (Math.hypot(x, z - 8) < 6) continue; // keep the spawn clearing clear
      const w = 4 + cityRng() * 2.5;
      const d = 4 + cityRng() * 2.5;
      const h = 3 + cityRng() * 9;
      bDummy.position.set(x, 0, z);
      bDummy.scale.set(w, h, d);
      bDummy.rotation.y = 0;
      bDummy.updateMatrix();
      buildings.setMatrixAt(bPlaced, bDummy.matrix);
      bColor.setHSL(0.58 + cityRng() * 0.06, 0.12, 0.45 + cityRng() * 0.2);
      buildings.setColorAt(bPlaced, bColor);
      bPlaced++;
    }
    buildings.count = bPlaced;
    city.add(buildings);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.8 });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffca7a,
      emissive: new THREE.Color(0xffb74d),
      emissiveIntensity: 1.2,
    });
    for (let i = -24; i <= 24; i += 12) {
      if (Math.abs(i) < 5) continue;
      for (const [lx, lz] of [
        [4, i],
        [-4, i],
      ] as const) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3, 6), poleMat);
        pole.position.set(lx, 1.5, lz);
        city.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lampMat);
        lamp.position.set(lx, 3.1, lz);
        city.add(lamp);
      }
    }
    scene.add(city);

    // ---------- The walker: the user's avatar, a simple stylized
    // humanoid built from primitives and labelled "You". It is a
    // customizable character, not a likeness of anyone — its outfit
    // (top colour, pants colour, hat) comes from the current outfit in
    // src/utils/avatarOutfit.ts and swaps live via setOutfit below.
    // PLACEHOLDER: when Eddie's DAZ avatar GLB arrives, this group
    // should be replaced by the loaded GLB — the same way the navitar
    // GLBs drop in below — keeping the same position, heading and bob.
    // The outfit system stays: it would then drive the GLB's materials
    // instead of these primitives.
    const walker = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.8 });
    const topMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(outfit.topColor),
      roughness: 0.9,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(outfit.pantsColor),
      roughness: 0.9,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 10), topMat);
    body.position.y = 0.88;
    walker.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), skin);
    head.position.y = 1.48;
    walker.add(head);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 1 })
    );
    hair.position.y = 1.5;
    walker.add(hair);
    // Hat / accessory slot: rebuilt whenever the outfit changes.
    const hatGroup = new THREE.Group();
    walker.add(hatGroup);
    const buildHat = (o: AvatarOutfit) => {
      while (hatGroup.children.length > 0) {
        const child = hatGroup.children[0];
        hatGroup.remove(child);
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | undefined;
        if (material) material.dispose();
      }
      // A beanie covers the hair; a crown sits on top of it.
      hair.visible = o.hat !== 'beanie';
      if (o.hat === 'beanie') {
        const hatMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(o.hatColor),
          roughness: 1,
        });
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
          hatMat
        );
        cap.position.y = 1.52;
        hatGroup.add(cap);
        const brim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 20), hatMat);
        brim.rotation.x = Math.PI / 2;
        brim.position.y = 1.5;
        hatGroup.add(brim);
      } else if (o.hat === 'crown') {
        const gold = new THREE.MeshStandardMaterial({
          color: new THREE.Color(o.hatColor),
          metalness: 0.8,
          roughness: 0.3,
        });
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 0.09, 12, 1, true),
          gold
        );
        band.position.y = 1.66;
        hatGroup.add(band);
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const point = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 4), gold);
          point.position.set(Math.cos(angle) * 0.18, 1.75, Math.sin(angle) * 0.18);
          hatGroup.add(point);
        }
      }
    };
    buildHat(outfit);
    const armGeo = new THREE.CapsuleGeometry(0.07, 0.34, 4, 8);
    const leftArm = new THREE.Mesh(armGeo, topMat);
    leftArm.position.set(-0.32, 0.95, 0);
    walker.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, topMat);
    rightArm.position.set(0.32, 0.95, 0);
    walker.add(rightArm);
    const legGeo = new THREE.CapsuleGeometry(0.09, 0.36, 4, 8);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.12, 0.32, 0);
    walker.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.12, 0.32, 0);
    walker.add(rightLeg);
    const youLabel = makeTextSprite('You');
    youLabel.position.y = 2.05;
    walker.add(youLabel);
    walker.position.set(0, 0, 8);
    scene.add(walker);

    // ---------- The companion: the player's navitar, a step to the side
    // and slightly behind the walker. GLB when it has one, 2D art on a
    // billboard plane when it doesn't, an element-coloured orb when it
    // has neither. The group follows the walker; the GLB load is async
    // and falls back gracefully if it fails.
    const companionGroup = new THREE.Group();
    scene.add(companionGroup);
    let companionBillboard: THREE.Mesh | null = null;
    const placeCompanion = (heading: number, walkerPos: THREE.Vector3) => {
      const fx = Math.sin(heading);
      const fz = Math.cos(heading);
      const rx = Math.cos(heading);
      const rz = -Math.sin(heading);
      companionGroup.position.set(
        walkerPos.x + rx * 0.95 - fx * 0.35,
        walkerPos.y,
        walkerPos.z + rz * 0.95 - fz * 0.35
      );
      companionGroup.rotation.y = heading;
    };
    const companionTarget = 1.15;
    if (companion) {
      if (companion.modelUrl) {
        const loader = new GLTFLoader();
        loader.load(
          companion.modelUrl,
          gltf => {
            if (cancelled || !scene) return;
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const max = Math.max(size.x, size.y, size.z) || 1;
            const scale = (companionTarget * (companion.modelZoom ?? 1)) / max;
            gltf.scene.scale.setScalar(scale);
            gltf.scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
            companionGroup.add(gltf.scene);
          },
          undefined,
          () => {
            if (cancelled) return;
            addBillboardFallback();
          }
        );
      } else {
        addBillboardFallback();
      }
    }
    function addBillboardFallback() {
      if (!companion || !scene) return;
      if (companion.imageUrl) {
        const texture = new THREE.TextureLoader().load(companion.imageUrl);
        texture.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
        });
        companionBillboard = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), mat);
        companionBillboard.position.y = 0.85;
        companionGroup.add(companionBillboard);
      } else {
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 16, 12),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(ELEMENT_COLORS[companion.element] ?? '#2196F3'),
            emissive: new THREE.Color(ELEMENT_COLORS[companion.element] ?? '#2196F3'),
            emissiveIntensity: 0.7,
            roughness: 0.4,
          })
        );
        orb.position.y = 0.85;
        companionGroup.add(orb);
      }
    }
    placeCompanion(Math.PI, walker.position);

    // ---------- Environment switching (no rebuild) ----------
    const applyEnvironment = (env: StrollEnvironment) => {
      if (!scene || !forest || !city || !hemi || !sun) return;
      if (env === 'forest') {
        forest.visible = true;
        city.visible = false;
        scene.background = new THREE.Color(0xaac4d6);
        scene.fog = new THREE.Fog(0xcfe0d8, 18, 55);
        hemi.color.set(0xbfdcff);
        hemi.groundColor.set(0x3f6b4a);
        hemi.intensity = 0.9;
        sun.color.set(0xfff2d9);
        sun.intensity = 1.6;
        sun.position.set(8, 14, 6);
      } else {
        forest.visible = false;
        city.visible = true;
        scene.background = new THREE.Color(0x35324a);
        scene.fog = new THREE.Fog(0x35324a, 18, 55);
        hemi.color.set(0x6a6a9a);
        hemi.groundColor.set(0x2a2a33);
        hemi.intensity = 0.5;
        sun.color.set(0xff9a5c);
        sun.intensity = 0.5;
        sun.position.set(-6, 8, -4);
      }
    };
    // Swapping outfits never rebuilds the scene: it re-colours the
    // top and pants materials and rebuilds the hat slot.
    const applyOutfit = (o: AvatarOutfit) => {
      topMat.color.set(o.topColor);
      pantsMat.color.set(o.pantsColor);
      buildHat(o);
    };
    apiRef.current = { setEnvironment: applyEnvironment, setOutfit: applyOutfit };
    applyEnvironment(environment);
    applyOutfit(outfit);

    // ---------- Input: WASD / arrows, plus drag-to-look ----------
    const keys = { forward: false, left: false, right: false, back: false };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        keys.forward = true;
        e.preventDefault();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        keys.back = true;
        e.preventDefault();
      } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        keys.left = true;
        e.preventDefault();
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        keys.right = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.forward = false;
      else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.back = false;
      else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false;
      else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let dragging = false;
    let lastPointerX = 0;
    let camYaw = Math.PI + Math.PI; // behind the walker (heading starts at PI)
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastPointerX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      camYaw -= (e.clientX - lastPointerX) * 0.005;
      lastPointerX = e.clientX;
    };
    const onPointerUp = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerUp);

    const onResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ---------- Walk loop ----------
    let heading = Math.PI;
    let walkPhase = 0;
    let lastTick = performance.now();
    const tick = () => {
      if (cancelled) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min((now - lastTick) / 1000, 0.05);
      lastTick = now;

      const fwd = keys.forward || touchKeys.current.forward;
      const back = keys.back || touchKeys.current.back;
      const left = keys.left || touchKeys.current.left;
      const right = keys.right || touchKeys.current.right;
      if (left) heading += TURN_SPEED * dt;
      if (right) heading -= TURN_SPEED * dt;
      const moving = fwd || back;
      const speed = fwd ? WALK_SPEED : back ? -WALK_SPEED * 0.5 : 0;
      if (speed !== 0 && scene) {
        walker.position.x += Math.sin(heading) * speed * dt;
        walker.position.z += Math.cos(heading) * speed * dt;
        walker.position.x = Math.max(-BOUND, Math.min(BOUND, walker.position.x));
        walker.position.z = Math.max(-BOUND, Math.min(BOUND, walker.position.z));
      }
      walker.rotation.y = heading;
      if (moving) {
        walkPhase += dt * 10;
        const bob = Math.abs(Math.sin(walkPhase)) * 0.06;
        walker.position.y = bob;
        leftLeg.rotation.x = Math.sin(walkPhase) * 0.55;
        rightLeg.rotation.x = -Math.sin(walkPhase) * 0.55;
        leftArm.rotation.x = -Math.sin(walkPhase) * 0.45;
        rightArm.rotation.x = Math.sin(walkPhase) * 0.45;
        companionGroup.position.y = Math.abs(Math.sin(walkPhase + 1.2)) * 0.06;
      } else {
        walker.position.y = 0;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.x = 0;
        rightArm.rotation.x = 0;
        companionGroup.position.y = 0;
      }
      placeCompanion(heading, walker.position);
      if (companionBillboard && camera) {
        companionBillboard.quaternion.copy(camera.quaternion);
      }

      // Follow camera: behind the walker, easing back after a drag.
      if (camera) {
        const behind = heading + Math.PI;
        if (!dragging) {
          let diff = behind - camYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          camYaw += diff * Math.min(1, dt * 1.2);
        }
        camera.position.set(
          walker.position.x + Math.sin(camYaw) * 6.5,
          3.4,
          walker.position.z + Math.cos(camYaw) * 6.5
        );
        camera.lookAt(walker.position.x, 1.1, walker.position.z);
        if (renderer && scene) renderer.render(scene, camera);
      }
    };
    tick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerUp);
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
  }, [companionKey]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />;
};

export default StrollScene;
