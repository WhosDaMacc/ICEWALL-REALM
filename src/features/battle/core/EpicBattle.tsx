import React, { useState, useEffect, useRef } from 'react';
import { Box, Grid, Paper, Typography, Button, CircularProgress, Chip, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { useCombat } from '../contexts/CombatContext';
import { Navitar } from '../data/navitars';
import BattleAnimation from './BattleAnimation';
import BattleEnvironment from './BattleEnvironment';
import EpicBattleEffects from './EpicBattleEffects';

interface StatusEffect {
  type: string;
  duration: number;
  intensity: number;
  description: string;
}

interface EnvironmentalEffect {
  type: string;
  intensity: number;
  duration: number;
  description: string;
}

interface EpicBattleState {
  activeNavitar: Navitar | null;
  targetNavitar: Navitar | null;
  currentPhase: 'selection' | 'targeting' | 'animation' | 'resolution' | 'cinematic';
  turnCount: number;
  lastAction: string | null;
  comboMultiplier: number;
  epicPoints: number;
  specialEffects: string[];
  battleEnvironment: string;
}

const EpicBattle: React.FC = () => {
  const [battleState, setBattleState] = useState<EpicBattleState>({
    activeNavitar: null,
    targetNavitar: null,
    currentPhase: 'selection',
    turnCount: 1,
    lastAction: null,
    comboMultiplier: 1.0,
    epicPoints: 0,
    specialEffects: [],
    battleEnvironment: 'default',
  });
  const [showEffects, setShowEffects] = useState(false);
  const [showCinematic, setShowCinematic] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);

  const handleNavitarSelect = (navitar: Navitar) => {
    setBattleState(prev => ({
      ...prev,
      activeNavitar: navitar,
      currentPhase: 'targeting',
      battleEnvironment: getEpicEnvironment(navitar.type),
    }));
  };

  const handleTargetSelect = async (target: Navitar) => {
    setBattleState(prev => ({
      ...prev,
      targetNavitar: target,
      currentPhase: 'cinematic',
    }));
    setShowCinematic(true);

    // Calculate epic effects
    const effects = calculateEpicEffects(battleState.activeNavitar!, target);
    const comboMultiplier = calculateComboMultiplier(battleState.lastAction, target.type);
    
    // Create epic AR scene
    createEpicARScene(battleState.activeNavitar!, target, comboMultiplier, effects);
  };

  const calculateEpicEffects = (attacker: Navitar, target: Navitar): string[] => {
    const effects = [];
    
    // Type-based effects
    if (attacker.type === 'healer' && target.type === 'attacker') {
      effects.push('healing_aura', 'nature_burst');
    } else if (attacker.type === 'attacker' && target.type === 'defender') {
      effects.push('fire_blast', 'earthquake');
    } else if (attacker.type === 'defender' && target.type === 'support') {
      effects.push('shield_wall', 'counter_strike');
    } else if (attacker.type === 'support' && target.type === 'healer') {
      effects.push('energy_wave', 'buff_aura');
    }

    // Power level effects
    if (attacker.powerLevel >= 8) {
      effects.push('ultimate_charge');
    }
    if (target.powerLevel >= 8) {
      effects.push('boss_rage');
    }

    return effects;
  };

  const calculateComboMultiplier = (lastAction: string | null, targetType: string): number => {
    const typeAdvantages = {
      attacker: ['defender'],
      defender: ['support'],
      support: ['healer'],
      healer: ['attacker'],
    };

    if (!lastAction || !battleState.activeNavitar) return 1.0;

    const attackerType = battleState.activeNavitar.type;
    if (typeAdvantages[attackerType as keyof typeof typeAdvantages].includes(targetType)) {
      return battleState.comboMultiplier + 0.2;
    }

    return 1.0;
  };

  const getEpicEnvironment = (type: string): string => {
    switch (type) {
      case 'healer': return 'enchanted_forest';
      case 'attacker': return 'volcanic_arena';
      case 'defender': return 'mountain_fortress';
      case 'support': return 'cosmic_battlefield';
      default: return 'default';
    }
  };

  const createEpicARScene = (attacker: Navitar, target: Navitar, multiplier: number, effects: string[]) => {
    if (!sceneRef.current) return;

    const scene = document.createElement('a-scene');
    scene.setAttribute('embedded', '');
    scene.setAttribute('arjs', 'trackingMethod: best; debugUIEnabled: false;');

    // Create epic environment
    const environment = document.createElement('a-entity');
    environment.setAttribute('environment', JSON.stringify({
      preset: battleState.battleEnvironment,
      skyType: 'atmosphere',
      lighting: 'dramatic',
      shadow: true,
      fog: 0.7,
      dressing: 'epic',
      dressingAmount: 20,
      dressingColor: '#FFD700',
      ground: 'epic',
      groundYScale: 10,
      groundTexture: 'epic',
      groundColor: '#4A4A4A',
      groundColor2: '#2A2A2A',
    }));

    // Add epic particle systems
    effects.forEach(effect => {
      const particles = document.createElement('a-entity');
      const particleConfig = getEpicParticleConfig(effect, multiplier);
      particles.setAttribute('particle-system', JSON.stringify(particleConfig));
      scene.appendChild(particles);
    });

    // Add epic sound effects
    const sound = document.createElement('a-entity');
    sound.setAttribute('sound', JSON.stringify({
      src: getEpicSoundEffect(attacker.ability),
      autoplay: true,
      volume: 1.0,
    }));

    sceneRef.current.innerHTML = '';
    sceneRef.current.appendChild(scene);
  };

  const getEpicParticleConfig = (effect: string, multiplier: number) => {
    const baseConfig = {
      particleCount: 5000,
      maxAge: 3,
      size: 2,
      blending: 'additive',
    };

    switch (effect) {
      case 'healing_aura':
        return {
          ...baseConfig,
          color: ['#00FF00', '#7CFF7C', '#FFFFFF'],
          size: 3 * multiplier,
          accelerationSpread: { x: 20, y: 0, z: 20 },
          velocityValue: { x: 0, y: 6, z: 0 },
        };
      case 'fire_blast':
        return {
          ...baseConfig,
          color: ['#FF4500', '#FF0000', '#FFFF00'],
          size: 4 * multiplier,
          accelerationValue: { x: 0, y: -15, z: 0 },
          velocityValue: { x: 0, y: 30, z: 0 },
        };
      case 'shield_wall':
        return {
          ...baseConfig,
          color: ['#0000FF', '#00FFFF', '#FFFFFF'],
          size: 5 * multiplier,
          accelerationSpread: { x: 0, y: 0, z: 0 },
          velocityValue: { x: 0, y: 0, z: 0 },
        };
      case 'energy_wave':
        return {
          ...baseConfig,
          color: ['#800080', '#FF00FF', '#FFFFFF'],
          size: 4 * multiplier,
          accelerationSpread: { x: 30, y: 0, z: 30 },
          velocityValue: { x: 0, y: 0, z: 0 },
        };
      default:
        return baseConfig;
    }
  };

  const getEpicSoundEffect = (ability: string): string => {
    const soundMap: Record<string, string> = {
      "Nature's Embrace": '/sounds/epic_heal.mp3',
      'Thunder Strike': '/sounds/epic_thunder.mp3',
      'Wild Spirit': '/sounds/epic_transform.mp3',
      'Marsh Shuffle': '/sounds/epic_marsh.mp3',
      'Pixie Dust': '/sounds/epic_pixie.mp3',
    };

    return soundMap[ability] || '/sounds/epic_default.mp3';
  };

  const handleEffectComplete = (newEffects: {
    statusEffects: StatusEffect[];
    environmentalEffects: EnvironmentalEffect[];
    specialEffects: string[];
  }) => {
    setBattleState(prev => ({
      ...prev,
      specialEffects: [...prev.specialEffects, ...newEffects.specialEffects],
    }));

    // Apply status effects
    newEffects.statusEffects.forEach(effect => {
      if (effect.type === 'regeneration') {
        // Apply healing over time
        const interval = setInterval(() => {
          // Heal logic here
        }, 1000);
        setTimeout(() => clearInterval(interval), effect.duration * 1000);
      }
      // Add other status effect handlers
    });

    // Apply environmental effects
    newEffects.environmentalEffects.forEach(effect => {
      if (effect.type === 'nature_burst') {
        // Add nature burst visual effects
        createNatureBurstEffect(effect.intensity);
      } else if (effect.type === 'earthquake') {
        // Add earthquake visual effects
        createEarthquakeEffect(effect.intensity);
      }
    });
  };

  const createNatureBurstEffect = (intensity: number) => {
    if (!sceneRef.current) return;

    const particles = document.createElement('a-entity');
    particles.setAttribute('particle-system', JSON.stringify({
      preset: 'nature',
      particleCount: 2000 * intensity,
      color: ['#00FF00', '#7CFF7C', '#FFFFFF'],
      size: 2 * intensity,
      maxAge: 2,
      velocityValue: { x: 0, y: 5, z: 0 },
      accelerationSpread: { x: 10, y: 0, z: 10 },
    }));
    sceneRef.current.appendChild(particles);
  };

  const createEarthquakeEffect = (intensity: number) => {
    if (!sceneRef.current) return;

    const ground = document.createElement('a-entity');
    ground.setAttribute('animation', JSON.stringify({
      property: 'rotation',
      from: '0 0 0',
      to: `${Math.random() * intensity} ${Math.random() * intensity} ${Math.random() * intensity}`,
      dur: 200,
      easing: 'easeInOutQuad',
      loop: true,
    }));
    sceneRef.current.appendChild(ground);
  };

  return (
    <Box sx={{ position: 'relative', height: '100vh' }}>
      <div ref={sceneRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      
      <Box sx={{ position: 'absolute', bottom: 20, width: '100%', px: 2 }}>
        <Paper sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
          <Grid container spacing={2}>
            <Grid xs={12}>
              <Typography variant="h6" color="white">
                Turn {battleState.turnCount} - {battleState.currentPhase}
              </Typography>
              {battleState.comboMultiplier > 1 && (
                <Chip
                  label={`EPIC COMBO x${battleState.comboMultiplier.toFixed(1)}`}
                  color="secondary"
                  sx={{ ml: 1, backgroundColor: '#FFD700' }}
                />
              )}
              {battleState.epicPoints > 0 && (
                <Chip
                  label={`EPIC POINTS: ${battleState.epicPoints}`}
                  color="primary"
                  sx={{ ml: 1, backgroundColor: '#FF4500' }}
                />
              )}
            </Grid>
            
            {battleState.activeNavitar && (
              <Grid xs={12}>
                <Typography color="white">
                  Active: {battleState.activeNavitar.name} - {battleState.activeNavitar.ability}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Box>

      <Dialog 
        open={showCinematic} 
        onClose={() => setShowCinematic(false)}
        maxWidth="xl"
        fullScreen
      >
        <DialogTitle>EPIC BATTLE CINEMATIC</DialogTitle>
        <DialogContent>
          <BattleEnvironment
            attacker={battleState.activeNavitar!}
            defender={battleState.targetNavitar!}
            isActive={showCinematic}
            onEnvironmentReady={() => {
              setShowEffects(true);
            }}
          />
          <EpicBattleEffects
            attacker={battleState.activeNavitar!}
            defender={battleState.targetNavitar!}
            comboMultiplier={battleState.comboMultiplier}
            onEffectComplete={handleEffectComplete}
          />
          <BattleAnimation
            ability={battleState.activeNavitar?.ability || ''}
            powerLevel={battleState.activeNavitar?.powerLevel || 1}
            isActive={showEffects}
            onComplete={() => {
              setShowEffects(false);
              setShowCinematic(false);
              setBattleState(prev => ({
                ...prev,
                currentPhase: 'selection',
                turnCount: prev.turnCount + 1,
                lastAction: prev.activeNavitar?.type || null,
                epicPoints: prev.epicPoints + Math.floor(prev.comboMultiplier * 100),
              }));
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EpicBattle; 