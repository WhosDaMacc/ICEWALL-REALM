import React, { createContext, useContext, useState, useCallback } from 'react';
import { useWeb3 } from './Web3Context';
import { useTierProgression } from './TierProgression';

export type AbilityType = 'melee' | 'ranged' | 'elemental' | 'defense' | 'mobility';
export type Element = 'fire' | 'ice' | 'tech' | 'space' | 'nature';

export interface Ability {
  id: string;
  name: string;
  type: AbilityType;
  element?: Element;
  description: string;
  power: number;
  cooldown: number;
  range: number;
  effects: {
    damage?: number;
    stun?: number;
    slow?: number;
    pull?: number;
    shield?: number;
  };
  randomizedTraits?: {
    chance: number;
    effect: string;
  }[];
  tier: string;
  isExclusive?: boolean;
}

export interface Battle {
  id: string;
  player1: string;
  player2: string;
  abilities: {
    player1: Ability[];
    player2: Ability[];
  };
  status: 'active' | 'completed';
  winner?: string;
  rewards?: {
    ice: number;
    xp: number;
    items: string[];
  };
}

interface CombatContextType {
  abilities: Ability[];
  currentBattle: Battle | null;
  activeAbilities: Ability[];
  draftAbilities: () => Promise<Ability[]>;
  useAbility: (abilityId: string, target: string) => Promise<void>;
  startBattle: (opponent: string) => Promise<void>;
  endBattle: () => Promise<void>;
  getRandomizedEffect: (ability: Ability) => Promise<boolean>;
}

const defaultAbilities: Ability[] = [
  {
    id: 'grappling-hook',
    name: 'Grappling Hook',
    type: 'melee',
    description: 'Pull opponents closer, immobilizing them for 1 turn',
    power: 3,
    cooldown: 2,
    range: 5,
    effects: {
      pull: 1,
    },
    randomizedTraits: [
      {
        chance: 20,
        effect: 'Bleed (5% HP loss per turn)',
      },
    ],
    tier: 'mortal',
  },
  {
    id: 'plasma-blast',
    name: 'Plasma Blast',
    type: 'ranged',
    description: 'Energy projectile with homing capabilities',
    power: 4,
    cooldown: 3,
    range: 8,
    effects: {
      damage: 2,
    },
    randomizedTraits: [
      {
        chance: 15,
        effect: 'Stun',
      },
    ],
    tier: 'mortal',
  },
  {
    id: 'electrocution-grid',
    name: 'Electrocution Grid',
    type: 'elemental',
    element: 'tech',
    description: 'Trap enemies in a tesla-coil grid',
    power: 5,
    cooldown: 4,
    range: 6,
    effects: {
      damage: 3,
      stun: 1,
    },
    tier: 'ascendant',
  },
  {
    id: 'quantum-shield',
    name: 'Quantum Shield',
    type: 'defense',
    description: 'Absorbs 50% damage for 2 turns',
    power: 4,
    cooldown: 5,
    range: 0,
    effects: {
      shield: 50,
    },
    randomizedTraits: [
      {
        chance: 30,
        effect: 'Reflect projectiles',
      },
    ],
    tier: 'ascendant',
  },
  {
    id: 'wormhole-dash',
    name: 'Wormhole Dash',
    type: 'mobility',
    element: 'space',
    description: 'Teleport behind an enemy',
    power: 3,
    cooldown: 3,
    range: 7,
    effects: {
      damage: 1,
    },
    tier: 'interdimensional',
  },
];

const CombatContext = createContext<CombatContextType>({
  abilities: [],
  currentBattle: null,
  activeAbilities: [],
  draftAbilities: async () => [],
  useAbility: async () => {},
  startBattle: async () => {},
  endBattle: async () => {},
  getRandomizedEffect: async () => false,
});

export const useCombat = () => useContext(CombatContext);

export const CombatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, contract } = useWeb3();
  const { currentTier } = useTierProgression();
  const [abilities, setAbilities] = useState<Ability[]>(defaultAbilities);
  const [currentBattle, setCurrentBattle] = useState<Battle | null>(null);
  const [activeAbilities, setActiveAbilities] = useState<Ability[]>([]);

  const draftAbilities = useCallback(async () => {
    if (!account) return [];
    
    const availableAbilities = abilities.filter(
      ability => ability.tier === currentTier || ability.tier === 'mortal'
    );
    
    const drafted: Ability[] = [];
    while (drafted.length < 3 && availableAbilities.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableAbilities.length);
      drafted.push(availableAbilities[randomIndex]);
      availableAbilities.splice(randomIndex, 1);
    }
    
    setActiveAbilities(drafted);
    return drafted;
  }, [account, abilities, currentTier]);

  const useAbility = useCallback(async (abilityId: string, target: string) => {
    if (!account || !currentBattle) return;
    
    const ability = abilities.find(a => a.id === abilityId);
    if (!ability) return;

    try {
      await contract.useAbility(abilityId, target);
      
      // Apply randomized effects
      if (ability.randomizedTraits) {
        for (const trait of ability.randomizedTraits) {
          const effectTriggered = await getRandomizedEffect(ability);
          if (effectTriggered) {
            // Apply the effect
            await contract.applyEffect(target, trait.effect);
          }
        }
      }
    } catch (error) {
      console.error('Error using ability:', error);
    }
  }, [account, abilities, currentBattle, contract]);

  const startBattle = useCallback(async (opponent: string) => {
    if (!account) return;
    
    try {
      const draftedAbilities = await draftAbilities();
      const battle: Battle = {
        id: Date.now().toString(),
        player1: account,
        player2: opponent,
        abilities: {
          player1: draftedAbilities,
          player2: [], // Opponent's abilities will be set when they join
        },
        status: 'active',
      };
      
      setCurrentBattle(battle);
      await contract.startBattle(opponent, draftedAbilities.map(a => a.id));
    } catch (error) {
      console.error('Error starting battle:', error);
    }
  }, [account, contract, draftAbilities]);

  const endBattle = useCallback(async () => {
    if (!account || !currentBattle) return;
    
    try {
      await contract.endBattle(currentBattle.id);
      setCurrentBattle(null);
      setActiveAbilities([]);
    } catch (error) {
      console.error('Error ending battle:', error);
    }
  }, [account, currentBattle, contract]);

  const getRandomizedEffect = useCallback(async (ability: Ability): Promise<boolean> => {
    if (!ability.randomizedTraits) return false;
    
    try {
      const randomNumber = await contract.getRandomNumber();
      return randomNumber % 100 < ability.randomizedTraits[0].chance;
    } catch (error) {
      console.error('Error getting randomized effect:', error);
      return false;
    }
  }, [contract]);

  return (
    <CombatContext.Provider
      value={{
        abilities,
        currentBattle,
        activeAbilities,
        draftAbilities,
        useAbility,
        startBattle,
        endBattle,
        getRandomizedEffect,
      }}
    >
      {children}
    </CombatContext.Provider>
  );
}; 