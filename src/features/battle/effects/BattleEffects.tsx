import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { BattleEffect } from '../contexts/BattleContext';

const float = keyframes`
  0% { transform: translateY(0) scale(1) rotate(0deg); }
  50% { transform: translateY(-20px) scale(1.2) rotate(180deg); }
  100% { transform: translateY(0) scale(1) rotate(360deg); }
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 0.6; }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const EffectContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '200px',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, transparent 20%, rgba(255,255,255,0.1) 40%, transparent 60%)',
    backgroundSize: '200% 100%',
    animation: `${shimmer} 3s linear infinite`,
  },
}));

const EffectParticle = styled(Box)<{ 
  type: string; 
  intensity: number;
  variant: 'status' | 'environmental' | 'special';
}>(({ theme, type, intensity, variant }) => {
  const getColor = () => {
    switch (type) {
      case 'burn':
        return theme.palette.error.main;
      case 'freeze':
        return theme.palette.info.main;
      case 'poison':
        return theme.palette.secondary.main;
      case 'boost':
        return theme.palette.success.main;
      case 'storm':
        return '#68a5ff';
      case 'earthquake':
        return '#8b4513';
      case 'mist':
        return '#e0e0e0';
      case 'sunlight':
        return '#ffd700';
      default:
        return theme.palette.text.primary;
    }
  };

  const getShape = () => {
    switch (variant) {
      case 'status':
        return {
          borderRadius: '50%',
          transform: 'rotate(45deg)',
        };
      case 'environmental':
        return {
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        };
      case 'special':
        return {
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
        };
      default:
        return {};
    }
  };

  return {
    position: 'absolute',
    width: `${intensity * 10}px`,
    height: `${intensity * 10}px`,
    backgroundColor: getColor(),
    opacity: intensity * 0.2,
    animation: `${float} ${3 + intensity}s infinite ease-in-out`,
    filter: `blur(${intensity}px)`,
    ...getShape(),
  };
});

const WeatherOverlay = styled(Box)<{ type: string }>(({ theme, type }) => {
  const getWeatherEffect = () => {
    switch (type) {
      case 'storm':
        return {
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)',
          animation: `${pulse} 2s infinite`,
        };
      case 'earthquake':
        return {
          background: 'rgba(139,69,19,0.2)',
          animation: `${shimmer} 0.5s infinite linear`,
        };
      case 'mist':
        return {
          background: 'linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.3))',
          animation: `${float} 10s infinite ease-in-out`,
        };
      case 'sunlight':
        return {
          background: 'radial-gradient(circle, rgba(255,215,0,0.2), transparent)',
          animation: `${pulse} 3s infinite`,
        };
      default:
        return {};
    }
  };

  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    ...getWeatherEffect(),
  };
});

interface BattleEffectsProps {
  effects: BattleEffect[];
  comboMeter: number;
}

const BattleEffects: React.FC<BattleEffectsProps> = ({ effects, comboMeter }) => {
  const generateParticles = (effect: BattleEffect) => {
    const particles = [];
    const particleCount = effect.intensity * 5;

    for (let i = 0; i < particleCount; i++) {
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const delay = Math.random() * 2;

      particles.push(
        <EffectParticle
          key={`${effect.name}-${i}`}
          type={effect.name}
          intensity={effect.intensity}
          variant={effect.type}
          style={{
            left: `${left}%`,
            top: `${top}%`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    }

    return particles;
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <EffectContainer>
        {effects.map((effect) => (
          <React.Fragment key={effect.name}>
            {effect.type === 'environmental' && (
              <WeatherOverlay type={effect.name} />
            )}
            {generateParticles(effect)}
          </React.Fragment>
        ))}
        
        {/* Combo Effect */}
        {comboMeter > 50 && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: `${comboMeter}%`,
              height: `${comboMeter}%`,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: 'success.main',
              opacity: 0.3,
              animation: `${pulse} 2s infinite`,
            }}
          />
        )}
      </EffectContainer>

      {/* Effect Labels */}
      <Box sx={{ mt: 2 }}>
        {effects.map((effect) => (
          <Typography
            key={effect.name}
            variant="body2"
            sx={{
              display: 'inline-block',
              mr: 1,
              p: 0.5,
              borderRadius: 1,
              backgroundColor: 'background.paper',
              color: effect.type === 'environmental' ? 'primary.main' : 'text.primary',
              fontWeight: effect.type === 'environmental' ? 'bold' : 'normal',
            }}
          >
            {effect.name} ({effect.duration} turns)
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

export default BattleEffects; 