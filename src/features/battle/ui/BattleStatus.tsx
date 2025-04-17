import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Chip, Tooltip } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

interface Navitar {
  name: string;
  type: 'ice' | 'fire' | 'nature' | 'shadow' | 'light';
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  statusEffects?: StatusEffect[];
}

interface StatusEffect {
  type: 'burn' | 'freeze' | 'poison' | 'regeneration' | 'empower';
  duration: number;
  intensity: number;
}

interface BattleStatusProps {
  playerNavitar: Navitar;
  opponentNavitar: Navitar;
  damagePreview?: {
    target: 'player' | 'opponent';
    amount: number;
  };
  isPlayerTurn: boolean;
}

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const shake = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
`;

const StatusContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  background: 'rgba(0, 0, 0, 0.7)',
  borderRadius: theme.shape.borderRadius * 2,
  marginBottom: theme.spacing(2),
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 8px rgba(0, 0, 0, 0.2)',
  }
}));

const getTypeColor = (type: string) => {
  switch (type) {
    case 'ice': return '#81D4FA';
    case 'fire': return '#FF5722';
    case 'nature': return '#4CAF50';
    case 'shadow': return '#9C27B0';
    case 'light': return '#FFC107';
    default: return '#2196F3';
  }
};

const getStatusColor = (type: string) => {
  switch (type) {
    case 'burn': return '#FF5722';
    case 'freeze': return '#81D4FA';
    case 'poison': return '#9C27B0';
    case 'regeneration': return '#4CAF50';
    case 'empower': return '#FFC107';
    default: return '#2196F3';
  }
};

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  marginBottom: theme.spacing(1),
  position: 'relative',
  overflow: 'visible',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
    backgroundSize: '200% 100%',
    animation: '${pulse} 2s infinite',
  }
}));

const DamagePreview = styled(Box)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: -20,
  background: 'rgba(255, 0, 0, 0.8)',
  color: 'white',
  padding: '2px 8px',
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.8rem',
  fontWeight: 'bold',
  animation: `${shake} 0.5s ease-in-out`,
}));

export const BattleStatus: React.FC<BattleStatusProps> = ({
  playerNavitar,
  opponentNavitar,
  damagePreview,
  isPlayerTurn
}) => {
  const [healthAnimations, setHealthAnimations] = useState({
    player: false,
    opponent: false
  });

  useEffect(() => {
    if (damagePreview) {
      setHealthAnimations(prev => ({
        ...prev,
        [damagePreview.target]: true
      }));
      const timer = setTimeout(() => {
        setHealthAnimations(prev => ({
          ...prev,
          [damagePreview.target]: false
        }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [damagePreview]);

  const renderStatusEffects = (effects: StatusEffect[] = []) => (
    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
      {effects.map((effect, index) => (
        <Tooltip key={index} title={`${effect.type} (${effect.duration} turns)`}>
          <Chip
            label={effect.type}
            size="small"
            sx={{
              backgroundColor: getStatusColor(effect.type),
              color: 'white',
              fontWeight: 'bold',
              animation: `${pulse} 2s infinite`,
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );

  const renderNavitarStatus = (navitar: Navitar, isPlayer: boolean) => {
    const isActive = isPlayer === isPlayerTurn;
    const showDamage = damagePreview?.target === (isPlayer ? 'player' : 'opponent');
    const healthPercentage = (navitar.health / navitar.maxHealth) * 100;
    const energyPercentage = (navitar.energy / navitar.maxEnergy) * 100;

    return (
      <StatusContainer
        sx={{
          borderColor: isActive ? getTypeColor(navitar.type) : 'rgba(255, 255, 255, 0.1)',
          animation: healthAnimations[isPlayer ? 'player' : 'opponent'] ? `${shake} 0.5s ease-in-out` : 'none',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ color: getTypeColor(navitar.type) }}>
            {navitar.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">
              {navitar.health}/{navitar.maxHealth} HP
            </Typography>
            {showDamage && (
              <DamagePreview>
                -{damagePreview.amount}
              </DamagePreview>
            )}
          </Box>
        </Box>
        <StyledLinearProgress
          variant="determinate"
          value={healthPercentage}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: getTypeColor(navitar.type),
              transition: 'width 0.3s ease-in-out',
            }
          }}
        />
        <StyledLinearProgress
          variant="determinate"
          value={energyPercentage}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#FFD700',
              transition: 'width 0.3s ease-in-out',
            }
          }}
        />
        {renderStatusEffects(navitar.statusEffects)}
      </StatusContainer>
    );
  };

  return (
    <Box>
      {renderNavitarStatus(opponentNavitar, false)}
      {renderNavitarStatus(playerNavitar, true)}
    </Box>
  );
}; 