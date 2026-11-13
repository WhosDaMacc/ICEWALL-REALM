import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useBusiness } from './BusinessContext';
import { useReward } from './RewardContext';
import {
  TRAIN_DAILY_CAP,
  TRAIN_XP,
  levelForXp,
  loadStreak,
  loadTraining,
  recordTraining,
  saveStreak,
  streakMultiplier,
  winXp,
} from '../utils/levels';
import {
  attackPowerAtLevel,
  defaultAttacksFor,
  sanitizeAttacks,
  type NavitarAttack,
} from '../utils/attacks';
import { NAVITAR_ART } from '../utils/navitarArt';

// The player's navitars survive navigation AND reloads. The context
// alone is in-memory, so a reload (or a direct URL load, which is how the
// live site is browsed) wiped the navitar the player just created —
// Profile showed 0 and the map said "No companion yet". Persist the
// player's navitar COLLECTION to localStorage; demo opponents and
// battles stay in-memory.
//
// Storage model (v1): `icewall-user-navitars` holds the whole owned
// collection (a JSON array), `icewall-active-navitar-id` holds the id of
// the one ACTIVE navitar — exactly one is active at a time, the rest
// are kept, never lost. There is NO collection cap in v1 (deliberate:
// capping would force a release/delete flow that does not exist yet).
// The collection is localStorage-only for now; syncing it to Supabase
// is Phase 2 work — the profiles.navitar snapshot stays the ACTIVE
// navitar only (friends duel the active one).
const USER_NAVITARS_KEY = 'icewall-user-navitars';
const ACTIVE_NAVITAR_ID_KEY = 'icewall-active-navitar-id';
// Legacy single-navitar key (pre-collection). On load, if it exists and
// the collection key does not, its navitar is moved into a one-item
// collection, made active, and this key is deleted. If the collection
// key already exists, the legacy key is never re-read.
const LEGACY_USER_NAVITAR_KEY = 'icewall-user-navitar';

// A stable unique id for a navitar. crypto.randomUUID when available,
// Date.now + randomness otherwise (older browsers / non-secure contexts).
const newNavitarId = (): string => {
  try {
    const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
      return cryptoObj.randomUUID();
    }
  } catch {
    // Fall through to the Date.now + random fallback below.
  }
  return `navitar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

interface Navitar {
  id: string;
  name: string;
  owner: string;
  type: 'user' | 'business';
  level: number;
  // Total XP banked from wins and training. Drives the level (see
  // src/utils/levels.ts) and persists with the rest of the navitar.
  // Navitars saved before levelling have no xp — the lazy-init below
  // migrates those to 0.
  xp: number;
  stats: {
    strength: number;
    defense: number;
    speed: number;
    stamina: number;
  };
  skills: string[];
  // The navitar's 5 custom attacks (see src/utils/attacks.ts): base
  // powers at Lv 1, scaled to the navitar's level for fastMove.damage.
  // Optional — demo/venue/wild/remote opponents keep working without
  // attacks (their fast move stays first-skill + the old damage
  // formula). The user navitar always has 5 after migration/creation.
  attacks?: NavitarAttack[];
  // Element drives the type-effectiveness chart in NavitarBattle.
  // Creation UI should let the player pick one; 'ice' is the default until then.
  // The landing funnel passes the picked element as the 4th argument;
  // the Battle-page create dialog still calls with 3 and gets 'ice'.
  element:
    'ice' | 'fire' | 'nature' | 'shadow' | 'light' | 'quantum' | 'electric' | 'spiritual' | 'water';
  // The navitar's own art, picked at creation (the look-picker) or
  // carried by a venue opponent. Art resolution prefers this, then the
  // name map, then the element emoji — see resolveNavitarArt. A
  // navitar saved before the look-picker has none and keeps the old
  // behaviour (name map -> emoji).
  imageUrl?: string;
  // The navitar's 3D model GLB (public/models/), carried by a venue
  // opponent whose fighter has one (Griffin, Ashwing). The battle
  // stage renders the live model instead of the 2D art when present;
  // absent for everyone else. Never persisted for the user navitar.
  modelUrl?: string;
  // Closer framing for the 3D model on the stage (1 = default; the
  // phoenix's wide wingspan needs 1.5 to read at a good size).
  modelZoom?: number;
  // Extra Y rotation (radians) applied to the model on the stage when
  // its front is not +z in model space (the stage turns every fighter
  // to face its opponent assuming a +z front — Griffin, Ashwing). The
  // golden dragon's head mass sits at -x in model space (geometry
  // check 2026-11-12), so Luminara carries +90° to bring her front
  // to +z. Absent for everyone else.
  modelRotationY?: number;
  // Ground-plane offset (model units): how far the model's true
  // ground — its feet — sits ABOVE its bounding-box min.y. The stage
  // grounds a model by box.min.y, but the golden dragon's lowest
  // vertex is its tail sweep (min.y = 0), while its leg/foot masses
  // bottom at y = 0.0134 (geometry check 2026-11-12), so grounded on
  // the box she floated. The stage adds this to box.min.y before
  // grounding her. Absent (= 0) for everyone else.
  modelYOffset?: number;
  // Battle health, derived from stamina when a navitar is created.
  // NavitarBattle renders these as the health bar and energy bar.
  hp: number;
  maxHp: number;
  fastMove: {
    name: string;
    damage: number;
    energyGain: number;
    cooldown: number;
  };
}

interface Battle {
  id: string;
  challenger: Navitar;
  defender: Navitar;
  status: 'pending' | 'active' | 'completed';
  winner?: string;
  timestamp: Date;
  rewards?: {
    points: number;
    items?: string[];
  };
}

// What went up when a navitar levelled: the level step and the damage
// / max HP before and after, so the result card can show the gain.
export interface LevelUpInfo {
  from: number;
  to: number;
  oldDamage: number;
  newDamage: number;
  oldMaxHp: number;
  newMaxHp: number;
}

// What a user win earned: the XP (after the streak multiplier), the
// streak it was won on, the navitar's new total XP, and the level-up
// if this win crossed a threshold. Null when the user did not win.
export interface WinResult {
  xpGained: number;
  streak: number;
  multiplier: number;
  xp: number;
  leveledUp: LevelUpInfo | null;
}

// What one Train tap did. granted is false when the navitar is at the
// daily cap (or there is no navitar); capped says the same thing for
// the button state. xp is the navitar's new total XP.
export interface TrainResult {
  granted: boolean;
  remainingToday: number;
  leveledUp: LevelUpInfo | null;
  xp: number;
  capped: boolean;
}

interface NavitarFightClubContextType {
  // The whole owned collection. `userNavitar` below is the ACTIVE one,
  // derived from this list — every existing consumer keeps working.
  navitars: Navitar[];
  // Id of the active navitar (null when the collection is empty).
  activeNavitarId: string | null;
  // Switch the active navitar instantly, at no cost. A no-op for an
  // unknown id — the active navitar never changes to something unowned.
  setActiveNavitar: (id: string) => void;
  userNavitar: Navitar | null;
  businessNavitars: Navitar[];
  activeBattles: Battle[];
  // Battle points: the running total of points won in duels, persisted in
  // localStorage so a reload doesn't zero it. Shown on Profile and in the
  // map companion panel. Losing a battle never subtracts.
  points: number;
  // Consecutive wins, persisted in localStorage (icewall-win-streak).
  // Each win raises the XP multiplier (see src/utils/levels.ts); a
  // defeat resets it to 0. Training never touches it.
  winStreak: number;
  // All-time duel record (wins / losses), persisted in localStorage
  // (icewall-wl-record) and shown on Profile. Every settled duel
  // counts exactly once, in completeBattle — the one banking funnel.
  winLoss: { wins: number; losses: number };
  // Training sessions used today, out of the daily cap. Training is the
  // explicit +10 XP action on Profile; the count resets each new day.
  trainingToday: { count: number; cap: number };
  // One training session: +10 XP (if under the daily cap), sharing the
  // same level-up math as a win. Never touches the win streak.
  trainNavitar: () => TrainResult;
  createUserNavitar: (
    name: string,
    skills: string[],
    imageUrl?: string,
    element?: Navitar['element'],
    attacks?: NavitarAttack[]
  ) => void;
  // Re-look an existing navitar — the look-picker used to live only in
  // the create dialog, so a player who already had a navitar (created
  // before the picker existed, with no imageUrl) could never reach it
  // and stayed an emoji on the stage and Profile. Saves onto the
  // navitar, so the stage, Profile and companion pick it up; persisted
  // by the same save effect as everything else on the navitar.
  updateUserNavitarLook: (imageUrl: string) => void;
  // Replace the user navitar's 5 attacks (the attack-picker save).
  // Sanitizes the input and ignores it when invalid — an invalid list
  // never wipes the navitar's current attacks. A valid list also
  // re-derives fastMove from attacks[0] at the navitar's current level.
  updateUserNavitarAttacks: (attacks: NavitarAttack[]) => void;
  launchBusinessNavitar: (
    businessId: string,
    navitar: Omit<Navitar, 'id' | 'owner' | 'type' | 'element' | 'hp' | 'maxHp' | 'fastMove' | 'xp'>
  ) => void;
  // Adds a demo person's navitar as a challengeable opponent (built from
  // their level, same derivation as the demo opponents) and returns its id.
  // Called by the venue meet card when a challenge is accepted. If the
  // navitar is already in the list, its existing id is returned.
  addVenueOpponent: (input: {
    name: string;
    element: Navitar['element'];
    level: number;
    skills: string[];
    imageUrl?: string;
    modelUrl?: string;
    modelZoom?: number;
  }) => string;
  // Adds a wild navitar as a challengeable opponent (same derivation as
  // addVenueOpponent, id `wild-<slug>` instead of `venue-<slug>`).
  // Called by the Realm Map when a wild spawn is challenged. A wild
  // duel has no venue — the caller passes '' as the venue id, so no
  // venue win is recorded.
  addWildOpponent: (input: {
    name: string;
    element: Navitar['element'];
    level: number;
    skills: string[];
    imageUrl?: string;
    modelUrl?: string;
    modelZoom?: number;
  }) => string;
  // Adds a REAL friend's navitar as a challengeable opponent (same
  // derivation as addVenueOpponent). The id is explicit —
  // `friend-<userId>` — so it can never collide the way the name-slug
  // venue/wild ids could (two friends' navitars may share a name).
  // Called by the friend-duel helper (src/utils/onlineFriends.ts).
  // owner 'remote-friend' marks it as a remote player's navitar.
  addRemoteOpponent: (
    input: {
      name: string;
      element: Navitar['element'];
      level: number;
      skills: string[];
      imageUrl?: string;
      modelUrl?: string;
      modelZoom?: number;
    },
    id: string
  ) => string;
  challengeBusinessNavitar: (businessNavitarId: string) => string | null;
  // Settles a battle. Returns the win's XP result on a user win, or
  // null on a defeat (streak reset, no XP) or a non-user win.
  completeBattle: (battleId: string, winnerId: string) => WinResult | null;
  getAvailableBattles: () => Battle[];
}

const NavitarFightClubContext = createContext<NavitarFightClubContextType>({
  navitars: [],
  activeNavitarId: null,
  setActiveNavitar: () => {},
  userNavitar: null,
  businessNavitars: [],
  activeBattles: [],
  points: 0,
  winStreak: 0,
  winLoss: { wins: 0, losses: 0 },
  trainingToday: { count: 0, cap: TRAIN_DAILY_CAP },
  trainNavitar: () => ({
    granted: false,
    remainingToday: TRAIN_DAILY_CAP,
    leveledUp: null,
    xp: 0,
    capped: false,
  }),
  createUserNavitar: () => {},
  updateUserNavitarLook: () => {},
  updateUserNavitarAttacks: () => {},
  launchBusinessNavitar: () => {},
  addVenueOpponent: () => '',
  addWildOpponent: () => '',
  addRemoteOpponent: () => '',
  challengeBusinessNavitar: () => null,
  completeBattle: () => null,
  getAvailableBattles: () => [],
});

export const useNavitarFightClub = () => useContext(NavitarFightClubContext);

// Battle health scales with stamina; every navitar starts at full HP
// with a default fast move. Callers don't supply these — they're derived.
// Hoisted to module level (it is pure) so the demo opponents below can use it.
// moveName: the navitar's signature fast move. The player-creation path
// passes the first skill the player typed (see createUserNavitar); the
// system default 'Quick Attack' is only the fallback when no skill exists.
// moveDamage: when provided, the fast move deals exactly this damage
// instead of the old 8 + floor(level * 1.5) derivation — the custom-
// attacks path passes the scaled power of attacks[0] here. HP math is
// unchanged, and the signature stays backward compatible: every
// existing caller (opponents, demo navitars) omits it.
const battleFields = (
  level: number,
  stamina: number,
  moveName = 'Quick Attack',
  moveDamage?: number
) => {
  const maxHp = 50 + stamina * 5;
  return {
    hp: maxHp,
    maxHp,
    fastMove: {
      name: moveName,
      damage: moveDamage ?? 8 + Math.floor(level * 1.5),
      energyGain: 10,
      cooldown: 2,
    },
  };
};

// Demo opponents — showcase navitars with art, seeded as challengeable
// business navitars so the Battle page has someone to fight. Luminara
// carries her golden dragon GLB, Frostbite her ice dragon GLB and
// Emberwing her fire dragon GLB, so they fight in 3D. They belong to
// the demo arena, not a real business; a real business navitar is launched
// through launchBusinessNavitar instead. Stamina is tuned so maxHp equals
// the Collection HP for each one (maxHp = 50 + stamina * 5).
const DEMO_OPPONENTS: Navitar[] = [
  {
    id: 'demo-quantix',
    name: 'Quantix',
    // Showcase art by name — without it the battle stage had no
    // image to billboard and fell back to a plain element orb.
    imageUrl: NAVITAR_ART.quantix,
    owner: 'demo-arena',
    type: 'business',
    level: 22,
    xp: 0,
    stats: { strength: 88, defense: 70, speed: 90, stamina: 6 },
    skills: ['Quantum Leap', 'Phase Shift'],
    element: 'quantum',
    ...battleFields(22, 6),
  },
  {
    id: 'demo-voltwing',
    name: 'Voltwing',
    // Showcase art by name — without it the battle stage had no
    // image to billboard and fell back to a plain element orb.
    imageUrl: NAVITAR_ART.voltwing,
    owner: 'demo-arena',
    type: 'business',
    level: 19,
    xp: 0,
    stats: { strength: 85, defense: 60, speed: 95, stamina: 4.4 },
    skills: ['Thunder Dive', 'Static Shock'],
    element: 'electric',
    ...battleFields(19, 4.4),
  },
  {
    id: 'demo-spiritmaw',
    name: 'Spiritmaw',
    // Showcase art by name — without it the battle stage had no
    // image to billboard and fell back to a plain element orb.
    imageUrl: NAVITAR_ART.spiritmaw,
    owner: 'demo-arena',
    type: 'business',
    level: 24,
    xp: 0,
    stats: { strength: 80, defense: 88, speed: 65, stamina: 9 },
    skills: ['Soul Roar', 'Spirit Guard'],
    element: 'spiritual',
    ...battleFields(24, 9),
  },
  {
    id: 'demo-tidefang',
    name: 'Tidefang',
    // Showcase art by name — without it the battle stage had no
    // image to billboard and fell back to a plain element orb.
    imageUrl: NAVITAR_ART.tidefang,
    owner: 'demo-arena',
    type: 'business',
    level: 17,
    xp: 0,
    stats: { strength: 78, defense: 75, speed: 80, stamina: 6.4 },
    skills: ['Tidal Wave', 'Aqua Fang'],
    element: 'water',
    ...battleFields(17, 6.4),
  },
  {
    id: 'demo-luminara',
    name: 'Luminara',
    // Showcase art by name — without it the battle stage had no
    // image to billboard and fell back to a plain element orb.
    imageUrl: NAVITAR_ART.luminara,
    // The golden dragon GLB (Tripo, Eddie's export 2026-11-12) — the
    // stage renders the live model instead of the 2D art. The
    // dragon's front is -x in model space, not the +z the stage
    // assumes (Griffin/Ashwing), so she carries a +90° Y turn.
    modelUrl: `${process.env.PUBLIC_URL}/models/gold-dragon.glb`,
    modelRotationY: Math.PI / 2,
    // Her feet bottom at y = 0.0134 in model space; her tail sweep
    // defines box.min.y = 0 (see the field's note above).
    modelYOffset: 0.0134,
    owner: 'demo-arena',
    type: 'business',
    level: 18,
    xp: 0,
    stats: { strength: 75, defense: 85, speed: 80, stamina: 6 },
    skills: ['Light Beam', 'Radiant Shield'],
    element: 'light',
    ...battleFields(18, 6),
  },
  {
    id: 'demo-frostbite',
    name: 'Frostbite',
    // Showcase art by name — without it the battle stage had no
    // image to billboard and fell back to a plain element orb.
    imageUrl: NAVITAR_ART.frostbite,
    // The ice dragon GLB (Tripo image-to-3D from Eddie's frostbite.jpg
    // art, exported 2026-11-12) — the stage renders the live model
    // instead of the 2D art. Her front is +z in model space (the
    // stage's assumption — Griffin/Ashwing), so no facing fix.
    // File structure (verified from the GLB, 2026-11-12): a single
    // node and mesh with NO node transform, skin or animation — the
    // same shape as the other three GLBs — so her world box equals
    // her raw box and the loader's world-box grounding (see
    // ElementalWorld) shifts her exactly as the numbers below say.
    // Welded-component analysis: main body = 92.9% of verts; the only
    // detached piece is her tail blade (y 0.063–0.282, z −0.50..−0.20,
    // behind her). She is a REARING pose: her planted hindquarter
    // mass bottoms at box.min.y = 0 (foot cluster of ~1,270 verts at
    // (−0.12, +0.12), more foot mass at y 0.011–0.032), but her front
    // toes only reach y = 0.098 and her chest rides at ~0.20, so
    // plain box grounding left her front dangling and she read as
    // flying (live checks 2026-11-12). Ground on the front toes
    // instead (offset 0.098): the hind mass plants through the floor
    // plane and the tail blade's tip dips just under it, so toes,
    // hind leg and tail all meet the ice with nothing left hovering.
    modelUrl: `${process.env.PUBLIC_URL}/models/frostbite-dragon.glb`,
    modelYOffset: 0.098,
    owner: 'demo-arena',
    type: 'business',
    level: 15,
    xp: 0,
    stats: { strength: 70, defense: 65, speed: 75, stamina: 7 },
    skills: ['Ice Blast', 'Frost Shield'],
    element: 'ice',
    ...battleFields(15, 7),
  },
  {
    id: 'demo-emberwing',
    name: 'Emberwing',
    // Showcase art by name — without it the battle stage had no
    // image to billboard and fell back to a plain element orb.
    imageUrl: NAVITAR_ART.emberwing,
    // The fire dragon GLB (Tripo image-to-3D from Eddie's emberwing.jpg
    // art, exported 2026-11-12) — the stage renders the live model
    // instead of the 2D art. File structure (verified from the GLB,
    // 2026-11-12): a single node and mesh with NO node transform,
    // skin or animation — the same shape as the other four GLBs — so
    // her world box equals her raw box and the loader's world-box
    // grounding (see ElementalWorld) applies exactly as the numbers
    // below say. Welded-component analysis: ONE component (no
    // detached pieces, unlike Frostbite's tail blade). She is an
    // upright, coiled pose: head raised at the +z tip (highest verts
    // at z +0.45..+0.50, top-slice centroid z +0.246), wings and tail
    // sweeping back to −z — her front is +z, the stage's assumption
    // (Griffin/Ashwing/Frostbite), so NO modelRotationY. Her support
    // is a broad front patch (z +0.15..+0.25) bottoming at
    // box.min.y = 0 — the base IS her stance, so NO modelYOffset
    // either; the only near-contact above base is a rear touch at
    // y = 0.0085 (0.015 world units — imperceptible, part of the
    // coil), and her tail tip hovers at y 0.045–0.075 behind her, as
    // a tail should.
    modelUrl: `${process.env.PUBLIC_URL}/models/emberwing-dragon.glb`,
    owner: 'demo-arena',
    type: 'business',
    level: 20,
    xp: 0,
    stats: { strength: 90, defense: 60, speed: 85, stamina: 5 },
    skills: ['Ember Strike', 'Flame Wing'],
    element: 'fire',
    ...battleFields(20, 5),
  },
  {
    // Joe the Impossible Challenger (Eddie, 2026-11-12: "There should
    // be no quiz, scrap the quiz. I just wanted to fight."). Joe stays
    // the announcer/judge persona in the duel log, and challenging him
    // is now a real FIGHT through the normal battle flow: he is a
    // demo opponent like any other, selectable in Step 2. Boss-tier
    // by design — Lv 30 (above every other demo opponent), 100 HP,
    // fast move Verdict Slam at the standard derivation (8 + 45 = 53).
    // Beating him awards the "Joe's Champion" title (NavitarBattle).
    id: 'demo-joe',
    name: 'Joe the Impossible Challenger',
    owner: 'demo-arena',
    type: 'business',
    level: 30,
    xp: 0,
    stats: { strength: 95, defense: 85, speed: 90, stamina: 10 },
    skills: ['Verdict Slam', 'Final Call'],
    element: 'quantum',
    ...battleFields(30, 10, 'Verdict Slam'),
  },
];

// Joe's demo-opponent id — the Battle page's CHALLENGE JOE button and
// the Realm Map's Joe card pre-select this opponent through the normal
// challenge handoff, and a win against it awards Joe's title.
export const JOE_OPPONENT_ID = 'demo-joe';

// Load-time per-navitar migration, run on EVERY navitar in the
// collection on load (and on the legacy single navitar when migrating
// it in). XP MIGRATION: navitars saved before levelling (and the jsdom
// smoke harness seed) have no xp field — default to 0, keeping the
// stored level as-is. A corrupt/negative xp also resets to 0.
// ATTACKS MIGRATION: navitars saved before custom attacks have no
// `attacks` field. On load, the attacks list is migrated (a valid
// stored list is kept, otherwise defaults are built from the
// navitar's element and skills) and the fast move is ALWAYS
// re-derived from attacks[0] at the stored level (name + scaled
// power). Stored hp/maxHp are preserved as-is — HP is never
// recomputed here. A navitar missing an id gets one assigned on load.
// Returns null for a value that is not a storable navitar at all
// (not an object, or with no name) so one corrupt entry never wipes
// the rest of the collection.
const migrateNavitar = (value: unknown): Navitar | null => {
  if (typeof value !== 'object' || value === null) return null;
  const parsed = value as Partial<Navitar> & { xp?: unknown };
  if (typeof parsed.name !== 'string' || !parsed.name.trim()) return null;
  const full = parsed as Navitar;
  const xp =
    Number.isFinite(full.xp) && (full.xp as number) >= 0 ? Math.floor(full.xp as number) : 0;
  const id = typeof full.id === 'string' && full.id ? full.id : newNavitarId();
  const firstSkill = (full.skills ?? []).map(s => s.trim()).find(Boolean);
  const storedAttacks = sanitizeAttacks(full.attacks);
  if (storedAttacks || firstSkill) {
    // The attacks path takes precedence: attacks[0] already
    // carries the first skill (as a preset match or a power-9
    // custom slot), so the old Quick Attack name migration below
    // is not needed when there is anything to migrate from.
    const attacks = storedAttacks ?? defaultAttacksFor(full.element, full.skills ?? []);
    return {
      ...full,
      id,
      xp,
      attacks,
      fastMove: {
        name: attacks[0].name,
        damage: attackPowerAtLevel(attacks[0].power, full.level),
        energyGain: 10,
        cooldown: 2,
      },
    };
  }
  // Fallback — reachable only when the save has no skills AND no
  // valid stored attacks (defaultAttacksFor would still build 5
  // presets from the element alone, so this is defensive only):
  // the pre-attacks Quick Attack migration, unchanged.
  if (full.fastMove?.name === 'Quick Attack' && firstSkill) {
    return {
      ...full,
      id,
      xp,
      fastMove: {
        ...full.fastMove,
        name: firstSkill,
        damage: 8 + Math.floor(full.level * 1.5),
      },
    };
  }
  return { ...full, id, xp };
};

// Load the owned collection + active id from localStorage. Collection
// key wins when present; otherwise the legacy single key migrates in
// (one-item collection, made active, legacy key deleted). Corrupt JSON
// falls back to an empty collection rather than crashing the provider.
// When the stored active id is missing or names no owned navitar, the
// first navitar in the collection is active.
const loadCollection = (): { navitars: Navitar[]; activeId: string | null } => {
  try {
    const rawCollection = localStorage.getItem(USER_NAVITARS_KEY);
    if (rawCollection) {
      const parsed = JSON.parse(rawCollection) as unknown;
      if (Array.isArray(parsed)) {
        const navitars = parsed.map(migrateNavitar).filter((n): n is Navitar => n !== null);
        // De-duplicate by id, keeping the first copy — a hand-edited
        // store could otherwise show the same navitar twice.
        const seen = new Set<string>();
        const unique = navitars.filter(n => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
        const storedActive = localStorage.getItem(ACTIVE_NAVITAR_ID_KEY);
        const activeId =
          storedActive && unique.some(n => n.id === storedActive)
            ? storedActive
            : (unique[0]?.id ?? null);
        // The collection key already exists: the legacy key is never
        // re-migrated, and any stale copy is dropped so the two stores
        // cannot drift apart.
        try {
          localStorage.removeItem(LEGACY_USER_NAVITAR_KEY);
        } catch {
          // Private mode: the legacy key simply stays unread.
        }
        return { navitars: unique, activeId };
      }
      return { navitars: [], activeId: null };
    }
    const rawLegacy = localStorage.getItem(LEGACY_USER_NAVITAR_KEY);
    if (!rawLegacy) return { navitars: [], activeId: null };
    const migrated = migrateNavitar(JSON.parse(rawLegacy) as unknown);
    if (!migrated) return { navitars: [], activeId: null };
    try {
      localStorage.removeItem(LEGACY_USER_NAVITAR_KEY);
    } catch {
      // Private mode: the legacy key is re-read (and re-migrated)
      // next load, but nothing is lost.
    }
    return { navitars: [migrated], activeId: migrated.id };
  } catch {
    return { navitars: [], activeId: null };
  }
};

export const NavitarFightClubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lazy-init from localStorage so a reload restores the player's
  // navitars instead of dropping them back to "no navitar" (see
  // loadCollection above: collection key, else the legacy single-key
  // migration, else empty). The per-navitar migration runs on every
  // navitar in the collection on load. loadCollection runs ONCE —
  // the legacy migration deletes the old key as it reads it, so a
  // second call would see nothing and return a different active id.
  const [initialCollection] = useState(loadCollection);
  const [navitars, setNavitars] = useState<Navitar[]>(initialCollection.navitars);
  const [activeNavitarId, setActiveNavitarIdState] = useState<string | null>(
    initialCollection.activeId
  );

  // The ACTIVE navitar, derived from the collection — this is what
  // `userNavitar` has always meant, so every consumer that reads it
  // (battles, map companion, Stroll, AR, chat, Messages, Joe) keeps
  // working unchanged: they always see the active navitar only.
  // Falls back to the first owned navitar if the stored active id
  // names nothing in the collection.
  const userNavitar = navitars.find(n => n.id === activeNavitarId) ?? navitars[0] ?? null;

  // Switch the active navitar instantly, at no cost. Unknown ids are
  // a no-op — the active navitar never changes to something unowned.
  const setActiveNavitar = useCallback(
    (id: string) => {
      if (!navitars.some(n => n.id === id)) return;
      setActiveNavitarIdState(id);
    },
    [navitars]
  );

  // Update the ACTIVE navitar inside the collection (the one place
  // active-only writes go through, so XP, look and attacks can never
  // land on the wrong navitar or wipe the others).
  const updateActiveNavitar = useCallback(
    (update: (prev: Navitar) => Navitar) => {
      if (!userNavitar) return;
      const id = userNavitar.id;
      setNavitars(prev => prev.map(n => (n.id === id ? update(n) : n)));
    },
    [userNavitar]
  );

  // Running total of battle points won. Persisted like the navitar so a
  // reload doesn't zero it; losing never subtracts.
  const POINTS_KEY = 'icewall-points';
  const [points, setPoints] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(POINTS_KEY);
      const parsed = raw ? Number(raw) : 0;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(POINTS_KEY, String(points));
    } catch {
      // Private mode / quota: points still work for this session.
    }
  }, [points]);

  // Consecutive wins, persisted like points. A defeat resets it to 0
  // (see completeBattle); training never touches it.
  const [winStreak, setWinStreak] = useState<number>(() => loadStreak());

  useEffect(() => {
    saveStreak(winStreak);
  }, [winStreak]);

  // All-time duel record, persisted like points and the streak.
  const WL_KEY = 'icewall-wl-record';
  const [winLoss, setWinLoss] = useState<{ wins: number; losses: number }>(() => {
    try {
      const raw = localStorage.getItem(WL_KEY);
      const parsed = raw ? (JSON.parse(raw) as { wins?: unknown; losses?: unknown }) : null;
      const wins =
        parsed && Number.isFinite(parsed.wins) && (parsed.wins as number) >= 0
          ? Math.floor(parsed.wins as number)
          : 0;
      const losses =
        parsed && Number.isFinite(parsed.losses) && (parsed.losses as number) >= 0
          ? Math.floor(parsed.losses as number)
          : 0;
      return { wins, losses };
    } catch {
      return { wins: 0, losses: 0 };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(WL_KEY, JSON.stringify(winLoss));
    } catch {
      // Private mode / quota: the record still holds for this session.
    }
  }, [winLoss]);

  // Training sessions used today, out of the daily cap. Initialised
  // from storage (a new day reads as 0); trainNavitar re-reads storage
  // on every tap so the count is fresh even across a midnight rollover.
  const [trainingToday, setTrainingToday] = useState<{ count: number; cap: number }>(() => {
    const state = loadTraining();
    return { count: state.count, cap: TRAIN_DAILY_CAP };
  });

  // Save the whole collection + the active id on every change; clear
  // both keys if the collection is ever emptied. The legacy single
  // key is removed here too, so it can never come back.
  useEffect(() => {
    try {
      if (navitars.length > 0) {
        localStorage.setItem(USER_NAVITARS_KEY, JSON.stringify(navitars));
        if (userNavitar) {
          localStorage.setItem(ACTIVE_NAVITAR_ID_KEY, userNavitar.id);
        }
      } else {
        localStorage.removeItem(USER_NAVITARS_KEY);
        localStorage.removeItem(ACTIVE_NAVITAR_ID_KEY);
      }
      localStorage.removeItem(LEGACY_USER_NAVITAR_KEY);
    } catch {
      // Private mode / quota: the navitars still work for this session.
    }
  }, [navitars, userNavitar]);
  const [businessNavitars, setBusinessNavitars] = useState<Navitar[]>(DEMO_OPPONENTS);
  const [activeBattles, setActiveBattles] = useState<Battle[]>([]);
  const { businesses, updateBusinessNavitar } = useBusiness();
  const { addReward } = useReward();

  const calculateStats = useCallback((level: number) => {
    const base = 10;
    return {
      strength: base + Math.floor(level * 1.5),
      defense: base + Math.floor(level * 1.2),
      speed: base + Math.floor(level * 1.3),
      stamina: base + Math.floor(level * 1.1),
    };
  }, []);

  const createUserNavitar = useCallback(
    (
      name: string,
      skills: string[],
      imageUrl?: string,
      element: Navitar['element'] = 'ice',
      attacks?: NavitarAttack[]
    ) => {
      const stats = calculateStats(1);
      // The navitar's 5 attacks: the caller-supplied list when valid,
      // otherwise defaults built from the element and the typed skills
      // (the first skill is attacks[0] — the signature fast move —
      // with its preset power, or power 9 when it matches no preset).
      // The `skills` array is kept intact — opponents, messages and
      // Joe all read it — attacks are a parallel list, not a replace.
      const resolvedAttacks = sanitizeAttacks(attacks) ?? defaultAttacksFor(element, skills);
      const newNavitar: Navitar = {
        id: newNavitarId(),
        name,
        owner: 'user',
        type: 'user',
        level: 1,
        xp: 0,
        stats,
        skills,
        attacks: resolvedAttacks,
        // The element the player picked (landing funnel) — 'ice' when
        // the caller passes none (the Battle-page create dialog).
        element,
        // The look picked in the create dialog — persisted with the
        // rest of the navitar, so the stage, Profile and companion use
        // it when present. No imageUrl means the old behaviour (name
        // map -> element emoji).
        imageUrl,
        ...battleFields(
          1,
          stats.stamina,
          resolvedAttacks[0].name,
          attackPowerAtLevel(resolvedAttacks[0].power, 1)
        ),
      };
      // ADDS to the collection and makes the new navitar active — it
      // NEVER deletes the navitars already owned. Creating a second
      // navitar used to replace the first; that is the bug this
      // collection fixes.
      setNavitars(prev => [...prev, newNavitar]);
      setActiveNavitarIdState(newNavitar.id);
    },
    [calculateStats]
  );

  // Change the ACTIVE navitar's look. The look-picker used to live
  // only in the create dialog; this re-skins the active one in place,
  // inside the collection — the others are untouched.
  const updateUserNavitarLook = useCallback(
    (imageUrl: string) => {
      updateActiveNavitar(prev => ({ ...prev, imageUrl }));
    },
    [updateActiveNavitar]
  );

  // Replace the ACTIVE navitar's 5 attacks (the attack-picker save).
  // An invalid list is ignored outright — it never wipes the current
  // attacks. A valid list also re-derives fastMove from attacks[0] at
  // the navitar's current level (name + scaled power); HP is untouched.
  const updateUserNavitarAttacks = useCallback(
    (attacks: NavitarAttack[]) => {
      const clean = sanitizeAttacks(attacks);
      if (!clean) return;
      updateActiveNavitar(prev => ({
        ...prev,
        attacks: clean,
        fastMove: {
          ...prev.fastMove,
          name: clean[0].name,
          damage: attackPowerAtLevel(clean[0].power, prev.level),
        },
      }));
    },
    [updateActiveNavitar]
  );

  const launchBusinessNavitar = useCallback(
    (
      businessId: string,
      navitar: Omit<
        Navitar,
        'id' | 'owner' | 'type' | 'element' | 'hp' | 'maxHp' | 'fastMove' | 'xp'
      >
    ) => {
      const business = businesses.find(b => b.id === businessId);
      if (!business) return;

      const newNavitar: Navitar = {
        ...navitar,
        id: Date.now().toString(),
        owner: businessId,
        type: 'business',
        element: 'ice',
        // Business navitars don't earn XP — they start at 0 like
        // every other navitar built outside the levelling flow.
        xp: 0,
        ...battleFields(navitar.level, navitar.stats.stamina),
      };

      setBusinessNavitars(prev => [...prev, newNavitar]);
      updateBusinessNavitar(businessId, {
        name: navitar.name,
        level: navitar.level,
        skills: navitar.skills,
        stats: navitar.stats,
      });
    },
    [businesses, updateBusinessNavitar]
  );

  // A demo person's navitar, built from their level. Stats scale with
  // level the same way a created navitar's do; the id is stable per name
  // so challenging the same person twice reuses their navitar instead of
  // seeding a duplicate opponent each time.
  const addVenueOpponent = useCallback(
    (input: {
      name: string;
      element: Navitar['element'];
      level: number;
      skills: string[];
      imageUrl?: string;
      modelUrl?: string;
      modelZoom?: number;
    }): string => {
      const id = `venue-${input.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}`;
      const existing = businessNavitars.find(n => n.id === id);
      if (existing) return existing.id;
      const stats = calculateStats(input.level);
      // The first skill IS the fast move — same as the player-creation
      // path (createUserNavitar) — so a venue navitar counters with its
      // signature skill, not the 'Quick Attack' fallback. Damage/HP
      // math is unchanged: battleFields derives both from level alone.
      const firstSkill = input.skills.map(s => s.trim()).find(Boolean);
      const opponent: Navitar = {
        id,
        name: input.name,
        owner: 'demo-venue',
        type: 'business',
        level: input.level,
        xp: 0,
        stats,
        skills: input.skills,
        element: input.element,
        // The person's art from venues.ts — the stage renders this
        // image instead of the element emoji.
        imageUrl: input.imageUrl,
        // The person's 3D model from venues.ts, when they have one —
        // the stage renders the live model instead of the 2D art.
        modelUrl: input.modelUrl,
        modelZoom: input.modelZoom,
        ...battleFields(input.level, stats.stamina, firstSkill ?? 'Quick Attack'),
      };
      setBusinessNavitars(prev => [...prev, opponent]);
      return id;
    },
    [businessNavitars, calculateStats]
  );

  const addWildOpponent = useCallback(
    (input: {
      name: string;
      element: Navitar['element'];
      level: number;
      skills: string[];
      imageUrl?: string;
      modelUrl?: string;
      modelZoom?: number;
    }): string => {
      const id = `wild-${input.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}`;
      const existing = businessNavitars.find(n => n.id === id);
      if (existing) return existing.id;
      const stats = calculateStats(input.level);
      // The first skill IS the fast move — same as the venue path — so
      // a wild navitar counters with its signature skill, not the
      // 'Quick Attack' fallback. Damage/HP math is unchanged:
      // battleFields derives both from level alone.
      const firstSkill = input.skills.map(s => s.trim()).find(Boolean);
      const opponent: Navitar = {
        id,
        name: input.name,
        owner: 'demo-wild',
        type: 'business',
        level: input.level,
        xp: 0,
        stats,
        skills: input.skills,
        element: input.element,
        // The wild navitar's art from src/data/wild.ts — the stage
        // renders this image instead of the element emoji.
        imageUrl: input.imageUrl,
        // A wild navitar has no 3D model — 2D art only, like most
        // venue fighters.
        modelUrl: input.modelUrl,
        modelZoom: input.modelZoom,
        ...battleFields(input.level, stats.stamina, firstSkill ?? 'Quick Attack'),
      };
      setBusinessNavitars(prev => [...prev, opponent]);
      return id;
    },
    [businessNavitars, calculateStats]
  );

  // A real friend's navitar, added by explicit id (`friend-<userId>`).
  // Same level derivation as the venue/wild paths — calculateStats +
  // battleFields with the first skill as the fast move — so a friend
  // duel plays exactly like a demo duel. If the navitar is already in
  // the list, its existing id is returned.
  const addRemoteOpponent = useCallback(
    (
      input: {
        name: string;
        element: Navitar['element'];
        level: number;
        skills: string[];
        imageUrl?: string;
        modelUrl?: string;
        modelZoom?: number;
      },
      id: string
    ): string => {
      const existing = businessNavitars.find(n => n.id === id);
      if (existing) return existing.id;
      const stats = calculateStats(input.level);
      // The first skill IS the fast move — same as the venue/wild
      // paths — so a remote navitar counters with its signature skill,
      // not the 'Quick Attack' fallback. Damage/HP math is unchanged:
      // battleFields derives both from level alone.
      const firstSkill = input.skills.map(s => s.trim()).find(Boolean);
      const opponent: Navitar = {
        id,
        name: input.name,
        owner: 'remote-friend',
        type: 'business',
        level: input.level,
        xp: 0,
        stats,
        skills: input.skills,
        element: input.element,
        // The friend's art from their profile snapshot — the stage
        // renders this image instead of the element emoji.
        imageUrl: input.imageUrl,
        modelUrl: input.modelUrl,
        modelZoom: input.modelZoom,
        ...battleFields(input.level, stats.stamina, firstSkill ?? 'Quick Attack'),
      };
      setBusinessNavitars(prev => [...prev, opponent]);
      return id;
    },
    [businessNavitars, calculateStats]
  );

  const challengeBusinessNavitar = useCallback(
    (businessNavitarId: string): string | null => {
      if (!userNavitar) return null;

      const businessNavitar = businessNavitars.find(n => n.id === businessNavitarId);
      if (!businessNavitar) return null;

      const newBattle: Battle = {
        id: Date.now().toString(),
        challenger: userNavitar,
        defender: businessNavitar,
        status: 'pending',
        timestamp: new Date(),
        rewards: {
          points: Math.floor(businessNavitar.level * 10),
          items: ['Battle Token', 'Experience Points'],
        },
      };

      setActiveBattles(prev => [...prev, newBattle]);
      // Return the id so the caller can complete this battle later.
      return newBattle.id;
    },
    [userNavitar, businessNavitars]
  );

  // Banks XP on a navitar and applies a level-up when the new total
  // crosses a threshold — the ONE place level-up math lives, so wins
  // and training cannot drift apart. A level-up plugs into the
  // existing duel math: stats are recomputed with calculateStats and
  // the battle fields re-derived with battleFields, keeping the
  // navitar's fast-move name — with attacks, from attacks[0] at the new
  // level (1.3x-per-level growth); without attacks, damage follows the
  // old 8 + floor(level x 1.5) formula — and max HP (50 + stamina x 5)
  // grows through the formulas that already exist — and the navitar
  // heals to full HP (battleFields sets hp = maxHp), consistent with
  // the post-duel heal. Returns the updated navitar and the level-up,
  // or null with no navitar / no XP.
  //
  // The XP lands on the TARGET navitar (targetId) — for a duel win,
  // the navitar that actually fought (the battle's challenger), NOT
  // whichever navitar happens to be active when the duel settles.
  // The old code banked on the active navitar through a render-era
  // closure: when the active navitar at settle time differed from the
  // fighter (switched on another page/tab mid-duel), the award landed
  // on the wrong navitar's total and the victory screen's "+N XP"
  // never reconciled with the fighter's Profile XP (live audit
  // 2026-11-12: "+400 XP" shown, fighter's XP unmoved, another
  // navitar's total up by exactly 400). Banking on the challenger
  // makes banked XP equal displayed XP by construction.
  const applyXp = useCallback(
    (
      xpToAdd: number,
      targetId?: string
    ): { navitar: Navitar; leveledUp: LevelUpInfo | null } | null => {
      const target = (targetId ? navitars.find(n => n.id === targetId) : undefined) ?? userNavitar;
      if (!target || !Number.isFinite(xpToAdd) || xpToAdd <= 0) return null;
      const oldXp = Number.isFinite(target.xp) && target.xp >= 0 ? Math.floor(target.xp) : 0;
      const newXp = oldXp + Math.floor(xpToAdd);
      const newLevel = levelForXp(newXp);
      let navitar: Navitar;
      let leveledUp: LevelUpInfo | null = null;
      if (newLevel > target.level) {
        const stats = calculateStats(newLevel);
        // With custom attacks, the fast move re-derives from attacks[0]
        // at the NEW level (name + scaled power) via battleFields —
        // the damage jump is the attacks' 1.3x-per-level growth, not
        // the old 8 + floor(level x 1.5) ladder. Without attacks, the
        // existing behaviour is kept exactly (name kept, old formula).
        const storedAttacks = sanitizeAttacks(target.attacks);
        const fields = storedAttacks
          ? battleFields(
              newLevel,
              stats.stamina,
              storedAttacks[0].name,
              attackPowerAtLevel(storedAttacks[0].power, newLevel)
            )
          : battleFields(newLevel, stats.stamina, target.fastMove.name);
        leveledUp = {
          from: target.level,
          to: newLevel,
          oldDamage: target.fastMove.damage,
          newDamage: fields.fastMove.damage,
          oldMaxHp: target.maxHp,
          newMaxHp: fields.maxHp,
        };
        navitar = { ...target, xp: newXp, level: newLevel, stats, ...fields };
      } else {
        navitar = { ...target, xp: newXp };
      }
      // Write to the target inside the collection — never through the
      // active-navitar updater, which would land the XP on the wrong
      // navitar whenever target ≠ active.
      const targetNavitarId = target.id;
      setNavitars(prev => prev.map(n => (n.id === targetNavitarId ? navitar : n)));
      return { navitar, leveledUp };
    },
    [navitars, userNavitar, calculateStats]
  );

  const completeBattle = useCallback(
    (battleId: string, winnerId: string): WinResult | null => {
      // Side effects live outside the setActiveBattles updater: an updater
      // must stay pure, and this is where a user win banks its points.
      const battle = activeBattles.find(b => b.id === battleId);
      let winResult: WinResult | null = null;
      if (battle) {
        const winner = battle.challenger.id === winnerId ? battle.challenger : battle.defender;
        if (winner.type === 'user' && battle.rewards) {
          // A win mints a new achievement reward. The battle's `items`
          // (Battle Token, Experience Points) have no field on Reward —
          // the points carry the value — so they are not carried over.
          addReward({
            type: 'achievement',
            title: `Victory over ${battle.defender.name}`,
            description: `Won battle against ${battle.defender.name}`,
            points: battle.rewards.points,
          });
          // Bank the same points in the running total; losing subtracts nothing.
          const wonPoints = battle.rewards.points;
          setPoints(prev => prev + wonPoints);
          setWinLoss(prev => ({ ...prev, wins: prev.wins + 1 }));
          // XP: 10 x opponent level, multiplied by the win streak
          // AFTER this win (1st x1, 2nd x1.25, 3rd x1.5, 4th x1.75,
          // 5th+ x2). The streak persists in localStorage. The XP
          // banks on the CHALLENGER — the navitar that fought this
          // battle — never on whichever navitar is active at settle
          // time, so the banked total always matches the "+N XP" the
          // victory screen shows for the fighter.
          const newStreak = winStreak + 1;
          setWinStreak(newStreak);
          const xpGained = winXp(battle.defender.level, newStreak);
          const applied = applyXp(xpGained, battle.challenger.id);
          winResult = {
            xpGained,
            streak: newStreak,
            multiplier: streakMultiplier(newStreak),
            xp: applied?.navitar.xp ?? battle.challenger.xp + xpGained,
            leveledUp: applied?.leveledUp ?? null,
          };
        } else if (winner.type !== 'user') {
          // A defeat breaks the streak — back to 0, and no XP.
          setWinStreak(0);
          setWinLoss(prev => ({ ...prev, losses: prev.losses + 1 }));
        }
      }
      setActiveBattles(prev =>
        prev.map(b => (b.id === battleId ? { ...b, status: 'completed', winner: winnerId } : b))
      );
      return winResult;
    },
    [activeBattles, addReward, userNavitar, winStreak, applyXp]
  );

  // One training session: +10 XP toward the same thresholds as win
  // XP, at most 5 sessions a day. Training never touches the win
  // streak. Shares applyXp with completeBattle — no second copy of
  // the level-up math.
  const trainNavitar = useCallback((): TrainResult => {
    const state = loadTraining();
    const remainingToday = Math.max(0, TRAIN_DAILY_CAP - state.count);
    const noGrant = (capped: boolean): TrainResult => ({
      granted: false,
      remainingToday: capped ? 0 : remainingToday,
      leveledUp: null,
      xp:
        Number.isFinite(userNavitar?.xp) && (userNavitar?.xp ?? 0) >= 0
          ? (userNavitar?.xp ?? 0)
          : 0,
      capped,
    });
    if (!userNavitar) return noGrant(false);
    if (state.count >= TRAIN_DAILY_CAP) return noGrant(true);
    if (!recordTraining()) return noGrant(true);
    const applied = applyXp(TRAIN_XP);
    const count = state.count + 1;
    const remaining = Math.max(0, TRAIN_DAILY_CAP - count);
    setTrainingToday({ count, cap: TRAIN_DAILY_CAP });
    return {
      granted: true,
      remainingToday: remaining,
      leveledUp: applied?.leveledUp ?? null,
      xp: applied?.navitar.xp ?? (userNavitar.xp ?? 0) + TRAIN_XP,
      capped: count >= TRAIN_DAILY_CAP,
    };
  }, [userNavitar, applyXp]);

  const getAvailableBattles = useCallback(() => {
    return activeBattles.filter(battle => battle.status === 'pending');
  }, [activeBattles]);

  return (
    <NavitarFightClubContext.Provider
      value={{
        navitars,
        activeNavitarId,
        setActiveNavitar,
        userNavitar,
        businessNavitars,
        activeBattles,
        points,
        winStreak,
        winLoss,
        trainingToday,
        trainNavitar,
        createUserNavitar,
        updateUserNavitarLook,
        updateUserNavitarAttacks,
        launchBusinessNavitar,
        addVenueOpponent,
        addWildOpponent,
        addRemoteOpponent,
        challengeBusinessNavitar,
        completeBattle,
        getAvailableBattles,
      }}
    >
      {children}
    </NavitarFightClubContext.Provider>
  );
};
