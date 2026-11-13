// Custom attacks — the user navitar's 5-slot move list (pure TS, no React).
//
// A NavitarAttack is the move as stored: `power` is the BASE power at
// Lv 1; the damage a move actually deals at the navitar's current level
// comes from attackPowerAtLevel (1.3x per level, so Lv 2 ≈ 1.3x base,
// Lv 6 ≈ 3.7x). `preset` marks a move that came from the element's
// preset list (a picker choice the player kept as-is) versus a custom
// name the player typed (preset: false).
//
// Presets are built ONLY from skill names already in the repo — venue
// fighters (src/data/venues.ts), wild navitars (src/data/wild.ts), the
// showcase characters (src/data/navitarCharacters.ts), the Home roster
// defaults (src/pages/Home.tsx ROSTER_SKILLS), the demo opponents
// (src/contexts/NavitarFightClub.tsx DEMO_OPPONENTS), Griffin's and
// Ashwing's skills — plus, where an element had fewer than 5 native
// names, a thematically-fitting repo name already used for that kind of
// move (see the per-element notes). No invented names. Base powers are
// in the 6–18 range, distinct within an element so moves feel
// different; the slot-1-style presets sit around 9, today's Lv 1 fast
// move damage (8 + floor(1 * 1.5)).

import type { Element } from '../data/venues';

export type { Element };

// One of the navitar's 5 attack slots. `power` is the BASE power at Lv 1.
export interface NavitarAttack {
  name: string;
  power: number;
  preset: boolean;
}

// Custom base power is clamped to this range at Lv 1. Preset powers
// also live inside it (6–18). sanitizeAttacks clamps any stored power
// to the wider 1..25 validation range; the UI enforces this range when
// the player types a custom power.
export const CUSTOM_POWER_MIN = 5;
export const CUSTOM_POWER_MAX = 25;

// Per-level growth: damage = base * 1.3^(level - 1). NOT 2^(level - 1)
// — doubling per level would outrun HP (50 + stamina * 5) within a
// few levels; 1.3x keeps a Lv 6 move at ≈ 3.7x its Lv 1 base.
export const ATTACK_GROWTH_RATE = 1.3;

export function attackPowerAtLevel(base: number, level: number): number {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  const safeBase = Number.isFinite(base) ? base : 0;
  return Math.max(1, Math.round(safeBase * Math.pow(ATTACK_GROWTH_RATE, safeLevel - 1)));
}

// The 5 preset moves per element. Order matters: defaultAttacksFor
// fills a fresh navitar's slots from these in order (after the
// navitar's own skills), so the first preset is the fallback slot-1
// move for a navitar with no skills, and the list reads strongest-last
// as a rough power ladder within the element.
export const ATTACK_PRESETS: Record<Element, { name: string; power: number }[]> = {
  // Venue Frostpup (Frost Nip, Snow Step) + Griffin (Glacier Rush, Wing
  // Gust — Wing Gust stays Griffin's, not a preset) + Home roster
  // Frostbite (Ice Blast, Frost Shield). All 5 native to ice.
  // 'Ice Blast' is power 9 on purpose: it is the smoke harness seed's
  // skill (realm-smoke2 seeds a Lv 1 ice navitar with skill 'Ice Blast'
  // and fastMove damage 9, and asserts "Damage: 9" on Profile and
  // "used Ice Blast — 9 damage" in the battle log), so the migration
  // must re-derive exactly 9 for it — attacks[0] keeps the seed's
  // damage. Frost Nip sits at 8 so all five powers stay distinct.
  ice: [
    { name: 'Ice Blast', power: 9 },
    { name: 'Frost Nip', power: 8 },
    { name: 'Snow Step', power: 7 },
    { name: 'Glacier Rush', power: 15 },
    { name: 'Frost Shield', power: 6 },
  ],
  // Venue Ashwing (Ember Flick, Tail Flame) + Home roster Emberwing
  // (Ember Strike, Flame Wing) + showcase Blaze Phoenix (Flame Burst,
  // Phoenix Shield). All 5 native to fire.
  fire: [
    { name: 'Ember Flick', power: 9 },
    { name: 'Tail Flame', power: 12 },
    { name: 'Flame Burst', power: 11 },
    { name: 'Ember Strike', power: 15 },
    { name: 'Phoenix Shield', power: 7 },
  ],
  // Venue Stonehorn (Thorn Guard, Root Slam) + Leafpaw (Vine Whip, Leaf
  // Shield) + Home roster Leafblade (Leaf Slash). All 5 native to nature.
  nature: [
    { name: 'Vine Whip', power: 9 },
    { name: 'Thorn Guard', power: 11 },
    { name: 'Root Slam', power: 14 },
    { name: 'Leaf Slash', power: 16 },
    { name: 'Leaf Shield', power: 6 },
  ],
  // Home roster Shadowmaw (Shadow Bite, Dark Veil) + showcase Shadow
  // Reaper (Dark Slash, Shadow Step) + wild Duskmoth's Wing Gust
  // (wild.ts already reuses a cross-element move for shadow). All 5
  // repo names, 4 native to shadow.
  shadow: [
    { name: 'Shadow Bite', power: 9 },
    { name: 'Dark Slash', power: 12 },
    { name: 'Shadow Step', power: 15 },
    { name: 'Wing Gust', power: 8 },
    { name: 'Dark Veil', power: 6 },
  ],
  // Venue Coralight (Prism Gleam, Reef Glow) + Starborn (Star Flare,
  // Moon Guard) + Home roster Luminara (Light Beam) + showcase Lumina
  // Star (Radiant Burst). 5 of the 6 native light names.
  light: [
    { name: 'Prism Gleam', power: 9 },
    { name: 'Star Flare', power: 12 },
    { name: 'Radiant Burst', power: 15 },
    { name: 'Moon Guard', power: 11 },
    { name: 'Light Beam', power: 7 },
  ],
  // Demo Quantix (Quantum Leap, Phase Shift) + wild Quibble (Star
  // Flare, Moon Guard — wild.ts already lends light names to quantum)
  // + showcase Tech Nova's Plasma Blast (the energy-beam skill, the
  // closest repo name to a quantum attack). 4 native to quantum.
  quantum: [
    { name: 'Quantum Leap', power: 9 },
    { name: 'Phase Shift', power: 12 },
    { name: 'Star Flare', power: 15 },
    { name: 'Plasma Blast', power: 11 },
    { name: 'Moon Guard', power: 7 },
  ],
  // Demo Voltwing (Thunder Dive, Static Shock) + venue Voltkit (Static
  // Pounce, Spark Dash) + the Kairos ability 'Thunder Strike'
  // (src/data/navitars.ts) as the fifth — an electric repo name where
  // the element only had 4 native skills.
  electric: [
    { name: 'Static Pounce', power: 9 },
    { name: 'Spark Dash', power: 7 },
    { name: 'Thunder Dive', power: 12 },
    { name: 'Thunder Strike', power: 14 },
    { name: 'Static Shock', power: 15 },
  ],
  // Demo Spiritmaw (Soul Roar, Spirit Guard) is the only native
  // spiritual pair in the repo, so the rest are the repo's
  // healing/blessing skills — showcase Aqua Serpent's Healing Waters,
  // Lumina Star's Healing Light, Verdant Sprout's Nature's Blessing —
  // the closest thematic fit for a spirit element.
  spiritual: [
    { name: 'Soul Roar', power: 9 },
    { name: 'Spirit Guard', power: 12 },
    { name: 'Healing Light', power: 11 },
    { name: 'Healing Waters', power: 7 },
    { name: "Nature's Blessing", power: 14 },
  ],
  // Venue Tidecaller (Salt Spray, Calm Current) + Wavefang (Tidal
  // Bite, Salt Surge) + demo Tidefang (Tidal Wave, Aqua Fang). All 5
  // native to water.
  water: [
    { name: 'Salt Spray', power: 9 },
    { name: 'Tidal Bite', power: 11 },
    { name: 'Aqua Fang', power: 12 },
    { name: 'Tidal Wave', power: 15 },
    { name: 'Calm Current', power: 6 },
  ],
};

const ATTACK_NAME_MAX = 40;

// Exactly 5 slots, each a non-empty trimmed name (max 40 chars) and a
// finite power between 1 and 25, with NO duplicate names (case-insensitive):
// a list carrying the same move twice rendered that move twice in the duel
// (fast-move card + an extra-slot button — "Glacier Rush" showed up twice
// in the move grid, live audit 2026-11-12). Used by the context before it
// trusts anything read from storage or handed in by the UI.
export function isValidAttacks(value: unknown): value is NavitarAttack[] {
  if (!Array.isArray(value) || value.length !== 5) return false;
  const names = value.map(a =>
    typeof (a as NavitarAttack)?.name === 'string'
      ? (a as NavitarAttack).name.trim().toLowerCase()
      : ''
  );
  if (new Set(names).size !== names.length) return false;
  return value.every((attack): attack is NavitarAttack => {
    if (typeof attack !== 'object' || attack === null) return false;
    const { name, power, preset } = attack as Partial<NavitarAttack>;
    return (
      typeof name === 'string' &&
      name.trim().length > 0 &&
      name.trim().length <= ATTACK_NAME_MAX &&
      typeof power === 'number' &&
      Number.isFinite(power) &&
      power >= 1 &&
      power <= 25 &&
      typeof preset === 'boolean'
    );
  });
}

// A cleaned copy of a valid attacks value (names trimmed, powers
// clamped to 1..25), or null when it is not a valid 5-slot list. The
// context treats null as "ignore this input, never wipe" — callers
// fall back to migrateAttacks/defaultAttacksFor instead.
export function sanitizeAttacks(value: unknown): NavitarAttack[] | null {
  if (!isValidAttacks(value)) return null;
  return value.map(attack => ({
    name: attack.name.trim(),
    power: Math.min(25, Math.max(1, attack.power)),
    preset: attack.preset,
  }));
}

function clampCustomPower(power: number): number {
  if (!Number.isFinite(power)) return 9;
  return Math.min(CUSTOM_POWER_MAX, Math.max(CUSTOM_POWER_MIN, Math.round(power)));
}

// The navitar's 5 attacks. ALWAYS exactly 5 slots:
// (1) the navitar's own skills, up to 2 slots — a skill that matches
// one of the element's presets (case-insensitive) takes that preset's
// power and preset=true, otherwise power 9 and preset=false (9 is
// today's Lv 1 fast-move damage, so a typed skill keeps its old feel);
// (2) the element's presets not already used, in order; (3) if still
// short — an element with too few distinct preset names — cycle that
// element's presets in order (duplicate name allowed, different
// power). Every element currently has 5 distinct presets, so step (3)
// never fires today; it exists so the guarantee holds if a preset
// list is ever shortened.
export function defaultAttacksFor(element: Element, skills: string[]): NavitarAttack[] {
  const presets = ATTACK_PRESETS[element] ?? ATTACK_PRESETS.ice;
  const attacks: NavitarAttack[] = [];
  const usedNames = new Set<string>();

  const ownSkills = (Array.isArray(skills) ? skills : [])
    .map(s => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .slice(0, 2);
  for (const skill of ownSkills) {
    // A skill listed twice (or matching an earlier skill's name) is
    // taken once — the same move never occupies two slots.
    if (usedNames.has(skill.toLowerCase())) continue;
    const preset = presets.find(p => p.name.toLowerCase() === skill.toLowerCase());
    attacks.push(
      preset
        ? { name: preset.name, power: preset.power, preset: true }
        : { name: skill, power: 9, preset: false }
    );
    usedNames.add(skill.toLowerCase());
  }

  for (const preset of presets) {
    if (attacks.length >= 5) break;
    if (usedNames.has(preset.name.toLowerCase())) continue;
    attacks.push({ name: preset.name, power: preset.power, preset: true });
    usedNames.add(preset.name.toLowerCase());
  }

  // Step (3): cycle the element's presets in order until all 5 slots
  // are filled. A duplicate name is allowed here only, at the same
  // power as its first copy — it is a filler slot, not a distinct move.
  let i = 0;
  while (attacks.length < 5 && presets.length > 0) {
    const preset = presets[i % presets.length];
    attacks.push({ name: preset.name, power: preset.power, preset: true });
    i += 1;
  }

  return attacks.slice(0, 5);
}

// The load-time migration: keep a stored attacks list when it is
// valid, otherwise build the defaults from the navitar's element and
// skills. Never returns fewer than 5 slots.
export function migrateAttacks(
  element: Element,
  skills: string[],
  existing: unknown
): NavitarAttack[] {
  return sanitizeAttacks(existing) ?? defaultAttacksFor(element, skills);
}

// Clamp a player-typed custom base power into the Lv 1 range, for the
// UI worker's editor (exported so the picker and the context share the
// one rule instead of each inventing a clamp).
export function clampAttackPower(power: number): number {
  return clampCustomPower(power);
}
