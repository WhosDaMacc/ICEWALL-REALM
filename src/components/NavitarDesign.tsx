import React from 'react';
import { Box, Typography, Grid, Paper, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';

interface NavitarDesignProps {
  type: 'ice' | 'fire' | 'nature' | 'shadow' | 'light';
  name: string;
  level: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  stats: {
    health: number;
    attack: number;
    defense: number;
    speed: number;
  };
}

const NavitarCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius * 2,
  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
  boxShadow: theme.shadows[4],
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
  }
}));

const StatBar = styled(Box)(({ theme }) => ({
  height: '8px',
  borderRadius: '4px',
  background: theme.palette.grey[200],
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: theme.palette.primary.main,
    borderRadius: '4px',
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

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'legendary': return '#FFD700';
    case 'epic': return '#9C27B0';
    case 'rare': return '#2196F3';
    default: return '#4CAF50';
  }
};

export const NavitarDesign: React.FC<NavitarDesignProps> = ({
  type,
  name,
  level,
  rarity,
  stats
}) => {
  return (
    <NavitarCard>
      <Box sx={{ position: 'relative', mb: 2 }}>
        {/* Navitar Image Placeholder */}
        <Box
          sx={{
            width: '100%',
            height: '200px',
            background: `linear-gradient(135deg, ${getTypeColor(type)}40, ${getTypeColor(type)}20)`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative Elements */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${getTypeColor(type)}20, transparent)`,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { transform: 'translate(-50%, -50%) scale(1)' },
                '50%': { transform: 'translate(-50%, -50%) scale(1.2)' },
                '100%': { transform: 'translate(-50%, -50%) scale(1)' }
              }
            }}
          />
        </Box>

        {/* Level Badge */}
        <Chip
          label={`Lv. ${level}`}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(0,0,0,0.6)',
            color: 'white',
            fontWeight: 'bold'
          }}
        />

        {/* Rarity Badge */}
        <Chip
          label={rarity.toUpperCase()}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            bgcolor: getRarityColor(rarity),
            color: 'white',
            fontWeight: 'bold'
          }}
        />
      </Box>

      <Typography variant="h6" gutterBottom>
        {name}
      </Typography>

      <Chip
        label={type.toUpperCase()}
        size="small"
        sx={{
          bgcolor: getTypeColor(type),
          color: 'white',
          mb: 2
        }}
      />

      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ width: '60px' }}>HP</Typography>
            <StatBar sx={{ flex: 1, '&::after': { width: `${(stats.health / 100) * 100}%` } }} />
            <Typography variant="body2">{stats.health}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ width: '60px' }}>ATK</Typography>
            <StatBar sx={{ flex: 1, '&::after': { width: `${(stats.attack / 100) * 100}%` } }} />
            <Typography variant="body2">{stats.attack}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ width: '60px' }}>DEF</Typography>
            <StatBar sx={{ flex: 1, '&::after': { width: `${(stats.defense / 100) * 100}%` } }} />
            <Typography variant="body2">{stats.defense}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ width: '60px' }}>SPD</Typography>
            <StatBar sx={{ flex: 1, '&::after': { width: `${(stats.speed / 100) * 100}%` } }} />
            <Typography variant="body2">{stats.speed}</Typography>
          </Box>
        </Grid>
      </Grid>
    </NavitarCard>
  );
}; 