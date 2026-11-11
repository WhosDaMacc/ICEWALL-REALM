import React, { useState } from 'react';
import { Box, Button, ButtonGroup, Typography, Grid, Paper, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { NavitarArtImg } from './NavitarArtImg';
import { ModelViewer } from './ModelViewer';

export interface NavitarDesignProps {
  type:
    'ice' | 'fire' | 'nature' | 'shadow' | 'light' | 'quantum' | 'electric' | 'spiritual' | 'water';
  name: string;
  level: number;
  // Optional: some navitars have no roster data yet (Ashwing is a bar-loop
  // fighter with a known level and type but no rarity or stats anywhere).
  // The chip and stat bars are hidden when absent — nothing is invented.
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  stats?: {
    health: number;
    attack: number;
    defense: number;
    speed: number;
  };
  // Art image served from public/navitars/. When absent the card keeps the
  // type-coloured gradient as the visual (the 5 original navitars have no
  // art yet — nothing is invented for them).
  imageUrl?: string;
  // GLB served from public/models/. When present the card gets a 2D / 3D
  // toggle over the art slot; the 3D view degrades to the 2D art if the
  // renderer cannot mount (see ModelViewer).
  modelUrl?: string;
  // Closer framing for the 3D model (1 = default; the phoenix's wide
  // wingspan needs 1.5 to read at a good size in the card).
  modelZoom?: number;
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
  },
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
  },
}));

const getTypeColor = (type: string) => {
  switch (type) {
    case 'ice':
      return '#81D4FA';
    case 'fire':
      return '#FF5722';
    case 'nature':
      return '#4CAF50';
    case 'shadow':
      return '#9C27B0';
    case 'light':
      return '#FFC107';
    case 'quantum':
      return '#B388FF';
    case 'electric':
      return '#FFEA00';
    case 'spiritual':
      return '#80DEEA';
    case 'water':
      return '#2196F3';
    default:
      return '#2196F3';
  }
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'legendary':
      return '#FFD700';
    case 'epic':
      return '#9C27B0';
    case 'rare':
      return '#2196F3';
    default:
      return '#4CAF50';
  }
};

export const NavitarDesign: React.FC<NavitarDesignProps> = ({
  type,
  name,
  level,
  rarity,
  stats,
  imageUrl,
  modelUrl,
  modelZoom = 1,
}) => {
  const [show3d, setShow3d] = useState(false);

  return (
    <NavitarCard>
      {modelUrl && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <ButtonGroup size="small" aria-label={`${name} view toggle`}>
            <Button
              variant={show3d ? 'outlined' : 'contained'}
              aria-label={`Show 2D art of ${name}`}
              aria-pressed={!show3d}
              onClick={() => setShow3d(false)}
            >
              2D
            </Button>
            <Button
              variant={show3d ? 'contained' : 'outlined'}
              aria-label={`Show 3D model of ${name}`}
              aria-pressed={show3d}
              onClick={() => setShow3d(true)}
            >
              3D
            </Button>
          </ButtonGroup>
        </Box>
      )}

      <Box sx={{ position: 'relative', mb: 2 }}>
        {/* Navitar visual — the 3D model when the toggle is on, otherwise
            the art image when one exists, otherwise the type-coloured
            gradient with the pulsing glow. */}
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
            overflow: 'hidden',
          }}
        >
          {show3d && modelUrl ? (
            <ModelViewer
              modelUrl={modelUrl}
              zoom={modelZoom}
              fallbackSrc={imageUrl}
              fallbackAlt={`${name} — 3D preview`}
              element={type}
              height="100%"
            />
          ) : imageUrl ? (
            <NavitarArtImg
              src={imageUrl}
              alt={name}
              element={type}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
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
                  '100%': { transform: 'translate(-50%, -50%) scale(1)' },
                },
              }}
            />
          )}
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
            fontWeight: 'bold',
          }}
        />

        {/* Rarity Badge — hidden when the navitar has no rarity yet */}
        {rarity && (
          <Chip
            label={rarity.toUpperCase()}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: getRarityColor(rarity),
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        )}
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
          mb: 2,
        }}
      />

      {stats && (
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ width: '60px' }}>
                HP
              </Typography>
              <StatBar sx={{ flex: 1, '&::after': { width: `${(stats.health / 100) * 100}%` } }} />
              <Typography variant="body2">{stats.health}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ width: '60px' }}>
                ATK
              </Typography>
              <StatBar sx={{ flex: 1, '&::after': { width: `${(stats.attack / 100) * 100}%` } }} />
              <Typography variant="body2">{stats.attack}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ width: '60px' }}>
                DEF
              </Typography>
              <StatBar sx={{ flex: 1, '&::after': { width: `${(stats.defense / 100) * 100}%` } }} />
              <Typography variant="body2">{stats.defense}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ width: '60px' }}>
                SPD
              </Typography>
              <StatBar sx={{ flex: 1, '&::after': { width: `${(stats.speed / 100) * 100}%` } }} />
              <Typography variant="body2">{stats.speed}</Typography>
            </Box>
          </Grid>
        </Grid>
      )}
    </NavitarCard>
  );
};
