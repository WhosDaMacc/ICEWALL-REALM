import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';

export type Tier = 'mortal' | 'ascendant' | 'interdimensional' | 'celestial' | 'primordial';

export interface TierRequirements {
  battlesCompleted: number;
  iceStaked: number;
  tournamentsWon: number;
  rank: number;
  mentors: number;
  iceHeld: number;
}

export interface Realm {
  id: string;
  name: string;
  type: string;
  difficulty: number;
  rewards: {
    ice: number;
    xp: number;
    items: string[];
  };
  coordinates: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

interface TierProgressionContextType {
  currentTier: Tier;
  requirements: TierRequirements;
  realms: Realm[];
  currentRealm: Realm | null;
  progress: {
    battlesCompleted: number;
    tournamentsWon: number;
    mentors: number;
  };
  unlockTier: (tier: Tier) => Promise<void>;
  enterRealm: (realmId: string) => Promise<void>;
  leaveRealm: () => void;
  mentorPlayer: (playerAddress: string) => Promise<void>;
  getTierBenefits: (tier: Tier) => {
    battleBonus: number;
    iceReward: number;
    specialAbilities: string[];
  };
}

const defaultRequirements: TierRequirements = {
  battlesCompleted: 0,
  iceStaked: 0,
  tournamentsWon: 0,
  rank: 0,
  mentors: 0,
  iceHeld: 0,
};

const defaultRealms: Realm[] = [
  {
    id: 'fractal-nexus',
    name: 'Fractal Nexus',
    type: 'interdimensional',
    difficulty: 8,
    rewards: {
      ice: 100,
      xp: 500,
      items: ['Fractal Core', 'Dimensional Shard'],
    },
    coordinates: {
      latitude: 0,
      longitude: 0,
      radius: 100,
    },
  },
  {
    id: 'ethereal-void',
    name: 'Ethereal Void',
    type: 'interdimensional',
    difficulty: 9,
    rewards: {
      ice: 150,
      xp: 750,
      items: ['Void Essence', 'Silent Blade'],
    },
    coordinates: {
      latitude: 0,
      longitude: 0,
      radius: 100,
    },
  },
];

const TierProgressionContext = createContext<TierProgressionContextType>({
  currentTier: 'mortal',
  requirements: defaultRequirements,
  realms: defaultRealms,
  currentRealm: null,
  progress: {
    battlesCompleted: 0,
    tournamentsWon: 0,
    mentors: 0,
  },
  unlockTier: async () => {},
  enterRealm: async () => {},
  leaveRealm: () => {},
  mentorPlayer: async () => {},
  getTierBenefits: () => ({
    battleBonus: 0,
    iceReward: 0,
    specialAbilities: [],
  }),
});

export const useTierProgression = () => useContext(TierProgressionContext);

export const TierProgressionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, contract } = useWeb3();
  const [currentTier, setCurrentTier] = useState<Tier>('mortal');
  const [requirements, setRequirements] = useState<TierRequirements>(defaultRequirements);
  const [realms, setRealms] = useState<Realm[]>(defaultRealms);
  const [currentRealm, setCurrentRealm] = useState<Realm | null>(null);
  const [progress, setProgress] = useState({
    battlesCompleted: 0,
    tournamentsWon: 0,
    mentors: 0,
  });

  useEffect(() => {
    if (account && contract) {
      loadTierProgress();
    }
  }, [account, contract]);

  const loadTierProgress = async () => {
    try {
      // Load user's tier and progress from contract
      const tierData = await contract.getUserTier(account);
      setCurrentTier(tierData.tier);
      setProgress({
        battlesCompleted: tierData.battlesCompleted,
        tournamentsWon: tierData.tournamentsWon,
        mentors: tierData.mentors,
      });
    } catch (error) {
      console.error('Error loading tier progress:', error);
    }
  };

  const unlockTier = async (tier: Tier) => {
    try {
      // Check if user meets requirements for the tier
      const meetsRequirements = await checkTierRequirements(tier);
      if (!meetsRequirements) {
        throw new Error('Requirements not met for this tier');
      }

      // Call contract to unlock tier
      await contract.unlockTier(tier);
      setCurrentTier(tier);
    } catch (error) {
      console.error('Error unlocking tier:', error);
      throw error;
    }
  };

  const checkTierRequirements = async (tier: Tier): Promise<boolean> => {
    const tierRequirements = {
      mortal: { battlesCompleted: 0, iceStaked: 0, tournamentsWon: 0, rank: 0, mentors: 0, iceHeld: 0 },
      ascendant: { battlesCompleted: 10, iceStaked: 100, tournamentsWon: 0, rank: 0, mentors: 0, iceHeld: 0 },
      interdimensional: { battlesCompleted: 20, iceStaked: 500, tournamentsWon: 3, rank: 0, mentors: 0, iceHeld: 0 },
      celestial: { battlesCompleted: 50, iceStaked: 1000, tournamentsWon: 10, rank: 100, mentors: 5, iceHeld: 0 },
      primordial: { battlesCompleted: 100, iceStaked: 5000, tournamentsWon: 20, rank: 10, mentors: 10, iceHeld: 10000 },
    };

    const requirements = tierRequirements[tier];
    return (
      progress.battlesCompleted >= requirements.battlesCompleted &&
      progress.tournamentsWon >= requirements.tournamentsWon &&
      progress.mentors >= requirements.mentors
    );
  };

  const enterRealm = async (realmId: string) => {
    try {
      const realm = realms.find(r => r.id === realmId);
      if (!realm) throw new Error('Realm not found');

      // Check if user has required tier for realm
      if (realm.type === 'interdimensional' && currentTier !== 'interdimensional') {
        throw new Error('Interdimensional tier required');
      }

      await contract.enterRealm(realmId);
      setCurrentRealm(realm);
    } catch (error) {
      console.error('Error entering realm:', error);
      throw error;
    }
  };

  const leaveRealm = () => {
    setCurrentRealm(null);
  };

  const mentorPlayer = async (playerAddress: string) => {
    try {
      await contract.mentorPlayer(playerAddress);
      setProgress(prev => ({
        ...prev,
        mentors: prev.mentors + 1,
      }));
    } catch (error) {
      console.error('Error mentoring player:', error);
      throw error;
    }
  };

  const getTierBenefits = (tier: Tier) => {
    const benefits = {
      mortal: {
        battleBonus: 0,
        iceReward: 1,
        specialAbilities: ['Basic AR battles', 'Starter Navitars'],
      },
      ascendant: {
        battleBonus: 5,
        iceReward: 1.05,
        specialAbilities: ['Elemental realms', 'Rare NFT crafting'],
      },
      interdimensional: {
        battleBonus: 10,
        iceReward: 1.1,
        specialAbilities: ['Realm teleportation', 'Exotic pets'],
      },
      celestial: {
        battleBonus: 15,
        iceReward: 1.15,
        specialAbilities: ['Divine Aura', 'Healing spells'],
      },
      primordial: {
        battleBonus: 20,
        iceReward: 1.2,
        specialAbilities: ['Reality bending', 'Custom events'],
      },
    };

    return benefits[tier];
  };

  return (
    <TierProgressionContext.Provider
      value={{
        currentTier,
        requirements,
        realms,
        currentRealm,
        progress,
        unlockTier,
        enterRealm,
        leaveRealm,
        mentorPlayer,
        getTierBenefits,
      }}
    >
      {children}
    </TierProgressionContext.Provider>
  );
}; 