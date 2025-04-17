import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Navitar } from '../data/navitars';

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

interface EpicBattleEffectsProps {
  attacker: Navitar;
  defender: Navitar;
  comboMultiplier: number;
  onEffectComplete: (effects: {
    statusEffects: StatusEffect[];
    environmentalEffects: EnvironmentalEffect[];
    specialEffects: string[];
  }) => void;
}

const EpicBattleEffects: React.FC<EpicBattleEffectsProps> = ({
  attacker,
  defender,
  comboMultiplier,
  onEffectComplete,
}) => {
  const [effects, setEffects] = useState<{
    statusEffects: StatusEffect[];
    environmentalEffects: EnvironmentalEffect[];
    specialEffects: string[];
  }>({
    statusEffects: [],
    environmentalEffects: [],
    specialEffects: [],
  });

  useEffect(() => {
    const newEffects = calculateEffects();
    setEffects(newEffects);
    onEffectComplete(newEffects);
  }, [attacker, defender, comboMultiplier]);

  const calculateEffects = () => {
    const statusEffects: StatusEffect[] = [];
    const environmentalEffects: EnvironmentalEffect[] = [];
    const specialEffects: string[] = [];

    // Type-based status effects
    if (attacker.type === 'healer') {
      statusEffects.push({
        type: 'regeneration',
        duration: 3,
        intensity: 2 * comboMultiplier,
        description: 'Continuous healing over time',
      });
    } else if (attacker.type === 'attacker') {
      statusEffects.push({
        type: 'burn',
        duration: 2,
        intensity: 3 * comboMultiplier,
        description: 'Damage over time',
      });
    } else if (attacker.type === 'defender') {
      statusEffects.push({
        type: 'fortify',
        duration: 3,
        intensity: 2 * comboMultiplier,
        description: 'Increased defense',
      });
    } else if (attacker.type === 'support') {
      statusEffects.push({
        type: 'empower',
        duration: 2,
        intensity: 2 * comboMultiplier,
        description: 'Increased attack power',
      });
    }

    // Environmental effects based on battle type
    if (attacker.type === 'healer' && defender.type === 'attacker') {
      environmentalEffects.push({
        type: 'nature_burst',
        intensity: 3 * comboMultiplier,
        duration: 2,
        description: 'Nature energy surges through the battlefield',
      });
    } else if (attacker.type === 'attacker' && defender.type === 'defender') {
      environmentalEffects.push({
        type: 'earthquake',
        intensity: 4 * comboMultiplier,
        duration: 2,
        description: 'The ground shakes violently',
      });
    }

    // Special effects for high power levels
    if (attacker.powerLevel >= 8) {
      specialEffects.push('ultimate_charge');
      if (attacker.type === 'healer') {
        specialEffects.push('divine_light');
      } else if (attacker.type === 'attacker') {
        specialEffects.push('inferno_blast');
      }
    }

    // Team combo effects
    if (comboMultiplier >= 2) {
      specialEffects.push('team_synergy');
      if (attacker.type === 'healer' && defender.type === 'support') {
        specialEffects.push('harmony_wave');
      } else if (attacker.type === 'attacker' && defender.type === 'defender') {
        specialEffects.push('tactical_assault');
      }
    }

    return {
      statusEffects,
      environmentalEffects,
      specialEffects,
    };
  };

  const getEffectColor = (type: string) => {
    switch (type) {
      case 'regeneration':
        return '#00FF00';
      case 'burn':
        return '#FF4500';
      case 'fortify':
        return '#0000FF';
      case 'empower':
        return '#800080';
      case 'nature_burst':
        return '#7CFF7C';
      case 'earthquake':
        return '#8B4513';
      default:
        return '#FFFFFF';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" color="white" gutterBottom>
        Battle Effects
      </Typography>

      {effects.statusEffects.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" color="white" gutterBottom>
            Status Effects
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {effects.statusEffects.map((effect, index) => (
              <Chip
                key={index}
                label={`${effect.type} (${effect.intensity}x)`}
                sx={{
                  backgroundColor: getEffectColor(effect.type),
                  color: 'white',
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {effects.environmentalEffects.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" color="white" gutterBottom>
            Environmental Effects
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {effects.environmentalEffects.map((effect, index) => (
              <Chip
                key={index}
                label={`${effect.type} (${effect.intensity}x)`}
                sx={{
                  backgroundColor: getEffectColor(effect.type),
                  color: 'white',
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {effects.specialEffects.length > 0 && (
        <Box>
          <Typography variant="subtitle1" color="white" gutterBottom>
            Special Effects
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {effects.specialEffects.map((effect, index) => (
              <Chip
                key={index}
                label={effect}
                sx={{
                  backgroundColor: '#FFD700',
                  color: 'black',
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default EpicBattleEffects; 