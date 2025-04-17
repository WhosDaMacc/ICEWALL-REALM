import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import { useCombat } from '../contexts/CombatContext';
import { Navitar } from '../data/navitars';
import BattleAnimation from './BattleAnimation';

interface BattleState {
  activeNavitar: Navitar | null;
  targetNavitar: Navitar | null;
  currentPhase: 'selection' | 'targeting' | 'animation' | 'resolution';
  turnCount: number;
  lastAction: string | null;
  comboMultiplier: number;
}

const EnhancedBattle: React.FC = () => {
  const [battleState, setBattleState] = useState<BattleState>({
    activeNavitar: null,
    targetNavitar: null,
    currentPhase: 'selection',
    turnCount: 1,
    lastAction: null,
    comboMultiplier: 1.0,
  });
  const [showEffects, setShowEffects] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);

  const handleNavitarSelect = (navitar: Navitar) => {
    setBattleState(prev => ({
      ...prev,
      activeNavitar: navitar,
      currentPhase: 'targeting',
    }));
  };

  const handleTargetSelect = async (target: Navitar) => {
    setBattleState(prev => ({
      ...prev,
      targetNavitar: target,
      currentPhase: 'animation',
    }));
    setShowEffects(true);

    // Calculate combo effects
    const comboMultiplier = calculateComboMultiplier(battleState.lastAction, target.type);
    
    // Create AR scene with enhanced effects
    createEnhancedARScene(battleState.activeNavitar!, target, comboMultiplier);
  };

  const calculateComboMultiplier = (lastAction: string | null, targetType: string): number => {
    // Implement combo system based on type advantages
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

  const createEnhancedARScene = (attacker: Navitar, target: Navitar, multiplier: number) => {
    if (!sceneRef.current) return;

    const scene = document.createElement('a-scene');
    scene.setAttribute('embedded', '');
    scene.setAttribute('arjs', 'trackingMethod: best; debugUIEnabled: false;');

    // Create dynamic environment
    const environment = document.createElement('a-entity');
    environment.setAttribute('environment', {
      preset: getBattleEnvironment(attacker.type),
      dressing: 'trees',
      dressingAmount: 10,
      dressingColor: '#1A5D1A',
      ground: 'flat',
    });
    scene.appendChild(environment);

    // Add particle systems for enhanced visual effects
    const particles = document.createElement('a-entity');
    const particleConfig = getParticleConfig(attacker.particleEffect!, multiplier);
    particles.setAttribute('particle-system', particleConfig);
    scene.appendChild(particles);

    // Add sound effects
    const sound = document.createElement('a-entity');
    sound.setAttribute('sound', {
      src: getSoundEffect(attacker.ability),
      autoplay: true,
      volume: 0.8,
    });
    scene.appendChild(sound);

    sceneRef.current.innerHTML = '';
    sceneRef.current.appendChild(scene);
  };

  const getBattleEnvironment = (type: string): string => {
    switch (type) {
      case 'healer': return 'forest';
      case 'attacker': return 'volcano';
      case 'defender': return 'mountain';
      case 'support': return 'starry';
      default: return 'default';
    }
  };

  const getParticleConfig = (effect: string, multiplier: number) => {
    const baseConfig = {
      particleCount: 2000,
      maxAge: 2,
      size: 1,
      blending: 'additive',
    };

    switch (effect) {
      case 'healing':
        return {
          ...baseConfig,
          color: ['#00FF00', '#7CFF7C'],
          size: 2 * multiplier,
          accelerationSpread: { x: 10, y: 0, z: 10 },
          velocityValue: { x: 0, y: 4, z: 0 },
        };
      case 'lightning':
        return {
          ...baseConfig,
          color: ['#FFFF00', '#FFA500'],
          size: 1.5 * multiplier,
          accelerationValue: { x: 0, y: -10, z: 0 },
          velocityValue: { x: 0, y: 20, z: 0 },
        };
      // Add more effect configurations...
      default:
        return baseConfig;
    }
  };

  const getSoundEffect = (ability: string): string => {
    // Map abilities to sound effects
    const soundMap: Record<string, string> = {
      "Nature's Embrace": '/sounds/heal.mp3',
      'Thunder Strike': '/sounds/thunder.mp3',
      'Wild Spirit': '/sounds/transform.mp3',
      // Add more sound mappings...
    };

    return soundMap[ability] || '/sounds/default.mp3';
  };

  return (
    <Box sx={{ position: 'relative', height: '100vh' }}>
      <div ref={sceneRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      
      <Box sx={{ position: 'absolute', bottom: 20, width: '100%', px: 2 }}>
        <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6">
                Turn {battleState.turnCount} - {battleState.currentPhase}
              </Typography>
              {battleState.comboMultiplier > 1 && (
                <Chip
                  label={`Combo x${battleState.comboMultiplier.toFixed(1)}`}
                  color="secondary"
                  sx={{ ml: 1 }}
                />
              )}
            </Grid>
            
            {battleState.activeNavitar && (
              <Grid item xs={12}>
                <Typography>
                  Active: {battleState.activeNavitar.name} - {battleState.activeNavitar.ability}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Box>

      <Dialog open={showEffects} onClose={() => setShowEffects(false)}>
        <DialogTitle>Battle Effects</DialogTitle>
        <DialogContent>
          <BattleAnimation
            ability={battleState.activeNavitar?.ability || ''}
            powerLevel={battleState.activeNavitar?.powerLevel || 1}
            isActive={showEffects}
            onComplete={() => {
              setShowEffects(false);
              setBattleState(prev => ({
                ...prev,
                currentPhase: 'selection',
                turnCount: prev.turnCount + 1,
                lastAction: prev.activeNavitar?.type || null,
              }));
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EnhancedBattle; 