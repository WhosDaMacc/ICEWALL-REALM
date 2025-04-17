import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Navitar, Move } from './NavitarContext';

export interface BattleState {
  isActive: boolean;
  currentTurn: 'player' | 'opponent';
  playerTeam: Navitar[];
  opponentTeam: Navitar[];
  comboMeter: number;
  specialMoves: string[];
  effects: BattleEffect[];
  turnCount: number;
  lastMove: {
    attacker: Navitar;
    defender: Navitar;
    move: Move;
  } | null;
}

export interface BattleEffect {
  type: 'status' | 'environmental' | 'special';
  name: string;
  duration: number;
  intensity: number;
  target: 'player' | 'opponent' | 'both';
  modifiers?: {
    damage?: number;
    defense?: number;
    energy?: number;
  };
}

interface BattleContextType {
  battleState: BattleState;
  startBattle: (playerTeam: Navitar[], opponentTeam: Navitar[]) => void;
  endBattle: () => void;
  executeMove: (moveName: string, target: Navitar) => void;
  addEffect: (effect: BattleEffect) => void;
  removeEffect: (effectName: string) => void;
  updateComboMeter: (amount: number) => void;
  storeSpecialMove: (moveName: string) => void;
  calculateDamage: (move: Move, attacker: Navitar, defender: Navitar) => number;
  applyEffects: () => void;
}

const initialBattleState: BattleState = {
  isActive: false,
  currentTurn: 'player',
  playerTeam: [],
  opponentTeam: [],
  comboMeter: 0,
  specialMoves: [],
  effects: [],
  turnCount: 0,
  lastMove: null,
};

const BattleContext = createContext<BattleContextType | undefined>(undefined);

export const BattleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [battleState, setBattleState] = useState<BattleState>(initialBattleState);

  const startBattle = (playerTeam: Navitar[], opponentTeam: Navitar[]) => {
    setBattleState({
      ...initialBattleState,
      isActive: true,
      playerTeam,
      opponentTeam,
    });
  };

  const endBattle = () => {
    setBattleState(initialBattleState);
  };

  const calculateDamage = (move: Move, attacker: Navitar, defender: Navitar) => {
    let damage = move.damage;

    // Type effectiveness
    const typeEffectiveness = getTypeEffectiveness(move.type, defender.type);
    damage *= typeEffectiveness;

    // Combo multiplier
    const comboMultiplier = 1 + (battleState.comboMeter / 100) * 0.5;
    damage *= comboMultiplier;

    // Apply active effects
    const attackerEffects = battleState.effects.filter(
      e => (e.target === 'player' && attacker === battleState.playerTeam[0]) ||
           (e.target === 'opponent' && attacker === battleState.opponentTeam[0])
    );
    
    attackerEffects.forEach(effect => {
      if (effect.modifiers?.damage) {
        damage *= effect.modifiers.damage;
      }
    });

    return Math.round(damage);
  };

  const getTypeEffectiveness = (moveType: string, defenderType: string): number => {
    const effectiveness: { [key: string]: { [key: string]: number } } = {
      ice: { fire: 0.5, nature: 2, shadow: 1, light: 1 },
      fire: { ice: 2, nature: 2, shadow: 1, light: 0.5 },
      nature: { ice: 0.5, fire: 0.5, shadow: 2, light: 1 },
      shadow: { ice: 1, fire: 1, nature: 0.5, light: 0.5 },
      light: { ice: 1, fire: 2, nature: 1, shadow: 2 },
    };

    return effectiveness[moveType]?.[defenderType] ?? 1;
  };

  const executeMove = (moveName: string, target: Navitar) => {
    const attacker = battleState.currentTurn === 'player' 
      ? battleState.playerTeam[0] 
      : battleState.opponentTeam[0];

    const move = attacker.moves.find(m => m.name === moveName);
    if (!move) return;

    const damage = calculateDamage(move, attacker, target);
    
    setBattleState(prev => {
      const updatedTarget = {
        ...target,
        health: Math.max(0, target.health - damage),
      };

      const nextTurn: 'player' | 'opponent' = prev.currentTurn === 'player' ? 'opponent' : 'player';

      const updatedState: BattleState = {
        ...prev,
        currentTurn: nextTurn,
        turnCount: prev.turnCount + 1,
        lastMove: { attacker, defender: target, move },
        playerTeam: prev.currentTurn === 'opponent' ? [updatedTarget] : prev.playerTeam,
        opponentTeam: prev.currentTurn === 'player' ? [updatedTarget] : prev.opponentTeam
      };

      return updatedState;
    });

    applyEffects();
  };

  const addEffect = (effect: BattleEffect) => {
    setBattleState(prev => ({
      ...prev,
      effects: [...prev.effects, effect],
    }));
  };

  const removeEffect = (effectName: string) => {
    setBattleState(prev => ({
      ...prev,
      effects: prev.effects.filter(e => e.name !== effectName),
    }));
  };

  const updateComboMeter = (amount: number) => {
    setBattleState(prev => ({
      ...prev,
      comboMeter: Math.min(100, Math.max(0, prev.comboMeter + amount)),
    }));
  };

  const storeSpecialMove = (moveName: string) => {
    if (battleState.specialMoves.length < 3) {
      setBattleState(prev => ({
        ...prev,
        specialMoves: [...prev.specialMoves, moveName],
      }));
    }
  };

  const applyEffects = () => {
    setBattleState(prev => {
      const updatedEffects = prev.effects
        .map(effect => ({ ...effect, duration: effect.duration - 1 }))
        .filter(effect => effect.duration > 0);

      return {
        ...prev,
        effects: updatedEffects,
      };
    });
  };

  return (
    <BattleContext.Provider value={{
      battleState,
      startBattle,
      endBattle,
      executeMove,
      addEffect,
      removeEffect,
      updateComboMeter,
      storeSpecialMove,
      calculateDamage,
      applyEffects,
    }}>
      {children}
    </BattleContext.Provider>
  );
};

export const useBattle = () => {
  const context = useContext(BattleContext);
  if (context === undefined) {
    throw new Error('useBattle must be used within a BattleProvider');
  }
  return context;
}; 