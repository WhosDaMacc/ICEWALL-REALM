import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useBusiness } from './BusinessContext';
import { useReward } from './RewardContext';

// The player's navitar must survive navigation AND reloads. The context
// alone is in-memory, so a reload (or a direct URL load, which is how the
// live site is browsed) wiped the navitar the player just created —
// Profile showed 0 and the map said "No companion yet". Persist the one
// user navitar to localStorage; demo opponents and battles stay in-memory.
const USER_NAVITAR_KEY = 'icewall-user-navitar';

interface Navitar {
  id: string;
  name: string;
  owner: string;
  type: 'user' | 'business';
  level: number;
  stats: {
    strength: number;
    defense: number;
    speed: number;
    stamina: number;
  };
  skills: string[];
  // Element drives the type-effectiveness chart in NavitarBattle.
  // Creation UI should let the player pick one; 'ice' is the default until then.
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

interface NavitarFightClubContextType {
  userNavitar: Navitar | null;
  businessNavitars: Navitar[];
  activeBattles: Battle[];
  // Battle points: the running total of points won in duels, persisted in
  // localStorage so a reload doesn't zero it. Shown on Profile and in the
  // map companion panel. Losing a battle never subtracts.
  points: number;
  createUserNavitar: (name: string, skills: string[], imageUrl?: string) => void;
  // Re-look an existing navitar — the look-picker used to live only in
  // the create dialog, so a player who already had a navitar (created
  // before the picker existed, with no imageUrl) could never reach it
  // and stayed an emoji on the stage and Profile. Saves onto the
  // navitar, so the stage, Profile and companion pick it up; persisted
  // by the same save effect as everything else on the navitar.
  updateUserNavitarLook: (imageUrl: string) => void;
  launchBusinessNavitar: (
    businessId: string,
    navitar: Omit<Navitar, 'id' | 'owner' | 'type' | 'element' | 'hp' | 'maxHp' | 'fastMove'>
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
  challengeBusinessNavitar: (businessNavitarId: string) => string | null;
  completeBattle: (battleId: string, winnerId: string) => void;
  getAvailableBattles: () => Battle[];
}

const NavitarFightClubContext = createContext<NavitarFightClubContextType>({
  userNavitar: null,
  businessNavitars: [],
  activeBattles: [],
  points: 0,
  createUserNavitar: () => {},
  updateUserNavitarLook: () => {},
  launchBusinessNavitar: () => {},
  addVenueOpponent: () => '',
  challengeBusinessNavitar: () => null,
  completeBattle: () => {},
  getAvailableBattles: () => [],
});

export const useNavitarFightClub = () => useContext(NavitarFightClubContext);

// Battle health scales with stamina; every navitar starts at full HP
// with a default fast move. Callers don't supply these — they're derived.
// Hoisted to module level (it is pure) so the demo opponents below can use it.
// moveName: the navitar's signature fast move. The player-creation path
// passes the first skill the player typed (see createUserNavitar); the
// system default 'Quick Attack' is only the fallback when no skill exists.
const battleFields = (level: number, stamina: number, moveName = 'Quick Attack') => {
  const maxHp = 50 + stamina * 5;
  return {
    hp: maxHp,
    maxHp,
    fastMove: {
      name: moveName,
      damage: 8 + Math.floor(level * 1.5),
      energyGain: 10,
      cooldown: 2,
    },
  };
};

// Demo opponents — the 4 new navitars with art, seeded as challengeable
// business navitars so the Battle page has someone to fight. They belong to
// the demo arena, not a real business; a real business navitar is launched
// through launchBusinessNavitar instead. Stamina is tuned so maxHp equals
// the Collection HP for each one (maxHp = 50 + stamina * 5).
const DEMO_OPPONENTS: Navitar[] = [
  {
    id: 'demo-quantix',
    name: 'Quantix',
    owner: 'demo-arena',
    type: 'business',
    level: 22,
    stats: { strength: 88, defense: 70, speed: 90, stamina: 6 },
    skills: ['Quantum Leap', 'Phase Shift'],
    element: 'quantum',
    ...battleFields(22, 6),
  },
  {
    id: 'demo-voltwing',
    name: 'Voltwing',
    owner: 'demo-arena',
    type: 'business',
    level: 19,
    stats: { strength: 85, defense: 60, speed: 95, stamina: 4.4 },
    skills: ['Thunder Dive', 'Static Shock'],
    element: 'electric',
    ...battleFields(19, 4.4),
  },
  {
    id: 'demo-spiritmaw',
    name: 'Spiritmaw',
    owner: 'demo-arena',
    type: 'business',
    level: 24,
    stats: { strength: 80, defense: 88, speed: 65, stamina: 9 },
    skills: ['Soul Roar', 'Spirit Guard'],
    element: 'spiritual',
    ...battleFields(24, 9),
  },
  {
    id: 'demo-tidefang',
    name: 'Tidefang',
    owner: 'demo-arena',
    type: 'business',
    level: 17,
    stats: { strength: 78, defense: 75, speed: 80, stamina: 6.4 },
    skills: ['Tidal Wave', 'Aqua Fang'],
    element: 'water',
    ...battleFields(17, 6.4),
  },
];

export const NavitarFightClubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lazy-init from localStorage so a reload restores the player's navitar
  // instead of dropping them back to "no navitar". Corrupt JSON falls
  // back to null rather than crashing the provider.
  // MIGRATION: navitars saved before the typed-skill fix have the
  // default 'Quick Attack' fast move even though the player typed a
  // skill (Profile showed "Skills: Ice Blast" but "Fast move: Quick
  // Attack"). On load, a saved navitar whose fast move is the default
  // AND which has skills adopts its first skill as the fast-move name,
  // with the same damage derivation a fresh creation uses. The save
  // effect below persists the migrated navitar, so this runs once.
  const [userNavitar, setUserNavitar] = useState<Navitar | null>(() => {
    try {
      const raw = localStorage.getItem(USER_NAVITAR_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Navitar;
      const firstSkill = (parsed.skills ?? []).map(s => s.trim()).find(Boolean);
      if (parsed.fastMove?.name === 'Quick Attack' && firstSkill) {
        return {
          ...parsed,
          fastMove: {
            ...parsed.fastMove,
            name: firstSkill,
            damage: 8 + Math.floor(parsed.level * 1.5),
          },
        };
      }
      return parsed;
    } catch {
      return null;
    }
  });

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

  // Save on every change; clear the key if the navitar is ever removed.
  useEffect(() => {
    try {
      if (userNavitar) {
        localStorage.setItem(USER_NAVITAR_KEY, JSON.stringify(userNavitar));
      } else {
        localStorage.removeItem(USER_NAVITAR_KEY);
      }
    } catch {
      // Private mode / quota: the navitar still works for this session.
    }
  }, [userNavitar]);
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
    (name: string, skills: string[], imageUrl?: string) => {
      const stats = calculateStats(1);
      // The first skill the player types IS the navitar's fast move — the
      // typed skill is the signature move, named exactly as typed, with
      // the same damage derivation as the default. 'Quick Attack' is
      // only the fallback when the player typed no skill at all.
      const firstSkill = skills.map(s => s.trim()).find(Boolean);
      const newNavitar: Navitar = {
        id: Date.now().toString(),
        name,
        owner: 'user',
        type: 'user',
        level: 1,
        stats,
        skills,
        element: 'ice',
        // The look picked in the create dialog — persisted with the
        // rest of the navitar, so the stage, Profile and companion use
        // it when present. No imageUrl means the old behaviour (name
        // map -> element emoji).
        imageUrl,
        ...battleFields(1, stats.stamina, firstSkill ?? 'Quick Attack'),
      };
      setUserNavitar(newNavitar);
    },
    [calculateStats]
  );

  // Change the existing navitar's look. One user navitar only — there
  // is no second-navitar flow; this just re-skins the one they have.
  const updateUserNavitarLook = useCallback((imageUrl: string) => {
    setUserNavitar(prev => (prev ? { ...prev, imageUrl } : prev));
  }, []);

  const launchBusinessNavitar = useCallback(
    (
      businessId: string,
      navitar: Omit<Navitar, 'id' | 'owner' | 'type' | 'element' | 'hp' | 'maxHp' | 'fastMove'>
    ) => {
      const business = businesses.find(b => b.id === businessId);
      if (!business) return;

      const newNavitar: Navitar = {
        ...navitar,
        id: Date.now().toString(),
        owner: businessId,
        type: 'business',
        element: 'ice',
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

  const completeBattle = useCallback(
    (battleId: string, winnerId: string) => {
      // Side effects live outside the setActiveBattles updater: an updater
      // must stay pure, and this is where a user win banks its points.
      const battle = activeBattles.find(b => b.id === battleId);
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
        }
      }
      setActiveBattles(prev =>
        prev.map(b => (b.id === battleId ? { ...b, status: 'completed', winner: winnerId } : b))
      );
    },
    [activeBattles, addReward]
  );

  const getAvailableBattles = useCallback(() => {
    return activeBattles.filter(battle => battle.status === 'pending');
  }, [activeBattles]);

  return (
    <NavitarFightClubContext.Provider
      value={{
        userNavitar,
        businessNavitars,
        activeBattles,
        points,
        createUserNavitar,
        updateUserNavitarLook,
        launchBusinessNavitar,
        addVenueOpponent,
        challengeBusinessNavitar,
        completeBattle,
        getAvailableBattles,
      }}
    >
      {children}
    </NavitarFightClubContext.Provider>
  );
};
