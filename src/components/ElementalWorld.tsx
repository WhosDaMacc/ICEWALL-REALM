import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { elementColor } from '../utils/navitarArt';

// The elemental battle worlds: the duel happens INSIDE a 3D world, not
// on a flat card. Plain three.js, following the StrollScene pattern
// (React 18-safe — @react-three/fiber 9 cannot be imported on React 18,
// and the A-Frame/AR.js BattleEnvironment is the old approach, not this
// one). The world is picked by the field the player walked into (the
// venue's element) — a fire dragon in the snow field is the point.
// A duel with no venue instead takes the opponent's element world
// (BattleStage makes that call), so arena-picked fights still happen
// inside an element's home ground.
//
// Fighters with a GLB render live in 3D (ice griffin, fire phoenix);
// fighters without one stand on their 2D art as a billboard, exactly
// as the Stroll companion does; with neither, an element-coloured orb.
// The camera drifts in a slow orbit so the world reads as a place;
// dragging orbits it by hand. Lunge / flinch arrive as props from the
// duel (same 700 ms window BattleStage used to animate the art) and
// move the fighter groups in the scene.

export type ElementalWorldId =
  | 'ice'
  | 'fire'
  | 'quantum'
  | 'water'
  | 'electric'
  | 'nature'
  | 'shadow'
  | 'light'
  | 'spiritual'
  | 'arena';

// Every element has a world of its own. BattleStage picks which one
// a duel uses (the venue's element for a venue duel, the opponent's
// element when there is no venue); an element with no world — there
// are none among the nine, this is only a guard for stray values —
// fights in the neutral arena.
const WORLD_FOR_ELEMENT: Record<string, ElementalWorldId> = {
  ice: 'ice',
  fire: 'fire',
  quantum: 'quantum',
  water: 'water',
  electric: 'electric',
  nature: 'nature',
  shadow: 'shadow',
  light: 'light',
  spiritual: 'spiritual',
};

export function worldForElement(element: string | null): ElementalWorldId {
  if (!element) return 'arena';
  return WORLD_FOR_ELEMENT[element] ?? 'arena';
}

// THE world-selection rule, single source of truth: a duel fights in
// the world of the field the player is in — the VENUE's element world
// when there is a venue, the OPPONENT's element world when there is
// none, and the Ice Field when neither is known (no opponent picked
// yet). The venue this helper is fed is the CHECKED-IN venue:
// NavitarBattle derives it from the check-in state (the same source
// person-challenges use) and captures it at Challenge time, so the
// pre-challenge preview and the duel can never show different
// worlds. The pending challenge's stored venue does NOT feed this
// helper — it only pre-selects the opponent, and letting it govern
// pinned /battle to a stale venue through check-outs and fresh
// check-ins alike (live check 2026-11-12, second round: an old
// Valley Ember handoff kept every /battle duel in Fire World while
// person-challenges at Griffith Park fought in Nature World).
export function resolveBattleWorld(
  venueElement: string | null | undefined,
  opponentElement: string | null | undefined
): ElementalWorldId {
  if (venueElement) return worldForElement(venueElement);
  return worldForElement(opponentElement ?? 'ice');
}

export const WORLD_NAMES: Record<ElementalWorldId, string> = {
  ice: 'Ice Field',
  fire: 'Fire World',
  quantum: 'Quantum Realm',
  water: 'Water World',
  electric: 'Electric World',
  nature: 'Nature World',
  shadow: 'Shadow World',
  light: 'Light World',
  spiritual: 'Spiritual World',
  arena: 'Battle Arena',
};

// CSS fallback colours (no WebGL): the world still reads as a themed
// backdrop instead of an empty box. Matched to the sky palettes of
// the 3D worlds (zenith → deep ground tone).
const WORLD_FALLBACK: Record<ElementalWorldId, { from: string; to: string }> = {
  ice: { from: '#6fb1e0', to: '#16202a' },
  fire: { from: '#a03c10', to: '#120705' },
  quantum: { from: '#5a34b0', to: '#07040f' },
  water: { from: '#57b6e8', to: '#0d2f45' },
  electric: { from: '#2c3050', to: '#0a0b12' },
  nature: { from: '#8fd0a0', to: '#1d3016' },
  shadow: { from: '#3a2a58', to: '#08060f' },
  light: { from: '#ffe9a8', to: '#8a6a24' },
  spiritual: { from: '#8fc7bd', to: '#203b36' },
  arena: { from: '#3a3a42', to: '#101012' },
};

export interface WorldFighter {
  name: string;
  element: string;
  modelUrl?: string | null;
  modelZoom?: number;
  // Extra Y turn (radians) for a model whose front is not +z in model
  // space — Luminara's golden dragon fronts -x (geometry check
  // 2026-11-12: head mass at -x, tail sweeping low to +x), so she
  // carries +90° to face +z like the Griffin/Ashwing models do.
  modelRotationY?: number;
  // Ground-plane offset (model units): how far this model's feet sit
  // above its bounding-box min.y. Grounding adds it to box.min.y, so
  // the FEET rest on the floor instead of whatever extremity (the
  // dragon's tail sweep, min.y = 0; her feet bottom at 0.0134) defines
  // the box. Absent (= 0) for the Griffin/Ashwing, whose bases are
  // their ground.
  modelYOffset?: number;
  imageUrl?: string | null;
}

// A fighter's label anchor in stage screen space, as percentages of
// the stage box (x: 0 = left edge, y: 0 = top edge). Since round 3
// the anchor is the fighter's FLOOR point (its mark on the ground),
// not its head — BattleStage renders the name label just below it,
// in the open lane under the fighters. BattleStage clamps these
// inside the stage before rendering the DOM labels.
export interface FighterScreenPos {
  x: number;
  y: number;
}

export interface ElementalWorldProps {
  world: ElementalWorldId;
  // The venue's element: the arena's rim lighting. Ignored by the
  // elemental worlds (they have their own lighting).
  accentElement?: string | null;
  player: WorldFighter | null;
  opponent: WorldFighter | null;
  playerAnim: '' | 'lunge' | 'shake';
  opponentAnim: '' | 'lunge' | 'shake';
  winner: 'player' | 'opponent' | null;
  // Live label anchors for the DOM name labels in BattleStage:
  // called from the render loop whenever a fighter's projected
  // position moves enough to matter (throttled inside the loop), and
  // with null for a side that has no fighter / is behind the camera.
  onFighterPositions?: (pos: Record<'player' | 'opponent', FighterScreenPos | null>) => void;
}

// Deterministic pseudo-random, same as StrollScene: the worlds look
// the same on every load (no layout jumps between visits).
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

// Fighter name labels are NOT drawn in the world any more. Canvas
// text sprites failed two live checks in a row: a fixed 256px canvas
// clipped longer names mid-word ("Quant…"), and even with the canvas
// sized to the measured text the sprite still rendered truncated and
// detached from its fighter (projected overlap with the other
// fighter's billboard reads as a cut-off, floating label). DOM text
// cannot clip and can be clamped inside the stage, so the world now
// PROJECTS each fighter's label anchor to screen space every frame
// and BattleStage renders the names as DOM labels at those positions
// (see onFighterPositions below).

// Soft vertical gradient band for the aurora ribbon (transparent at
// both edges, coloured in the middle).
function makeAuroraTexture(colorA: string, colorB: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.35, colorA);
    grad.addColorStop(0.65, colorB);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Soft radial gradient (full colour at the centre, transparent at
// the rim). Used for the fighters' contact shadows (dark blob) and
// the Shadow World's ground-mist veils (pale violet blob).
function makeRadialTexture(rgbaInner: string, rgbaOuter: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, rgbaInner);
    grad.addColorStop(1, rgbaOuter);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A lava-pool surface: radial gradient, near-white-hot core cooling
// through orange to a dark crust rim, with a few dark crust flecks
// breaking the disc up. Used as BOTH map and emissiveMap on the pool
// material, so the pool glows with its own colours (round 3 — the
// pools used to be flat pale-orange discs that read as stickers on
// the cracked ground).
function makeLavaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 126);
    grad.addColorStop(0, '#fff3b0');
    grad.addColorStop(0.28, '#ffb03a');
    grad.addColorStop(0.58, '#ff6d00');
    grad.addColorStop(0.85, '#c33d00');
    grad.addColorStop(1, '#571a02');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    // Crust flecks: dark scabs drifting toward the rim.
    const rng = mulberry32(2024);
    ctx.fillStyle = 'rgba(30,8,2,0.55)';
    for (let i = 0; i < 26; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = 52 + rng() * 68;
      const x = 128 + Math.cos(ang) * rad;
      const y = 128 + Math.sin(ang) * rad;
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + rng() * 8, 2 + rng() * 5, ang, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function webglAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { WebGLRenderingContext?: unknown };
  return typeof w.WebGLRenderingContext !== 'undefined';
}

// ---------- Procedural ground + sky (beauty pass) ----------
// The worlds used to be flat colour planes under flat colour skies.
// Each world now paints its ground as a small canvas texture (noise,
// cracks, ripples, seams — themed per world) tiled across the plane,
// and its sky as a gradient dome. Canvas textures keep the build
// free of image assets and the painters free of async loading: the
// builders stay synchronous, and the textures are cheap (256px
// grounds, a 16×512 sky strip) even on phones.

type Ctx2D = CanvasRenderingContext2D;

// Scatter small dots/strokes of the given colours over the tile.
function speckle(
  ctx: Ctx2D,
  rng: () => number,
  count: number,
  colors: string[],
  sizeMin: number,
  sizeMax: number,
  alpha: number
) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.5 + rng() * 0.5);
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    const s = sizeMin + rng() * (sizeMax - sizeMin);
    ctx.fillRect(rng() * 256, rng() * 256, s, s * (0.6 + rng() * 0.4));
  }
  ctx.globalAlpha = 1;
}

// Soft dark/light blotches (radial blobs) for murk, scorch, moss.
function blotch(
  ctx: Ctx2D,
  rng: () => number,
  count: number,
  color: string,
  rMin: number,
  rMax: number,
  alpha: number
) {
  for (let i = 0; i < count; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    const r = rMin + rng() * (rMax - rMin);
    const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha * (0.6 + rng() * 0.4);
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

// Jagged polylines (lava cracks, storm crackle, ice fractures).
function crackle(
  ctx: Ctx2D,
  rng: () => number,
  count: number,
  color: string,
  alpha: number,
  width: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.5 + rng() * 0.5);
    let x = rng() * 256;
    let y = rng() * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 3 + Math.floor(rng() * 3);
    for (let s = 0; s < segs; s++) {
      x += (rng() * 2 - 1) * 34;
      y += (rng() * 2 - 1) * 34;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function makeGroundTexture(
  paint: (ctx: Ctx2D, rng: () => number) => void,
  seed: number,
  repeat = 6
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx, mulberry32(seed));
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function groundPaint(base: string): (ctx: Ctx2D, rng: () => number) => void {
  return ctx => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
  };
}

// Per-world ground painters: a base coat plus themed detail, all
// low-contrast so the central duel clearing stays readable and the
// fighters' contact shadows sit visibly on top.
const GROUND_PAINTERS: Record<ElementalWorldId, (ctx: Ctx2D, rng: () => number) => void> = {
  ice: (ctx, rng) => {
    // Round 3: base a half-step darker than the original near-white
    // (#e8f3fa) — under the bloom pass the snow blew out to a glare
    // that swallowed the player fighter's contact shadow (live
    // check 2026-11-12). Still unmistakably snow; the shadow core
    // (also deepened this round) now reads against it.
    groundPaint('#d9e9f4')(ctx, rng);
    speckle(ctx, rng, 500, ['#ffffff', '#cfe4f3', '#bcd8ee'], 1, 3, 0.4);
    crackle(ctx, rng, 5, '#a9cfe8', 0.35, 1);
    // Sparkle glints: tiny bright crosses, sparse.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const x = rng() * 256;
      const y = rng() * 256;
      ctx.globalAlpha = 0.5 + rng() * 0.5;
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y);
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  fire: (ctx, rng) => {
    groundPaint('#1a110d')(ctx, rng);
    blotch(ctx, rng, 10, '#000000', 20, 55, 0.35);
    blotch(ctx, rng, 6, '#33200f', 14, 34, 0.3);
    crackle(ctx, rng, 9, '#ff7a26', 0.8, 2);
    crackle(ctx, rng, 7, '#ffb03a', 0.55, 1);
    speckle(ctx, rng, 160, ['#ff9a3c', '#c1440e', '#5a2c14'], 1, 2.5, 0.55);
  },
  quantum: (ctx, rng) => {
    groundPaint('#0a0616')(ctx, rng);
    // A glowing grid in the tile itself (the GridHelper still rides
    // on top); dots of cyan at the intersections.
    ctx.strokeStyle = '#3a2370';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 256) / 4, 0);
      ctx.lineTo((i * 256) / 4, 256);
      ctx.moveTo(0, (i * 256) / 4);
      ctx.lineTo(256, (i * 256) / 4);
      ctx.stroke();
    }
    speckle(ctx, rng, 60, ['#7b4fd0', '#00acc1'], 1, 2, 0.5);
    blotch(ctx, rng, 5, '#1c0f38', 24, 60, 0.5);
  },
  water: (ctx, rng) => {
    groundPaint('#d9c08d')(ctx, rng);
    // Sand ripples: soft horizontal arcs in a lighter tone.
    ctx.strokeStyle = '#e8d5a4';
    ctx.lineWidth = 3;
    for (let row = 0; row < 8; row++) {
      for (let i = 0; i < 4; i++) {
        const x = i * 64 + (row % 2) * 32;
        const y = row * 32 + 16;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(x, y, 16, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    speckle(ctx, rng, 420, ['#c9ae76', '#efe0b8', '#b89a62'], 1, 2.5, 0.5);
    speckle(ctx, rng, 26, ['#fff6e8', '#e8b4b8'], 1.5, 3, 0.8);
  },
  electric: (ctx, rng) => {
    // Round 3: the old painter (near-black base, dark blotches) read
    // as a featureless black floor live. The base lifts a step, the
    // scorch pattern gets light-ash blotches and pale speckle, and
    // faint GLOWING cracks (storm-yellow, a little arc-blue) thread
    // through it — visible pattern, storm mood intact.
    groundPaint('#2e3038')(ctx, rng);
    blotch(ctx, rng, 9, '#14151b', 18, 48, 0.4);
    blotch(ctx, rng, 6, '#484b58', 12, 32, 0.32);
    crackle(ctx, rng, 6, '#ffe082', 0.38, 1);
    crackle(ctx, rng, 4, '#69c7ff', 0.22, 1);
    crackle(ctx, rng, 5, '#8a8f6a', 0.25, 1);
    speckle(ctx, rng, 430, ['#4a4d59', '#23242c', '#5d606e'], 1, 3, 0.55);
  },
  nature: (ctx, rng) => {
    groundPaint('#4e7d3a')(ctx, rng);
    speckle(ctx, rng, 900, ['#5d8f45', '#3f6d2e', '#6da352', '#54853f', '#86c06a'], 1, 3, 0.55);
    blotch(ctx, rng, 6, '#3c662c', 18, 44, 0.3);
    // Tiny lighter blade strokes.
    ctx.strokeStyle = '#7fb45e';
    ctx.lineWidth = 1;
    for (let i = 0; i < 130; i++) {
      const x = rng() * 256;
      const y = rng() * 256;
      ctx.globalAlpha = 0.4 + rng() * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() * 2 - 1) * 2, y - 3 - rng() * 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  shadow: (ctx, rng) => {
    groundPaint('#1c1626')(ctx, rng);
    blotch(ctx, rng, 10, '#0d0916', 20, 55, 0.5);
    blotch(ctx, rng, 7, '#2c2140', 14, 38, 0.35);
    speckle(ctx, rng, 260, ['#241b33', '#120d1e', '#33264d'], 1, 3, 0.5);
  },
  light: (ctx, rng) => {
    groundPaint('#dcc794')(ctx, rng);
    speckle(ctx, rng, 500, ['#e8d5a4', '#cdb37e', '#f2e3b4'], 1, 3, 0.5);
    // Pale stone seams: an offset tile grid, softly drawn.
    ctx.strokeStyle = '#b89a62';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    for (let i = 0; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 256) / 2, 0);
      ctx.lineTo((i * 256) / 2, 256);
      ctx.moveTo(0, (i * 256) / 2);
      ctx.lineTo(256, (i * 256) / 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  spiritual: (ctx, rng) => {
    groundPaint('#5f7268')(ctx, rng);
    speckle(ctx, rng, 700, ['#6d8577', '#52665b', '#7d9484', '#49604f'], 1, 3, 0.55);
    blotch(ctx, rng, 6, '#47604f', 16, 40, 0.35);
    blotch(ctx, rng, 4, '#77877c', 10, 26, 0.25);
    speckle(ctx, rng, 22, ['#f6c6d8', '#e8a8c0'], 1.5, 2.5, 0.6);
  },
  arena: (ctx, rng) => {
    groundPaint('#2a2a30')(ctx, rng);
    speckle(ctx, rng, 600, ['#34343c', '#1f1f24', '#3f3f48'], 1, 3, 0.5);
    ctx.strokeStyle = '#1b1b1f';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 256) / 2, 0);
      ctx.lineTo((i * 256) / 2, 256);
      ctx.moveTo(0, (i * 256) / 2);
      ctx.lineTo(256, (i * 256) / 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};

// Fixed seeds per world: the painted grounds look the same on
// every load (the mulberry32 convention the scenery already uses).
const GROUND_SEEDS: Record<ElementalWorldId, number> = {
  ice: 101,
  fire: 202,
  quantum: 303,
  water: 404,
  electric: 505,
  nature: 606,
  shadow: 707,
  light: 808,
  spiritual: 909,
  arena: 111,
};

// Per-world skies: zenith → (optional mid band) → horizon. The fog
// colour of each world is set to its horizon tone, so the ground
// plane melts into the sky at the distance instead of ending at a
// visible edge against a flat background colour.
const WORLD_SKIES: Record<ElementalWorldId, { top: string; band?: string; horizon: string }> = {
  ice: { top: '#5ea9dd', band: '#a5d2f2', horizon: '#e6f3fb' },
  fire: { top: '#0d0407', band: '#40160a', horizon: '#9a3c10' },
  quantum: { top: '#030209', band: '#1c0b45', horizon: '#3d1a75' },
  water: { top: '#4db2e8', band: '#93d4f5', horizon: '#e2f4fd' },
  electric: { top: '#070912', band: '#1b1e33', horizon: '#3a3f63' },
  nature: { top: '#69b7e0', band: '#a8dba8', horizon: '#e4f5dc' },
  shadow: { top: '#050410', band: '#170f2c', horizon: '#332257' },
  light: { top: '#ffd76e', band: '#ffeeb8', horizon: '#fff8e2' },
  spiritual: { top: '#79bdb2', band: '#bcdcd2', horizon: '#eaf6ee' },
  arena: { top: '#0e0e12', band: '#1d1d24', horizon: '#33333d' },
};

// A gradient sky dome: a big inward-facing sphere painted with the
// world's vertical gradient. Fog-exempt and depth-write-off, drawn
// behind everything; the scene background colour (set per world to
// the horizon tone) only shows if the dome itself ever fails.
function addSkyDome(scene: THREE.Scene, world: ElementalWorldId): void {
  const palette = WORLD_SKIES[world];
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, palette.top);
    if (palette.band) grad.addColorStop(0.55, palette.band);
    grad.addColorStop(0.78, palette.horizon);
    grad.addColorStop(1, palette.horizon);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 512);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(90, 24, 16),
    new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
  );
  dome.renderOrder = -10;
  scene.add(dome);
}

const FIGHTER_TARGET = 1.8; // GLB rescale target height (ModelCanvas convention)
// Real separation: at ±2.3 the fighters read as clustered around the
// ring's centre once the camera drifts; ±2.55 keeps a clear gap
// between them while staying inside the arena ring (radius 3.4).
const PLAYER_X = -2.55;
const OPPONENT_X = 2.55;

// ---------- Scenery exclusion (round 3) ----------
// A Nature tree hid the player card outright at one preview angle
// (live check 2026-11-12): the old rule only kept dressing out of a
// centre circle, which says nothing about sightlines. The rule now,
// applied by every scatter placement in every world:
//
//  1. Nothing within FIGHTER_CLEAR of either fighter mark — the
//     fighters' own ground stays empty.
//  2. TALL dressing (top above ~1.6 — trees, spires, pylons,
//     pillars, dead trees) may only stand OUTSIDE the camera's orbit
//     disk. The camera rides a circle of radius 7.6 around the duel
//     (drag swings it all the way round), and every camera→fighter
//     sightline lies inside that disk — so a tall item whose nearest
//     point is beyond the disk can never cross one, at ANY angle
//     the drag-orbit allows. TALL_MIN_R keeps a 1.2 margin past it.
//  3. MID dressing (top ~0.9–1.6 — rocks, crystals, lanterns, the
//     quantum shards) may live inside the disk but must stay out of
//     the sightline wedge from the DEFAULT/front camera arc (the
//     sway range the stage opens in, widened) to either fighter.
//  4. LOW dressing (flowers, slabs, bushes under ~0.9) can only
//     cover a fighter's feet, never hide it — rule 1 suffices.
const FIGHTER_CLEAR = 2.4;
const TALL_MIN_R = 8.8; // camera orbit radius 7.6 + margin
const FRONT_CAM_SAMPLES: Array<[number, number]> = (() => {
  const pts: Array<[number, number]> = [];
  for (let a = -0.2; a <= 1.401; a += 0.1) pts.push([Math.sin(a) * 7.6, Math.cos(a) * 7.6]);
  return pts;
})();

function segDistXZ(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax;
  const abz = bz - az;
  const len2 = abx * abx + abz * abz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / len2));
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

// Is a dressing item centred at (x, z), with horizontal radius r
// and top height `top`, safe to place? See the rules above.
function dressingSpotClear(x: number, z: number, r: number, top: number): boolean {
  for (const mx of [PLAYER_X, OPPONENT_X]) {
    if (Math.hypot(x - mx, z) < FIGHTER_CLEAR + r) return false;
  }
  if (top > 1.6) {
    return Math.hypot(x, z) - r > TALL_MIN_R;
  }
  if (top > 0.9) {
    for (const [cx, cz] of FRONT_CAM_SAMPLES) {
      for (const mx of [PLAYER_X, OPPONENT_X]) {
        if (segDistXZ(x, z, cx, cz, mx, 0) < r + 0.35) return false;
      }
    }
  }
  return true;
}

const ElementalWorld: React.FC<ElementalWorldProps> = ({
  world,
  accentElement,
  player,
  opponent,
  playerAnim,
  opponentAnim,
  winner,
  onFighterPositions,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [canRender3d] = useState(() => webglAvailable());
  const [failed3d, setFailed3d] = useState(false);
  // The render loop reads the live duel state from this ref (same
  // callbacksRef pattern as ModelCanvas): props changing must move
  // the fighters without rebuilding the scene.
  const liveRef = useRef({ playerAnim, opponentAnim, winner });
  liveRef.current = { playerAnim, opponentAnim, winner };
  // Same pattern for the label-position callback: the loop always
  // calls the latest prop without the scene effect re-running.
  const posCbRef = useRef(onFighterPositions);
  posCbRef.current = onFighterPositions;

  // Rebuild the scene when the world or either fighter changes (same
  // companion-key pattern as StrollScene).
  const sceneKey = [
    world,
    player ? `${player.name}|${player.modelUrl ?? ''}|${player.imageUrl ?? ''}` : 'none',
    opponent ? `${opponent.name}|${opponent.modelUrl ?? ''}|${opponent.imageUrl ?? ''}` : 'none',
  ].join('~');

  useEffect(() => {
    if (!canRender3d) return;
    const mount = mountRef.current;
    if (!mount) return;
    let raf = 0;
    let cancelled = false;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      if (!cancelled) setFailed3d(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    // Filmic tone mapping: the flat scenes rendered every emissive
    // at face value, so lava / crystals / lightning read as flat
    // colour. ACES rolls off highlights and deepens shadows, which
    // (with the per-world exposures set in the builders below) is
    // what makes the emissives feel lit. Output colour space stays
    // at three's sRGB default.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    // If the GL context dies mid-session (GPU reset, too many live
    // contexts, a throttled software renderer giving up), the canvas
    // would sit blank over the page — indistinguishable from an empty
    // world. Degrade to the themed CSS backdrop instead: the player
    // still sees a named world, never a void.
    const onContextLost = (e: Event) => {
      e.preventDefault();
      if (!cancelled) setFailed3d(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      200
    );

    // Bloom (beauty pass): a high-threshold UnrealBloom so only the
    // genuinely hot emissives — lava, crystals, lightning shards,
    // sun pillars, lanterns — halo; fighters and scenery sit below
    // the threshold and stay crisp. The composer is OPTIONAL: any
    // failure setting it up (older GPU, driver quirks) falls back to
    // plain renderer.render with tone mapping, which still carries
    // most of the look. The no-WebGL path never reaches here at all
    // (the component returns the CSS fallback first), and jsdom
    // never constructs a renderer, so the smoke harness is untouched.
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    try {
      const rt = new THREE.WebGLRenderTarget(mount.clientWidth, mount.clientHeight, {
        type: THREE.HalfFloatType,
        samples: 4,
      });
      composer = new EffectComposer(renderer, rt);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(mount.clientWidth, mount.clientHeight),
        0.55, // strength — modest: a halo, not a fog
        0.65, // radius
        0.82 // threshold — only emissive-hot surfaces bloom
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    } catch {
      composer = null;
      bloomPass = null;
    }

    const updaters: Array<(t: number, dt: number) => void> = [];

    // ---------- World scenery ----------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(8, 14, 6);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-6, 4, -6);
    scene.add(fill);
    // Rim / back light (round 3): a directional from BEHIND the
    // fighters, high, aimed at the duel centre (the default target).
    // In the dark worlds the fighters' front faces fall toward the
    // floor tones — Emberwing's dark red read as a near-silhouette
    // on Fire's floor (live check 2026-11-12) — and a back light is
    // what lifts a silhouette: it edges the model's outline toward
    // the camera without touching the front lighting. The world
    // builders below tint and scale it (warm for Fire, violet for
    // Shadow, storm-yellow for Electric, cyan for Quantum; quieter
    // in the bright worlds so nothing flattens). Sprites ignore
    // lights entirely — this is for the GLB fighters, which are the
    // ones that silhouette.
    const rim = new THREE.DirectionalLight(0xbfd9ff, 0.45);
    rim.position.set(0, 5, -9);
    scene.add(rim);

    // The ground wears the world's painted canvas texture (see
    // GROUND_PAINTERS): themed detail instead of a flat colour fill.
    // The texture carries the colour, so the material stays white.
    const addGround = (roughness: number, metalness = 0) => {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.MeshStandardMaterial({
          map: makeGroundTexture(GROUND_PAINTERS[world], GROUND_SEEDS[world]),
          roughness,
          metalness,
        })
      );
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      return ground;
    };

    // A Points cloud whose positions a per-frame updater rewrites.
    const makePoints = (
      count: number,
      color: number,
      size: number,
      additive: boolean,
      seed: number
    ) => {
      const rng = mulberry32(seed);
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (rng() * 2 - 1) * 26;
        positions[i * 3 + 1] = rng() * 12;
        positions[i * 3 + 2] = (rng() * 2 - 1) * 26;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity: 0.9,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      return { points, positions, rng };
    };

    if (world === 'ice') {
      scene.background = new THREE.Color(0xe6f3fb);
      addSkyDome(scene, 'ice');
      scene.fog = new THREE.Fog(0xdceef8, 16, 55);
      renderer.toneMappingExposure = 1.0;
      hemi.color.set(0xcfe8ff);
      hemi.groundColor.set(0x7fa8c9);
      hemi.intensity = 0.95;
      sun.color.set(0xffffff);
      sun.intensity = 1.5;
      rim.intensity = 0.4;
      // Snow is the brightest floor there is: full-strength bloom
      // washed a white glare pool under the player card that ate
      // her contact shadow (live check 2026-11-12). Ice keeps the
      // crystals' halo at a lower strength; the deepened shadow
      // core and the slightly darker snow do the rest.
      if (bloomPass) bloomPass.strength = 0.35;
      addGround(0.35, 0.15);
      // Ice-crystal clusters: pale blue octahedrons. Placement goes
      // through dressingSpotClear now — a crystal's top is ~1.8× its
      // radius, so the big ones count as TALL and move out past the
      // camera's orbit disk, where they frame the field instead of
      // ever crossing a sightline (round 3 exclusion).
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0xaee2ff,
        emissive: new THREE.Color(0x4fc3f7),
        emissiveIntensity: 0.5,
        roughness: 0.15,
        metalness: 0.3,
      });
      const crng = mulberry32(41);
      for (let i = 0; i < 28; i++) {
        const x = (crng() * 2 - 1) * 24;
        const z = (crng() * 2 - 1) * 24;
        const s = 0.35 + crng() * 0.7;
        if (!dressingSpotClear(x, z, s, 1.8 * s)) continue;
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(s), crystalMat);
        crystal.position.set(x, s * 0.8, z);
        crystal.rotation.set(crng() * 3, crng() * 3, 0);
        scene.add(crystal);
      }
      // Frozen pines: dark teal cones with a snow-white tip. TALL —
      // they stand in the distance ring beyond the orbit disk.
      const pineMat = new THREE.MeshStandardMaterial({ color: 0x2a6b5e, roughness: 1 });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xe8f4fa, roughness: 0.9 });
      const prng = mulberry32(87);
      for (let i = 0; i < 16; i++) {
        const x = (prng() * 2 - 1) * 24;
        const z = (prng() * 2 - 1) * 24;
        const h = 2.2 + prng() * 2;
        if (!dressingSpotClear(x, z, h * 0.32, h)) continue;
        const tree = new THREE.Group();
        const cone = new THREE.Mesh(new THREE.ConeGeometry(h * 0.32, h, 8), pineMat);
        cone.position.y = h / 2;
        tree.add(cone);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(h * 0.14, h * 0.35, 8), snowMat);
        tip.position.y = h * 0.88;
        tree.add(tip);
        tree.position.set(x, 0, z);
        tree.rotation.y = prng() * Math.PI * 2;
        scene.add(tree);
      }
      // Aurora: two translucent gradient ribbons high in the sky,
      // swaying almost imperceptibly.
      const aurora1 = new THREE.Mesh(
        new THREE.PlaneGeometry(34, 7),
        new THREE.MeshBasicMaterial({
          map: makeAuroraTexture('rgba(74,222,128,0.5)', 'rgba(34,211,238,0.4)'),
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      aurora1.position.set(0, 13, -16);
      aurora1.rotation.x = -0.35;
      scene.add(aurora1);
      const aurora2 = new THREE.Mesh(
        new THREE.PlaneGeometry(28, 5),
        new THREE.MeshBasicMaterial({
          map: makeAuroraTexture('rgba(34,211,238,0.45)', 'rgba(129,212,250,0.4)'),
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      aurora2.position.set(-6, 15, -14);
      aurora2.rotation.set(-0.3, 0.5, 0.15);
      scene.add(aurora2);
      updaters.push(t => {
        aurora1.rotation.z = Math.sin(t * 0.12) * 0.04;
        aurora2.rotation.z = Math.sin(t * 0.09 + 1.3) * 0.05;
      });
      // Falling snow: drifts down and wraps back to the top.
      const snow = makePoints(420, 0xffffff, 0.09, false, 1234);
      const snowSpeed = new Float32Array(420);
      for (let i = 0; i < 420; i++) snowSpeed[i] = 0.45 + snow.rng() * 0.55;
      updaters.push((t, dt) => {
        const arr = snow.positions;
        for (let i = 0; i < 420; i++) {
          arr[i * 3 + 1] -= snowSpeed[i] * dt;
          arr[i * 3] += Math.sin(t * 0.7 + i) * 0.12 * dt;
          if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 12;
        }
        snow.points.geometry.attributes.position.needsUpdate = true;
      });
    } else if (world === 'fire') {
      scene.background = new THREE.Color(0x9a3c10);
      addSkyDome(scene, 'fire');
      scene.fog = new THREE.Fog(0x38160c, 12, 45);
      renderer.toneMappingExposure = 1.15;
      hemi.color.set(0xff8a50);
      hemi.groundColor.set(0x3a1a12);
      hemi.intensity = 0.5;
      sun.color.set(0xff7a3c);
      sun.intensity = 0.6;
      sun.position.set(-6, 10, -4);
      // Warm rim at full strength: Fire is where fighters
      // silhouette against the dark floor (Emberwing, live check
      // 2026-11-12) — the orange back-edge is her outline.
      rim.color.set(0xffa040);
      rim.intensity = 1.05;
      addGround(1);
      // Lava pools: radial-gradient discs (white-hot core → crust
      // rim) textured AND emissive-mapped, so they glow like the
      // cracked ground instead of reading as flat pale stickers
      // (round 3). Each pool gets an in-plane spin so the crust
      // flecks don't repeat identically; the three lit pools keep
      // their flickering point lights, and the shared emissive
      // breathes with the same updater.
      const lavaTex = makeLavaTexture();
      const lavaMat = new THREE.MeshStandardMaterial({
        map: lavaTex,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: lavaTex,
        emissiveIntensity: 1.15,
        roughness: 0.55,
      });
      const lavaLights: THREE.PointLight[] = [];
      const lavaSpots: Array<[number, number, number]> = [
        [-9, -8, 2.2],
        [8, -9, 1.7],
        [10, 7, 2.4],
      ];
      const lavaRng = mulberry32(59);
      for (const [lx, lz, lr] of lavaSpots) {
        const pool = new THREE.Mesh(new THREE.CircleGeometry(lr, 24), lavaMat);
        pool.rotation.set(-Math.PI / 2, 0, lavaRng() * Math.PI * 2);
        pool.position.set(lx, 0.02, lz);
        scene.add(pool);
        const light = new THREE.PointLight(0xff6a00, 1.6, 11);
        light.position.set(lx, 0.7, lz);
        scene.add(light);
        lavaLights.push(light);
      }
      updaters.push(t => {
        lavaLights.forEach((light, i) => {
          light.intensity = 1.5 + Math.sin(t * 7 + i * 2.4) * 0.3;
        });
        lavaMat.emissiveIntensity = 1.15 + Math.sin(t * 2.3) * 0.18;
      });
      // Two more pools without lights of their own — the emissive
      // (and now the bloom) carries them; real point lights are the
      // expensive part, so the lit count stays at three.
      const extraPools: Array<[number, number, number]> = [
        [-4.5, 11, 1.3],
        [3.5, -12, 1.5],
      ];
      for (const [lx, lz, lr] of extraPools) {
        const pool = new THREE.Mesh(new THREE.CircleGeometry(lr, 24), lavaMat);
        pool.rotation.set(-Math.PI / 2, 0, lavaRng() * Math.PI * 2);
        pool.position.set(lx, 0.02, lz);
        scene.add(pool);
      }
      // Dark rock spires. TALL — the exclusion rule keeps them past
      // the camera's orbit disk, silhouettes on the horizon.
      const spireMat = new THREE.MeshStandardMaterial({ color: 0x1c1210, roughness: 1 });
      const srng = mulberry32(55);
      for (let i = 0; i < 14; i++) {
        const x = (srng() * 2 - 1) * 22;
        const z = (srng() * 2 - 1) * 22;
        const h = 2 + srng() * 3.2;
        const r = 0.5 + srng() * 0.6;
        if (!dressingSpotClear(x, z, r, h)) continue;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), spireMat);
        spire.position.set(x, h / 2, z);
        spire.rotation.y = srng() * Math.PI * 2;
        scene.add(spire);
      }
      // Drifting embers: rise and wrap back to the ground.
      const embers = makePoints(320, 0xffa726, 0.11, true, 777);
      const emberSpeed = new Float32Array(320);
      for (let i = 0; i < 320; i++) emberSpeed[i] = 0.6 + embers.rng() * 0.9;
      updaters.push((t, dt) => {
        const arr = embers.positions;
        for (let i = 0; i < 320; i++) {
          arr[i * 3 + 1] += emberSpeed[i] * dt;
          arr[i * 3] += Math.sin(t * 1.1 + i * 1.7) * 0.25 * dt;
          if (arr[i * 3 + 1] > 9) arr[i * 3 + 1] = 0;
        }
        embers.points.geometry.attributes.position.needsUpdate = true;
      });
    } else if (world === 'quantum') {
      scene.background = new THREE.Color(0x3d1a75);
      addSkyDome(scene, 'quantum');
      scene.fog = new THREE.Fog(0x1e0d40, 10, 45);
      renderer.toneMappingExposure = 1.1;
      hemi.color.set(0x7c5cff);
      hemi.groundColor.set(0x1a1033);
      hemi.intensity = 0.55;
      sun.color.set(0xb388ff);
      sun.intensity = 0.5;
      rim.color.set(0x00e5ff);
      rim.intensity = 0.85;
      addGround(0.8);
      // Glowing wireframe grid on the void floor.
      const grid = new THREE.GridHelper(44, 44, 0xb388ff, 0x2a1a5e);
      grid.position.y = 0.02;
      const gridMat = grid.material as THREE.LineBasicMaterial;
      gridMat.transparent = true;
      gridMat.opacity = 0.55;
      scene.add(grid);
      // Floating shards: purple / cyan octahedrons, turning slowly.
      // They are small (≤0.45 across — nothing that size can hide a
      // fighter), so they place under the MID exclusion tier: clear
      // of the fighter marks and out of the front sightline wedge,
      // with retries so the count survives the rejections.
      const shards: THREE.Mesh[] = [];
      const shardRng = mulberry32(31);
      for (let i = 0; i < 20; i++) {
        const purple = i % 2 === 0;
        const shardSize = 0.15 + shardRng() * 0.3;
        let sx = 0;
        let sz = 0;
        let sy = 1.5;
        let placed = false;
        for (let attempt = 0; attempt < 8; attempt++) {
          const angle = shardRng() * Math.PI * 2;
          const radius = 4.5 + shardRng() * 6;
          sx = Math.cos(angle) * radius;
          sz = Math.sin(angle) * radius;
          sy = 0.8 + shardRng() * 2.4;
          if (dressingSpotClear(sx, sz, 0.5, 1.2)) {
            placed = true;
            break;
          }
        }
        if (!placed) {
          // No clear spot in 8 tries: park it out in the far ring,
          // where the tall rule guarantees it crosses nothing.
          const m = Math.hypot(sx, sz) || 1;
          sx = (sx / m) * 9.6;
          sz = (sz / m) * 9.6;
        }
        const shard = new THREE.Mesh(
          new THREE.OctahedronGeometry(shardSize),
          new THREE.MeshStandardMaterial({
            color: purple ? 0x7b4fd0 : 0x00acc1,
            emissive: new THREE.Color(purple ? 0xb388ff : 0x00e5ff),
            emissiveIntensity: 1.4,
            roughness: 0.3,
            metalness: 0.4,
          })
        );
        shard.position.set(sx, sy, sz);
        shard.rotation.set(shardRng() * 3, shardRng() * 3, 0);
        shard.userData.spin = 0.2 + shardRng() * 0.5;
        scene.add(shard);
        shards.push(shard);
      }
      updaters.push((t, dt) => {
        for (const shard of shards) {
          shard.rotation.y += shard.userData.spin * dt;
          shard.rotation.x += shard.userData.spin * 0.4 * dt;
          shard.position.y += Math.sin(t * 0.8 + shard.position.x) * 0.0015;
        }
      });
      // Purple / cyan particle streams, drifting in place.
      const motes = makePoints(260, 0xce93d8, 0.1, true, 4242);
      const moteBase = new Float32Array(motes.positions);
      const motePhase = new Float32Array(260);
      for (let i = 0; i < 260; i++) motePhase[i] = motes.rng() * Math.PI * 2;
      updaters.push(t => {
        const arr = motes.positions;
        for (let i = 0; i < 260; i++) {
          arr[i * 3] = moteBase[i * 3] + Math.sin(t * 0.35 + motePhase[i]) * 0.6;
          arr[i * 3 + 1] = moteBase[i * 3 + 1] + Math.sin(t * 0.5 + motePhase[i] * 1.7) * 0.45;
        }
        motes.points.geometry.attributes.position.needsUpdate = true;
      });
      const qLight1 = new THREE.PointLight(0xb388ff, 1.2, 14);
      qLight1.position.set(-5, 3, -3);
      scene.add(qLight1);
      const qLight2 = new THREE.PointLight(0x00e5ff, 1.0, 14);
      qLight2.position.set(5, 3, 3);
      scene.add(qLight2);
      // A slow-turning halo ring high over the duel ground — the
      // Realm's signature in the sky, catching the bloom.
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(6.5, 0.09, 10, 64),
        new THREE.MeshStandardMaterial({
          color: 0x7b4fd0,
          emissive: new THREE.Color(0xb388ff),
          emissiveIntensity: 1.3,
          roughness: 0.3,
          metalness: 0.4,
        })
      );
      halo.position.set(0, 6.5, -4);
      halo.rotation.x = Math.PI / 2.6;
      scene.add(halo);
      updaters.push((t, dt) => {
        halo.rotation.z += dt * 0.08;
      });
    } else if (world === 'water') {
      scene.background = new THREE.Color(0xe2f4fd);
      addSkyDome(scene, 'water');
      scene.fog = new THREE.Fog(0xcfe9f6, 14, 50);
      renderer.toneMappingExposure = 1.0;
      hemi.color.set(0xeaf7ff);
      hemi.groundColor.set(0x4a7a8c);
      hemi.intensity = 0.95;
      sun.color.set(0xffffff);
      sun.intensity = 1.35;
      sun.position.set(6, 12, 4);
      addGround(0.95);
      // Tide pools: glossy blue discs sunk in the sand, each rimmed
      // with a ring of white foam.
      const poolMat = new THREE.MeshStandardMaterial({
        color: 0x2f9bc4,
        emissive: new THREE.Color(0x0d4a66),
        emissiveIntensity: 0.35,
        roughness: 0.12,
        metalness: 0.1,
      });
      const foamMat = new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: 0.7 });
      const poolSpots: Array<[number, number, number]> = [
        [-8.5, -6, 2.0],
        [7.5, -7.5, 1.6],
        [9.5, 5.5, 2.3],
        [-10, 4.5, 1.4],
      ];
      for (const [px, pz, pr] of poolSpots) {
        const pool = new THREE.Mesh(new THREE.CircleGeometry(pr, 24), poolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(px, 0.02, pz);
        scene.add(pool);
        const foam = new THREE.Mesh(new THREE.TorusGeometry(pr, 0.07, 8, 32), foamMat);
        foam.rotation.x = -Math.PI / 2;
        foam.position.set(px, 0.03, pz);
        scene.add(foam);
      }
      // Reef rocks: grey-blue boulders scattered off the duel ground.
      // MID tier (tops ~0.6–1.1): clear of the fighters and out of
      // the front sightline wedge.
      const reefMat = new THREE.MeshStandardMaterial({ color: 0x5f7f8c, roughness: 1 });
      const wrng = mulberry32(63);
      for (let i = 0; i < 14; i++) {
        const x = (wrng() * 2 - 1) * 22;
        const z = (wrng() * 2 - 1) * 22;
        const s = 0.4 + wrng() * 0.5;
        if (!dressingSpotClear(x, z, s, 0.22 + s)) continue;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s), reefMat);
        rock.position.set(x, 0.22, z);
        rock.rotation.set(wrng() * 3, wrng() * 3, 0);
        scene.add(rock);
      }
      // Drifting spray: fine pale points swirling slowly sideways.
      const spray = makePoints(300, 0xeafcff, 0.08, false, 2024);
      const sprayBase = new Float32Array(spray.positions);
      const sprayPhase = new Float32Array(300);
      for (let i = 0; i < 300; i++) sprayPhase[i] = spray.rng() * Math.PI * 2;
      updaters.push(t => {
        const arr = spray.positions;
        for (let i = 0; i < 300; i++) {
          arr[i * 3] = sprayBase[i * 3] + Math.sin(t * 0.4 + sprayPhase[i]) * 0.8;
          arr[i * 3 + 1] = sprayBase[i * 3 + 1] + Math.sin(t * 0.6 + sprayPhase[i] * 1.3) * 0.3;
        }
        spray.points.geometry.attributes.position.needsUpdate = true;
      });
    } else if (world === 'electric') {
      scene.background = new THREE.Color(0x3a3f63);
      addSkyDome(scene, 'electric');
      scene.fog = new THREE.Fog(0x232742, 11, 42);
      renderer.toneMappingExposure = 1.1;
      hemi.color.set(0x8a93b8);
      hemi.groundColor.set(0x23242e);
      hemi.intensity = 0.5;
      sun.color.set(0xaab4ff);
      sun.intensity = 0.5;
      sun.position.set(-5, 12, -3);
      rim.color.set(0xffe082);
      rim.intensity = 0.85;
      addGround(1);
      // Conductor pylons: dark posts crowned with crackling yellow
      // crystals; the front three carry lights that flicker with the
      // storm (the fire world's lava-light pattern, sped up).
      // Fixed spots, all verified against the round-3 exclusion rule
      // (see dressingSpotClear): every spot sits beyond the camera
      // orbit disk (radius ≥ 10.3 from centre) and ≥ 8.7 from either
      // fighter mark, so a pylon can never cross a sightline.
      const postMat = new THREE.MeshStandardMaterial({
        color: 0x2c2f3a,
        roughness: 0.6,
        metalness: 0.5,
      });
      const pylonCrystalMat = new THREE.MeshStandardMaterial({
        color: 0xffe082,
        emissive: new THREE.Color(0xffea00),
        emissiveIntensity: 1.9,
        roughness: 0.3,
      });
      const pylonLights: THREE.PointLight[] = [];
      const pylonSpots: Array<[number, number, boolean]> = [
        [-8, -7, true],
        [8.5, -6, true],
        [-7, 7.5, true],
        [12, 3, false],
        [-12.5, -1, false],
        [14.5, -5.5, false],
        [-14, 4.5, false],
      ];
      for (const [px, pz, lit] of pylonSpots) {
        const pylon = new THREE.Group();
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 2.6, 8), postMat);
        post.position.y = 1.3;
        pylon.add(post);
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), pylonCrystalMat);
        crystal.position.y = 2.95;
        pylon.add(crystal);
        pylon.position.set(px, 0, pz);
        scene.add(pylon);
        if (lit) {
          const light = new THREE.PointLight(0xffea00, 1.4, 10);
          light.position.set(px, 2.95, pz);
          scene.add(light);
          pylonLights.push(light);
        }
      }
      updaters.push(t => {
        pylonLights.forEach((light, i) => {
          light.intensity =
            1.25 +
            Math.sin(t * 23 + i * 2.1) * 0.25 +
            (Math.sin(t * 3.9 + i * 1.7) > 0.965 ? 1.4 : 0);
        });
        pylonCrystalMat.emissiveIntensity = 1.9 + Math.sin(t * 23) * 0.35;
      });
      // Rain: fast-falling pale points on a slant, wrapping to the top.
      const rain = makePoints(500, 0x9fb4d8, 0.07, false, 555);
      const rainSpeed = new Float32Array(500);
      for (let i = 0; i < 500; i++) rainSpeed[i] = 6 + rain.rng() * 3;
      updaters.push((t, dt) => {
        const arr = rain.positions;
        for (let i = 0; i < 500; i++) {
          arr[i * 3 + 1] -= rainSpeed[i] * dt;
          arr[i * 3] += 1.2 * dt;
          if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 11;
          if (arr[i * 3] > 26) arr[i * 3] = -26;
        }
        rain.points.geometry.attributes.position.needsUpdate = true;
      });
      // Ground sparks: yellow points hopping and jittering at floor
      // level around the duel ground.
      const sparks = makePoints(120, 0xfff59d, 0.09, true, 909);
      for (let i = 0; i < 120; i++) sparks.positions[i * 3 + 1] = sparks.rng() * 0.9;
      const sparkBase = new Float32Array(sparks.positions);
      updaters.push(t => {
        const arr = sparks.positions;
        for (let i = 0; i < 120; i++) {
          arr[i * 3] = sparkBase[i * 3] + Math.sin(t * 11 + i * 2.3) * 0.15;
          arr[i * 3 + 1] = sparkBase[i * 3 + 1] + Math.abs(Math.sin(t * 9 + i)) * 0.15;
          arr[i * 3 + 2] = sparkBase[i * 3 + 2] + Math.cos(t * 10 + i * 1.9) * 0.15;
        }
        sparks.points.geometry.attributes.position.needsUpdate = true;
      });
    } else if (world === 'nature') {
      scene.background = new THREE.Color(0xe4f5dc);
      addSkyDome(scene, 'nature');
      scene.fog = new THREE.Fog(0xd8efce, 14, 50);
      renderer.toneMappingExposure = 1.0;
      hemi.color.set(0xeaffea);
      hemi.groundColor.set(0x3d5a34);
      hemi.intensity = 0.95;
      sun.color.set(0xffffff);
      sun.intensity = 1.4;
      sun.position.set(7, 13, 5);
      addGround(1);
      // A worn dirt clearing under the duel ring. Round 3: shrunk
      // from radius 4.6 to 3.4 and deepened a step — at 4.6 the
      // clearing WAS the ground as far as the front camera could
      // tell, and the world read as a flat tan disc with trees on
      // it (live check 2026-11-12). Now the fighters stand on the
      // dirt and the painted grass owns everything around it.
      const clearing = new THREE.Mesh(
        new THREE.CircleGeometry(3.4, 28),
        new THREE.MeshStandardMaterial({ color: 0x7a6244, roughness: 1 })
      );
      clearing.rotation.x = -Math.PI / 2;
      clearing.position.y = 0.015;
      scene.add(clearing);
      // Leafy trees in THREE crown shapes — blob cluster, single
      // round crown, leafy cone — at varied scales, so the treeline
      // doesn't read as one blob stamped sixteen times. Trees are
      // TALL dressing: the exclusion rule stands them beyond the
      // camera's orbit disk (a tree inside it hid the player card
      // outright at one preview angle — the round-3 blocker).
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4c2f, roughness: 1 });
      const canopyMats = [0x3e7d32, 0x558b2f, 0x689f38].map(
        color => new THREE.MeshStandardMaterial({ color, roughness: 1 })
      );
      const nrng = mulberry32(73);
      for (let i = 0; i < 16; i++) {
        const x = (nrng() * 2 - 1) * 23;
        const z = (nrng() * 2 - 1) * 23;
        if (!dressingSpotClear(x, z, 2.2, 3.4)) continue;
        const tree = new THREE.Group();
        const crown = Math.floor(nrng() * 3);
        const mat = canopyMats[Math.floor(nrng() * canopyMats.length)];
        if (crown === 1) {
          // Single round crown on a taller trunk.
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.7, 7), trunkMat);
          trunk.position.y = 0.85;
          tree.add(trunk);
          const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 + nrng() * 0.4, 1), mat);
          ball.position.y = 2.5;
          tree.add(ball);
        } else if (crown === 2) {
          // Leafy cone.
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 1.1, 7), trunkMat);
          trunk.position.y = 0.55;
          tree.add(trunk);
          const cone = new THREE.Mesh(new THREE.ConeGeometry(1.05 + nrng() * 0.25, 2.4, 8), mat);
          cone.position.y = 2.2;
          tree.add(cone);
        } else {
          // Blob cluster: two or three canopy blobs in varied greens.
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 7), trunkMat);
          trunk.position.y = 0.6;
          tree.add(trunk);
          const blobs = 2 + Math.floor(nrng() * 2);
          for (let b = 0; b < blobs; b++) {
            const r = 0.9 + nrng() * 0.45;
            const blob = new THREE.Mesh(
              new THREE.IcosahedronGeometry(r, 1),
              canopyMats[Math.floor(nrng() * canopyMats.length)]
            );
            blob.position.set((nrng() * 2 - 1) * 0.55, 1.8 + nrng() * 0.8, (nrng() * 2 - 1) * 0.55);
            tree.add(blob);
          }
        }
        const ts = 0.85 + nrng() * 0.5;
        tree.scale.setScalar(ts);
        tree.position.set(x, 0, z);
        tree.rotation.y = nrng() * Math.PI * 2;
        scene.add(tree);
      }
      // Bushes: squashed green spheres near the ground. LOW tier —
      // they can reach a fighter's ankles, never hide it; the rule
      // only keeps them off the fighter marks themselves.
      for (let i = 0; i < 12; i++) {
        const x = (nrng() * 2 - 1) * 21;
        const z = (nrng() * 2 - 1) * 21;
        const s = 0.5 + nrng() * 0.3;
        if (!dressingSpotClear(x, z, s, 0.8)) continue;
        const bush = new THREE.Mesh(
          new THREE.IcosahedronGeometry(s, 1),
          canopyMats[Math.floor(nrng() * canopyMats.length)]
        );
        bush.scale.y = 0.6;
        bush.position.set(x, 0.28, z);
        scene.add(bush);
      }
      // Wildflowers: tiny bright heads on the grass, kept off the
      // fighter marks by the same rule (they used to be kept out of
      // the whole clearing radius; at LOW tier they may now ring
      // the dirt, which is where flowers read best).
      const flowerMats = [0xff8a80, 0xfff59d, 0xea80fc, 0xffffff].map(
        color => new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
      );
      for (let i = 0; i < 30; i++) {
        const x = (nrng() * 2 - 1) * 21;
        const z = (nrng() * 2 - 1) * 21;
        if (!dressingSpotClear(x, z, 0.1, 0.3)) continue;
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.055 + nrng() * 0.03, 6, 5),
          flowerMats[Math.floor(nrng() * flowerMats.length)]
        );
        flower.position.set(x, 0.16 + nrng() * 0.1, z);
        scene.add(flower);
      }
      // Falling leaves: drift down with a strong sway (the snow
      // updater, warmer and lazier), wrapping back to the canopy.
      const leaves = makePoints(220, 0xaed581, 0.12, false, 3141);
      const leafSpeed = new Float32Array(220);
      for (let i = 0; i < 220; i++) leafSpeed[i] = 0.5 + leaves.rng() * 0.45;
      updaters.push((t, dt) => {
        const arr = leaves.positions;
        for (let i = 0; i < 220; i++) {
          arr[i * 3 + 1] -= leafSpeed[i] * dt;
          arr[i * 3] += Math.sin(t * 1.3 + i) * 0.5 * dt;
          arr[i * 3 + 2] += Math.cos(t * 1.1 + i) * 0.3 * dt;
          if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 11;
        }
        leaves.points.geometry.attributes.position.needsUpdate = true;
      });
    } else if (world === 'shadow') {
      scene.background = new THREE.Color(0x332257);
      addSkyDome(scene, 'shadow');
      scene.fog = new THREE.Fog(0x201638, 9, 38);
      renderer.toneMappingExposure = 1.2;
      hemi.color.set(0x6a5a8c);
      hemi.groundColor.set(0x14101f);
      hemi.intensity = 0.45;
      sun.color.set(0x8e6bc8);
      sun.intensity = 0.35;
      sun.position.set(-4, 10, -5);
      rim.color.set(0x9a7fd4);
      rim.intensity = 0.95;
      addGround(1);
      // Ground mist: four broad radial veils lying over the marsh,
      // turning almost imperceptibly at different rates and depths.
      const mistTex = makeRadialTexture('rgba(168,152,204,0.16)', 'rgba(168,152,204,0)');
      const mists: THREE.Mesh[] = [];
      for (let i = 0; i < 4; i++) {
        const mist = new THREE.Mesh(
          new THREE.PlaneGeometry(46, 46),
          new THREE.MeshBasicMaterial({
            map: mistTex,
            transparent: true,
            depthWrite: false,
          })
        );
        mist.rotation.x = -Math.PI / 2;
        mist.position.y = 0.3 + i * 0.35;
        mist.renderOrder = 1;
        scene.add(mist);
        mists.push(mist);
      }
      updaters.push((t, dt) => {
        mists.forEach((mist, i) => {
          mist.rotation.z += dt * (0.012 + i * 0.007) * (i % 2 === 0 ? 1 : -1);
        });
      });
      // Dead trees: bare trunks with a few angled branch cylinders —
      // silhouettes, no leaves. TALL: the exclusion rule keeps them
      // beyond the orbit disk (branches reach ~1.1 out, hence r).
      const deadMat = new THREE.MeshStandardMaterial({ color: 0x120e18, roughness: 1 });
      const drng = mulberry32(97);
      for (let i = 0; i < 12; i++) {
        const x = (drng() * 2 - 1) * 22;
        const z = (drng() * 2 - 1) * 22;
        const h = 2 + drng() * 1.4;
        if (!dressingSpotClear(x, z, 1.1, h)) continue;
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.17, h, 7), deadMat);
        trunk.position.y = h / 2;
        trunk.rotation.z = (drng() * 2 - 1) * 0.07;
        tree.add(trunk);
        const branches = 2 + Math.floor(drng() * 2);
        for (let b = 0; b < branches; b++) {
          const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.95, 5), deadMat);
          const dirSign = drng() > 0.5 ? 1 : -1;
          branch.position.set(dirSign * 0.32, h - 0.35 - b * 0.3, (drng() * 2 - 1) * 0.2);
          branch.rotation.z = dirSign * (0.75 + drng() * 0.35);
          branch.rotation.y = drng() * Math.PI * 2;
          tree.add(branch);
        }
        tree.position.set(x, 0, z);
        tree.rotation.y = drng() * Math.PI * 2;
        scene.add(tree);
      }
      // Dim drifting motes in a low violet gloom light.
      const gloom = new THREE.PointLight(0x7b4fd0, 0.8, 15);
      gloom.position.set(0, 2.5, -4);
      scene.add(gloom);
      const smotes = makePoints(160, 0x8e7cc3, 0.08, true, 666);
      const smoteBase = new Float32Array(smotes.positions);
      const smotePhase = new Float32Array(160);
      for (let i = 0; i < 160; i++) smotePhase[i] = smotes.rng() * Math.PI * 2;
      updaters.push(t => {
        const arr = smotes.positions;
        for (let i = 0; i < 160; i++) {
          arr[i * 3] = smoteBase[i * 3] + Math.sin(t * 0.2 + smotePhase[i]) * 0.7;
          arr[i * 3 + 1] = smoteBase[i * 3 + 1] + Math.sin(t * 0.3 + smotePhase[i] * 1.7) * 0.4;
        }
        smotes.points.geometry.attributes.position.needsUpdate = true;
      });
    } else if (world === 'light') {
      scene.background = new THREE.Color(0xfff8e2);
      addSkyDome(scene, 'light');
      scene.fog = new THREE.Fog(0xfdf3d0, 16, 55);
      renderer.toneMappingExposure = 0.95;
      hemi.color.set(0xfff6dd);
      hemi.groundColor.set(0xcbb27a);
      hemi.intensity = 1.05;
      sun.color.set(0xffe9a8);
      sun.intensity = 1.55;
      sun.position.set(5, 14, 3);
      rim.intensity = 0.35;
      // The other bright floor: keep bloom from glaring here too.
      if (bloomPass) bloomPass.strength = 0.45;
      addGround(0.7, 0.05);
      // Mesa blocks: flat-topped pale stone standing at the edges.
      // TALL tier via the exclusion rule (a mesa's half-diagonal is
      // ~2.9, so centres land past 11.7 and no corner can reach the
      // camera's orbit disk).
      const mesaMat = new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 0.9 });
      const lrng = mulberry32(111);
      for (let i = 0; i < 8; i++) {
        const x = (lrng() * 2 - 1) * 24;
        const z = (lrng() * 2 - 1) * 24;
        const w = 2.5 + lrng() * 2;
        const h = 1 + lrng() * 1.2;
        if (!dressingSpotClear(x, z, 2.9, 2.2)) continue;
        const mesa = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2 + lrng() * 1.5), mesaMat);
        mesa.position.set(x, h / 2, z);
        mesa.rotation.y = lrng() * Math.PI * 2;
        scene.add(mesa);
      }
      // Sun pillars: pale obelisks around the ground, crowned with
      // glowing amber shards. The ring stands at 9.4 — outside the
      // camera's orbit disk (7.6) with the pillar's own width to
      // spare, per the round-3 exclusion rule for TALL dressing.
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe6d7ac, roughness: 0.6 });
      const shardMat = new THREE.MeshStandardMaterial({
        color: 0xffca28,
        emissive: new THREE.Color(0xffb300),
        emissiveIntensity: 1.9,
        roughness: 0.3,
      });
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + 0.5;
        const px = Math.cos(angle) * 9.4;
        const pz = Math.sin(angle) * 9.4;
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.2, 0.55), pillarMat);
        pillar.position.set(px, 1.6, pz);
        scene.add(pillar);
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), shardMat);
        shard.position.set(px, 3.55, pz);
        scene.add(shard);
      }
      const sunGlow = new THREE.PointLight(0xffd54f, 0.9, 16);
      sunGlow.position.set(0, 4, -6);
      scene.add(sunGlow);
      // Floating light motes: golden points rising slowly (the fire
      // world's ember updater, slowed to a drift).
      const lmotes = makePoints(200, 0xffd54f, 0.1, true, 1212);
      const lmoteSpeed = new Float32Array(200);
      for (let i = 0; i < 200; i++) lmoteSpeed[i] = 0.25 + lmotes.rng() * 0.3;
      updaters.push((t, dt) => {
        const arr = lmotes.positions;
        for (let i = 0; i < 200; i++) {
          arr[i * 3 + 1] += lmoteSpeed[i] * dt;
          arr[i * 3] += Math.sin(t * 0.8 + i * 1.3) * 0.15 * dt;
          if (arr[i * 3 + 1] > 8) arr[i * 3 + 1] = 0;
        }
        lmotes.points.geometry.attributes.position.needsUpdate = true;
      });
    } else if (world === 'spiritual') {
      scene.background = new THREE.Color(0xeaf6ee);
      addSkyDome(scene, 'spiritual');
      scene.fog = new THREE.Fog(0xdcefe6, 10, 42);
      renderer.toneMappingExposure = 1.05;
      hemi.color.set(0xeafffa);
      hemi.groundColor.set(0x51706c);
      hemi.intensity = 0.9;
      sun.color.set(0xe0f2f1);
      sun.intensity = 1.1;
      sun.position.set(-6, 11, 4);
      addGround(1);
      // Weathered stone slabs scattered as shrine paving. LOW and
      // flat (top 0.11) — the exclusion rule only keeps them off
      // the fighter marks (r ≈ their half-diagonal).
      const slabMat = new THREE.MeshStandardMaterial({ color: 0x77877c, roughness: 1 });
      const srng2 = mulberry32(131);
      for (let i = 0; i < 18; i++) {
        const x = (srng2() * 2 - 1) * 22;
        const z = (srng2() * 2 - 1) * 22;
        if (!dressingSpotClear(x, z, 1.1, 0.11)) continue;
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(1.2 + srng2() * 0.7, 0.07, 0.9 + srng2() * 0.5),
          slabMat
        );
        slab.position.set(x, 0.035, z);
        slab.rotation.y = srng2() * Math.PI * 2;
        scene.add(slab);
      }
      // A torii-like gate standing at the back of the ground.
      const gateMat = new THREE.MeshStandardMaterial({ color: 0x7a2e22, roughness: 0.8 });
      const gate = new THREE.Group();
      for (const gx of [-1.6, 1.6]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 3.4, 10), gateMat);
        post.position.set(gx, 1.7, 0);
        gate.add(post);
      }
      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.28, 0.34), gateMat);
      topBeam.position.y = 3.55;
      gate.add(topBeam);
      const midBeam = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.2, 0.26), gateMat);
      midBeam.position.y = 2.75;
      gate.add(midBeam);
      gate.position.set(0, 0, -10);
      scene.add(gate);
      // A stepping-stone path from the duel ground to the gate:
      // flat stone discs wandering gently as they recede.
      for (let i = 0; i < 5; i++) {
        const stone = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55 + srng2() * 0.15, 0.6 + srng2() * 0.15, 0.07, 12),
          slabMat
        );
        stone.position.set(Math.sin(i * 1.4) * 0.5, 0.035, -4.6 - i * 1.15);
        scene.add(stone);
      }
      // Stone lanterns with warm glowing chambers; two carry real
      // point lights, all four glow by emissive. Fixed spots,
      // verified against the round-3 exclusion rule (MID tier —
      // tops 1.33): all four clear the fighter marks and the front
      // sightline wedge. The right-hand unlit lantern used to sit
      // at (6, 2.5) — dead ON a front sightline to the opponent
      // (min distance 0.05 in the geometry proof) — it now stands
      // at (8, 0.5), clear by ~0.94.
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8b968c, roughness: 1 });
      const glowMat = new THREE.MeshStandardMaterial({
        color: 0xffd9a0,
        emissive: new THREE.Color(0xffb45e),
        emissiveIntensity: 1.9,
        roughness: 0.5,
      });
      const lanternSpots: Array<[number, number, boolean]> = [
        [-4.5, -3.5, true],
        [4.5, -3.5, true],
        [-6, 2.5, false],
        [8, 0.5, false],
      ];
      for (const [lx, lz, lit] of lanternSpots) {
        const lantern = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), stoneMat);
        base.position.y = 0.09;
        lantern.add(base);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.55, 8), stoneMat);
        post.position.y = 0.45;
        lantern.add(post);
        const chamber = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), glowMat);
        chamber.position.y = 0.9;
        lantern.add(chamber);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.6), stoneMat);
        cap.position.y = 1.13;
        lantern.add(cap);
        const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), stoneMat);
        jewel.position.y = 1.26;
        lantern.add(jewel);
        lantern.position.set(lx, 0, lz);
        scene.add(lantern);
        if (lit) {
          const light = new THREE.PointLight(0xffb45e, 0.9, 7);
          light.position.set(lx, 1.0, lz);
          scene.add(light);
        }
      }
      // Drifting petals: pale pink points falling with a sway (the
      // nature leaves' pattern, slower and softer).
      const petals = makePoints(200, 0xf6c6d8, 0.1, false, 1717);
      const petalSpeed = new Float32Array(200);
      for (let i = 0; i < 200; i++) petalSpeed[i] = 0.4 + petals.rng() * 0.35;
      updaters.push((t, dt) => {
        const arr = petals.positions;
        for (let i = 0; i < 200; i++) {
          arr[i * 3 + 1] -= petalSpeed[i] * dt;
          arr[i * 3] += Math.sin(t * 1.0 + i * 1.4) * 0.4 * dt;
          arr[i * 3 + 2] += Math.cos(t * 0.9 + i) * 0.25 * dt;
          if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 10;
        }
        petals.points.geometry.attributes.position.needsUpdate = true;
      });
    } else {
      // Arena: the neutral duel ground — every one of the nine
      // elements has its own world above, so this remains only as
      // the guard for a stray element value: dark stone, a marked
      // duel circle, and rim lighting in the accent element colour.
      scene.background = new THREE.Color(0x33333d);
      addSkyDome(scene, 'arena');
      scene.fog = new THREE.Fog(0x26262e, 15, 50);
      hemi.color.set(0xcfd8dc);
      hemi.groundColor.set(0x3a3a3f);
      hemi.intensity = 0.7;
      sun.color.set(0xffffff);
      sun.intensity = 1.2;
      addGround(1);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.4, 0.09, 10, 48),
        new THREE.MeshStandardMaterial({ color: 0x55555f, roughness: 0.7, metalness: 0.3 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      scene.add(ring);
      const accent = elementColor(accentElement ?? 'ice');
      const accent1 = new THREE.PointLight(new THREE.Color(accent), 1.2, 13);
      accent1.position.set(-5, 2.5, -2);
      scene.add(accent1);
      const accent2 = new THREE.PointLight(new THREE.Color(accent), 1.2, 13);
      accent2.position.set(5, 2.5, 2);
      scene.add(accent2);
      const rrng = mulberry32(19);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 1 });
      for (let i = 0; i < 9; i++) {
        const x = (rrng() * 2 - 1) * 20;
        const z = (rrng() * 2 - 1) * 20;
        const s = 0.4 + rrng() * 0.5;
        if (!dressingSpotClear(x, z, s, 0.25 + s)) continue;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s), rockMat);
        rock.position.set(x, 0.25, z);
        rock.rotation.set(rrng() * 3, rrng() * 3, 0);
        scene.add(rock);
      }
    }

    // ---------- The fighters ----------
    // Contact shadow: a soft blob on the floor under each fighter.
    // Every world is lit from above, so a fighter with nothing under
    // it reads as floating — the blob is what sells the grounding
    // the models' feet placement works for. The blob is LAYERED: a
    // dark core with a faint warm rim of light just outside it. On
    // dark floors (Fire, Shadow) a pure-black blob is invisible
    // against the ground — the rim is what a reviewer sees the
    // fighter standing in (live check 2026-11-12: no shadow could be
    // found under either fighter in Fire World). On bright floors
    // the core carries it — and the core is DEEPER and the plane
    // LARGER since round 3: on Ice the player's shadow vanished
    // into a bloom-brightened white glare under her card (opponent's
    // read fine, player's didn't), so the centre alpha went
    // 0.62 → 0.82 with a firmer mid-stop, the plane grew
    // 3.0×1.9 → 3.4×2.15, and Ice's bloom strength + snow base were
    // pulled back a step in the same round. One shared canvas
    // texture, one flat plane per fighter, added to the SCENE (not
    // the fighter group, whose ±90° facing turn would swing the
    // ellipse around): the tick moves it with the group's x, so it
    // follows lunges and shakes, staying centred under the fighter.
    // It sits at floor level, so it is correct for every fighter
    // form — GLB (whose base the loader grounds, modelYOffset
    // included), billboard sprite, and orb.
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const shadowCtx = shadowCanvas.getContext('2d');
    if (shadowCtx) {
      // Rim first (wider, fainter), then the core over its centre.
      let grad = shadowCtx.createRadialGradient(128, 128, 8, 128, 128, 126);
      grad.addColorStop(0, 'rgba(255,244,214,0)');
      grad.addColorStop(0.6, 'rgba(255,244,214,0)');
      grad.addColorStop(0.8, 'rgba(255,244,214,0.22)');
      grad.addColorStop(1, 'rgba(255,244,214,0)');
      shadowCtx.fillStyle = grad;
      shadowCtx.fillRect(0, 0, 256, 256);
      grad = shadowCtx.createRadialGradient(128, 128, 4, 128, 128, 118);
      grad.addColorStop(0, 'rgba(0,0,0,0.82)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.58)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      shadowCtx.fillStyle = grad;
      shadowCtx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    const makeContactShadow = (x: number) => {
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 2.15),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(x, 0.025, 0);
      shadow.renderOrder = 1;
      scene.add(shadow);
      return shadow;
    };
    interface FighterRig {
      group: THREE.Group;
      billboard: THREE.Sprite | null;
      shadow: THREE.Mesh;
      baseX: number;
      dir: number; // +1 faces the opponent to the right, -1 to the left
      side: 'player' | 'opponent';
      // World-space height of the fighter's visual (GLB world box,
      // billboard height, orb top) — set when the visual is built.
      // Feeds the parity metrics written on the mount (see the label
      // projection in the tick loop).
      topY: number;
    }
    const rigs: FighterRig[] = [];
    const buildFighter = (fighter: WorldFighter, side: 'player' | 'opponent') => {
      const baseX = side === 'player' ? PLAYER_X : OPPONENT_X;
      const dir = side === 'player' ? 1 : -1;
      const group = new THREE.Group();
      group.position.set(baseX, 0, 0);
      // Face the opponent. The Griffin/Ashwing GLBs' fronts are +z in
      // model space (verified from the geometry: head/chest mass at
      // +z, tail sweeping low at -z), so the ±90° group turn puts each
      // fighter's front toward the other. A model whose front is not
      // +z (Luminara's dragon: -x) is pre-turned by its modelRotationY
      // when it loads, below.
      group.rotation.y = side === 'player' ? Math.PI / 2 : -Math.PI / 2;
      scene.add(group);
      const rig: FighterRig = {
        group,
        billboard: null,
        shadow: makeContactShadow(baseX),
        baseX,
        dir,
        side,
        topY: 0,
      };
      rigs.push(rig);

      const addBillboard = () => {
        if (cancelled || !fighter.imageUrl) {
          addOrb();
          return;
        }
        // The 2D fighter is a SPRITE, never a plane. A plane inside
        // the facing-rotated fighter group inherits the group's ±90°
        // turn, so copying the camera quaternion onto it left it
        // ~90° off the camera — a thin edge-on sliver at the default
        // orbit angle (Quantix, live check 2026-11-12). A sprite is
        // billboarded by the renderer in view space: it faces the
        // camera at every orbit angle, whatever the group does.
        // The sprite is added when the texture actually arrives; a
        // failed art load falls back to the element orb, never to an
        // invisible fighter.
        new THREE.TextureLoader().load(
          fighter.imageUrl,
          texture => {
            if (cancelled) return;
            texture.colorSpace = THREE.SRGBColorSpace;
            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const board = new THREE.Sprite(mat);
            // Keep the art's own aspect: the navitar art is a full
            // painting (landscape 3:2 or portrait 2:3, no alpha), and
            // forcing it into a 1.7×1.7 square squashed it into a
            // "flat square portrait" (live check 2026-11-12). Height
            // stays 1.7; the width follows the image.
            const img = texture.image as { width?: number; height?: number } | undefined;
            const aspect = img && img.width && img.height ? img.width / img.height : 1;
            board.scale.set(1.7 * aspect, 1.7, 1);
            // A sprite anchors at its centre, so a 1.7-tall board
            // centred at 0.85 rests its bottom edge exactly on the
            // floor (y = 0) — right on its contact shadow, like the
            // grounded GLB fighters. The old 1.05 centre left the
            // bottom edge hovering 0.2 above the shadow with pale
            // floor showing between (live check 2026-11-12). Same
            // size, same aspect — the card simply sits on the ground
            // instead of floating just above it.
            board.position.y = 0.85;
            group.add(board);
            rig.billboard = board;
            rig.topY = 1.7;
          },
          undefined,
          () => {
            if (!cancelled) addOrb();
          }
        );
      };
      const addOrb = () => {
        const color = ELEMENT_COLORS[fighter.element] ?? '#2196F3';
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.38, 16, 12),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            emissive: new THREE.Color(color),
            emissiveIntensity: 0.7,
            roughness: 0.4,
          })
        );
        orb.position.y = 0.95;
        group.add(orb);
        rig.topY = 1.33;
      };

      if (fighter.modelUrl) {
        const loader = new GLTFLoader();
        loader.load(
          fighter.modelUrl,
          gltf => {
            if (cancelled) return;
            // Per-model facing fix, applied BEFORE the bounding box is
            // measured so grounding/scale use the turned footprint
            // (a ±90° turn keeps the box axis-aligned). Only Luminara's
            // dragon needs it — its front is -x in model space, while
            // the stage's ±90° group turn assumes a +z front.
            if (fighter.modelRotationY) gltf.scene.rotation.y = fighter.modelRotationY;
            const rawBox = new THREE.Box3().setFromObject(gltf.scene);
            const size = rawBox.getSize(new THREE.Vector3());
            const center = rawBox.getCenter(new THREE.Vector3());
            const max = Math.max(size.x, size.y, size.z) || 1;
            const scale = (FIGHTER_TARGET * (fighter.modelZoom ?? 1)) / max;
            gltf.scene.scale.setScalar(scale);
            // Centre x/z on the fighter's mark; the y shift comes
            // after the world box is measured, below.
            gltf.scene.position.set(-center.x * scale, 0, -center.z * scale);
            group.add(gltf.scene);
            // Ground on the model's WORLD box — where the model
            // actually sits now that it is scaled, turned and centred
            // inside its fighter group — not on the raw geometry box
            // alone. Grounding must follow the render: an export
            // carrying node-level transforms (a translated or rotated
            // mesh node, a posed root) renders where its world box
            // says, wherever its raw vertices sit. (For the current
            // roster the two boxes coincide — every GLB here is a
            // single untransformed node, verified from the files on
            // 2026-11-12 — so Griffin / Ashwing / Luminara land
            // exactly where they always have: the shift works out to
            // the same -(min.y + offset) * scale as before.)
            group.updateMatrixWorld(true);
            const worldBox = new THREE.Box3().setFromObject(gltf.scene);
            // Per-model ground offset: a model whose lowest vertex is
            // NOT its feet grounds on its feet instead — the ground
            // line rises from the box base by modelYOffset (model
            // units, scaled here as before): Luminara's tail sweep
            // defines her box base while her feet bottom 0.0134 above
            // it, so box grounding left her feet dangling above the
            // ice (live check 2026-11-12). Absent = 0, so Griffin /
            // Ashwing ground exactly as before.
            const groundY = worldBox.min.y + (fighter.modelYOffset ?? 0) * scale;
            gltf.scene.position.y -= groundY;
            // Visible top of the grounded model (its world box,
            // lifted by the same grounding shift) — the parity
            // metrics read this for both slots.
            rig.topY = worldBox.max.y - groundY;
          },
          undefined,
          () => {
            if (!cancelled) addBillboard();
          }
        );
      } else {
        addBillboard();
      }
    };
    if (player) buildFighter(player, 'player');
    if (opponent) buildFighter(opponent, 'opponent');

    // Winner's ring: a gold torus under the winning fighter, pulsing
    // gently. Hidden until a winner is decided.
    const winnerRingMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      emissive: new THREE.Color(0xffb300),
      emissiveIntensity: 1.2,
      roughness: 0.3,
      metalness: 0.6,
    });
    const winnerRing = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.07, 10, 40), winnerRingMat);
    winnerRing.rotation.x = -Math.PI / 2;
    winnerRing.position.y = 0.04;
    winnerRing.visible = false;
    scene.add(winnerRing);

    // ---------- Camera: slow sway, drag to look ----------
    // The base angle is FRONT (0), never swung to one side: the old
    // 0.6 rad base parked the camera ~34° toward the OPPONENT's side,
    // so the opponent sat ~7.2 units from the camera while the player
    // sat ~9.8 — the identical model rendered hero-sized on the
    // opponent's side and small and backlit on the player's (live
    // run-through 2026-11-12: adopted Frostbite ~65px as the player
    // vs ~125px as the opponent; dragging the camera to the mirrored
    // angle flipped which fighter was big, proving it was the
    // framing, not the fighter path — scale and lights are one
    // symmetric code path for both slots). Front base + a gentle
    // ±0.15 rad sway keeps both fighters equidistant on average, so a
    // modeled player fighter renders at the same scale and lighting
    // as the identical model across from it.
    let orbit = 0;
    let dragging = false;
    let lastPointerX = 0;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastPointerX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      orbit -= (e.clientX - lastPointerX) * 0.005;
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

    // Sizing follows the MOUNT, not the window: the old code sized
    // the canvas once from clientWidth/clientHeight at effect time
    // and only re-sized on window resize. If layout had not settled
    // when the effect ran (height still 0), the canvas stayed 0-sized
    // forever and the stage showed only the flat page gradient — the
    // "empty Ice Field" of the 2026-11-12 live check, on a day the
    // same build had rendered the full world. A ResizeObserver
    // re-sizes whenever the mount's box changes, including the first
    // real layout after mount, so the world always gets its canvas.
    const applySize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = Math.max(mount.clientHeight, 1);
      if (w === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer) {
        composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        composer.setSize(w, h);
      }
    };
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(applySize);
      resizeObserver.observe(mount);
    }
    window.addEventListener('resize', applySize);

    // Lunge / flinch in the scene: a lunge steps toward the opponent
    // and back over ~0.55 s; a shake jitters in place. The duel clears
    // the animation after ~700 ms, so the same move can fire again.
    const animState: Record<'player' | 'opponent', { anim: string; since: number }> = {
      player: { anim: '', since: 0 },
      opponent: { anim: '', since: 0 },
    };
    // Scratch vector + throttle state for the label projection.
    const projVec = new THREE.Vector3();
    const projTop = new THREE.Vector3();
    let lastReport: Record<'player' | 'opponent', FighterScreenPos | null> | null = null;
    let lastTick = performance.now();
    const tick = () => {
      if (cancelled) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const t = now / 1000;
      const dt = Math.min((now - lastTick) / 1000, 0.1);
      lastTick = now;

      for (const u of updaters) u(t, dt);

      const live = liveRef.current;
      for (const [side, anim] of [
        ['player', live.playerAnim],
        ['opponent', live.opponentAnim],
      ] as const) {
        const state = animState[side];
        if (anim !== state.anim) {
          state.anim = anim;
          state.since = now;
        }
      }
      for (const rig of rigs) {
        const side: 'player' | 'opponent' = rig.baseX < 0 ? 'player' : 'opponent';
        const state = animState[side];
        const elapsed = (now - state.since) / 1000;
        let offset = 0;
        if (state.anim === 'lunge') {
          offset = 0.7 * Math.sin(Math.PI * Math.min(elapsed / 0.55, 1));
        } else if (state.anim === 'shake') {
          offset = 0.07 * Math.sin(elapsed * 55);
        }
        rig.group.position.x = rig.baseX + rig.dir * offset;
        // The contact shadow rides the same offset, staying centred
        // under the fighter through lunges and shakes.
        rig.shadow.position.x = rig.group.position.x;
        // No billboard steering here: the 2D fighter is a sprite,
        // which the renderer billboards toward the camera itself.
      }

      const win = live.winner;
      if (win === 'player' || win === 'opponent') {
        winnerRing.visible = true;
        winnerRing.position.x = win === 'player' ? PLAYER_X : OPPONENT_X;
        winnerRingMat.emissiveIntensity = 1.0 + Math.sin(t * 4) * 0.35;
      } else {
        winnerRing.visible = false;
      }

      // The camera SWAYS around the front instead of revolving: a
      // full orbit periodically swings behind/side-on, where the two
      // fighters line up in projection and read as one cluster in the
      // centre of the ring (live check 2026-11-12). A slow ±0.15 rad
      // sway around the FRONT base keeps the classic fighting-game
      // framing — player left, opponent right, equidistant — while
      // the world still feels alive. Dragging moves the base angle
      // freely; the sway rides on top.
      const angle = orbit + Math.sin(t * 0.1) * 0.15;
      camera.position.set(Math.sin(angle) * 7.6, 3.0, Math.cos(angle) * 7.6);
      camera.lookAt(0, 1.0, 0);
      camera.updateMatrixWorld();

      // Project each fighter's BASE point for BattleStage's DOM
      // name labels (round 3: the labels live in a floor lane under
      // the fighters — see BattleStage.renderLabel for why the old
      // head anchor could never clear the HUD). The projected point
      // is the fighter's floor mark (group x/z, just above y=0), so
      // the label tracks lunges and shakes with its fighter.
      // Throttled: the callback fires only when a position moved by
      // more than ~0.4% of the stage, so the DOM layer re-renders a
      // few times a second, not every frame.
      const cb = posCbRef.current;
      if (cb) {
        const report: Record<'player' | 'opponent', FighterScreenPos | null> = {
          player: null,
          opponent: null,
        };
        for (const rig of rigs) {
          projVec.set(rig.group.position.x, 0.1, rig.group.position.z);
          projVec.project(camera);
          if (projVec.z < 1) {
            report[rig.side] = {
              x: (projVec.x * 0.5 + 0.5) * 100,
              y: (-projVec.y * 0.5 + 0.5) * 100,
            };
          }
        }
        const prev = lastReport;
        const changed =
          !prev ||
          (['player', 'opponent'] as const).some(s => {
            const a = prev[s];
            const b = report[s];
            if (!a || !b) return a !== b;
            return Math.abs(a.x - b.x) > 0.4 || Math.abs(a.y - b.y) > 0.4;
          });
        if (changed) {
          lastReport = report;
          cb(report);
          // PARITY METRICS (test hook, read-only): per-slot world
          // height and projected screen height of each fighter, plus
          // the world's fighter rim-light intensity (one scene-wide
          // directional — both slots are lit by the same rig). The
          // browser parity suite reads these off the mount to prove a
          // modeled PLAYER fighter renders at the same scale as the
          // identical model on the opponent side (the 2026-11-12
          // run-through blocker was camera framing, and this is the
          // measurement that keeps it from coming back). Written on
          // the same throttle as the label report — a few times a
          // second, never per frame.
          if (mount) {
            for (const rig of rigs) {
              if (rig.topY <= 0 || !report[rig.side]) continue;
              projTop.set(rig.group.position.x, rig.topY, rig.group.position.z);
              projTop.project(camera);
              if (projTop.z >= 1) continue;
              const topPct = (-projTop.y * 0.5 + 0.5) * 100;
              mount.dataset[rig.side === 'player' ? 'playerWorldH' : 'opponentWorldH'] =
                rig.topY.toFixed(3);
              mount.dataset[rig.side === 'player' ? 'playerScreenH' : 'opponentScreenH'] = (
                (report[rig.side]?.y ?? topPct) - topPct
              ).toFixed(1);
            }
            mount.dataset.rimIntensity = rim.intensity.toFixed(2);
          }
        }
      }

      if (composer) composer.render();
      else renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', applySize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerUp);
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        const disposeOne = (m: THREE.Material) => {
          const withMap = m as THREE.MeshBasicMaterial;
          if (withMap.map) withMap.map.dispose();
          m.dispose();
        };
        if (Array.isArray(material)) material.forEach(disposeOne);
        else if (material) disposeOne(material);
      });
      if (composer) {
        // EffectComposer.dispose releases its render targets (r152+).
        const c = composer as EffectComposer & { dispose?: () => void };
        if (typeof c.dispose === 'function') c.dispose();
      }
      renderer?.dispose();
      if (renderer && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [sceneKey, canRender3d]);

  // No WebGL (jsdom, or a browser without it): a themed CSS backdrop
  // with the world name — never an empty box, and never a GLB fetch
  // (the smoke harness counts fetches in jsdom).
  if (!canRender3d || failed3d) {
    const fb = WORLD_FALLBACK[world];
    return (
      <div
        aria-label={`${WORLD_NAMES[world]} — 3D view unavailable in this browser`}
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(160deg, ${fb.from} 0%, ${fb.to} 65%)`,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 18,
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600, letterSpacing: 1 }}>
          {WORLD_NAMES[world]}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      aria-label={`${WORLD_NAMES[world]} — drag to look around`}
      style={{ position: 'absolute', inset: 0, cursor: 'grab' }}
    />
  );
};

export default ElementalWorld;
