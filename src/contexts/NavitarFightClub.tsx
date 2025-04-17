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
  launchBusinessNavitar: (businessId: string, navitar: Omit<Navitar, 'id' | 'owner' | 'type'>) => void;
  challengeBusinessNavitar: (businessNavitarId: string) => void;
  completeBattle: (battleId: string, winnerId: string) => void;
  getAvailableBattles: () => Battle[];
}

const NavitarFightClubContext = createContext<NavitarFightClubContextType>({
  userNavitar: null,
  businessNavitars: [],
  activeBattles: [],
  createUserNavitar: () => {},
  launchBusinessNavitar: () => {},
  challengeBusinessNavitar: () => {},
  completeBattle: () => {},
  getAvailableBattles: () => [],
});

export const useNavitarFightClub = () => useContext(NavitarFightClubContext);

export const NavitarFightClubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userNavitar, setUserNavitar] = useState<Navitar | null>(null);
  const [businessNavitars, setBusinessNavitars] = useState<Navitar[]>([]);
  const [activeBattles, setActiveBattles] = useState<Battle[]>([]);
  const { businesses, updateBusinessNavitar } = useBusiness();
  const { claimReward } = useReward();

  const calculateStats = useCallback((level: number) => {
    const base = 10;
    return {
      strength: base + Math.floor(level * 1.5),
      defense: base + Math.floor(level * 1.2),
      speed: base + Math.floor(level * 1.3),
      stamina: base + Math.floor(level * 1.1),
    };
  }, []);

  const createUserNavitar = useCallback((name: string, skills: string[]) => {
    const newNavitar: Navitar = {
      id: Date.now().toString(),
      name,
      owner: 'user',
      type: 'user',
      level: 1,
      stats: calculateStats(1),
      skills,
    };
    setUserNavitar(newNavitar);
  }, [calculateStats]);

  const launchBusinessNavitar = useCallback((businessId: string, navitar: Omit<Navitar, 'id' | 'owner' | 'type'>) => {
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;

    const newNavitar: Navitar = {
      ...navitar,
      id: Date.now().toString(),
      owner: businessId,
      type: 'business',
    };

    setBusinessNavitars(prev => [...prev, newNavitar]);
    updateBusinessNavitar(businessId, {
      name: navitar.name,
      level: navitar.level,
      skills: navitar.skills,
      stats: navitar.stats,
    });
  }, [businesses, updateBusinessNavitar]);

  const challengeBusinessNavitar = useCallback((businessNavitarId: string) => {
    if (!userNavitar) return;

    const businessNavitar = businessNavitars.find(n => n.id === businessNavitarId);
    if (!businessNavitar) return;

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
  }, [userNavitar, businessNavitars]);

  const completeBattle = useCallback((battleId: string, winnerId: string) => {
    setActiveBattles(prev =>
      prev.map(battle => {
        if (battle.id === battleId) {
          const winner = battle.challenger.id === winnerId ? battle.challenger : battle.defender;
          
          if (winner.type === 'user' && battle.rewards) {
            claimReward({
              id: Date.now().toString(),
              type: 'battle',
              title: `Victory over ${battle.defender.name}`,
              description: `Won battle against ${battle.defender.name}`,
              points: battle.rewards.points,
              items: battle.rewards.items,
              status: 'available',
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
  }, [claimReward]);

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