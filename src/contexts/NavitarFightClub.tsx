import React, { createContext, useContext, useState, useCallback } from 'react';
import { useBusiness } from './BusinessContext';
import { useReward } from './RewardContext';

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
  createUserNavitar: (name: string, skills: string[]) => void;
  launchBusinessNavitar: (
    businessId: string,
    navitar: Omit<Navitar, 'id' | 'owner' | 'type' | 'element' | 'hp' | 'maxHp' | 'fastMove'>
  ) => void;
  challengeBusinessNavitar: (businessNavitarId: string) => string | null;
  completeBattle: (battleId: string, winnerId: string) => void;
  getAvailableBattles: () => Battle[];
}

const NavitarFightClubContext = createContext<NavitarFightClubContextType>({
  userNavitar: null,
  businessNavitars: [],
  activeBattles: [],
  createUserNavitar: () => {},
  launchBusinessNavitar: () => {},
  challengeBusinessNavitar: () => null,
  completeBattle: () => {},
  getAvailableBattles: () => [],
});

export const useNavitarFightClub = () => useContext(NavitarFightClubContext);

// Battle health scales with stamina; every navitar starts at full HP
// with a default fast move. Callers don't supply these — they're derived.
// Hoisted to module level (it is pure) so the demo opponents below can use it.
const battleFields = (level: number, stamina: number) => {
  const maxHp = 50 + stamina * 5;
  return {
    hp: maxHp,
    maxHp,
    fastMove: {
      name: 'Quick Attack',
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
  const [userNavitar, setUserNavitar] = useState<Navitar | null>(null);
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
    (name: string, skills: string[]) => {
      const stats = calculateStats(1);
      const newNavitar: Navitar = {
        id: Date.now().toString(),
        name,
        owner: 'user',
        type: 'user',
        level: 1,
        stats,
        skills,
        element: 'ice',
        ...battleFields(1, stats.stamina),
      };
      setUserNavitar(newNavitar);
    },
    [calculateStats]
  );

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
      setActiveBattles(prev =>
        prev.map(battle => {
          if (battle.id === battleId) {
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
            }

            return {
              ...battle,
              status: 'completed',
              winner: winnerId,
            };
          }
          return battle;
        })
      );
    },
    [addReward]
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
        createUserNavitar,
        launchBusinessNavitar,
        challengeBusinessNavitar,
        completeBattle,
        getAvailableBattles,
      }}
    >
      {children}
    </NavitarFightClubContext.Provider>
  );
};
