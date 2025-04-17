import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Chip,
} from '@mui/material';

interface NavitarStatsProps {
  navitar: {
    name: string;
    ability: string;
    powerLevel: number;
    description: string;
  };
}

const NavitarStats: React.FC<NavitarStatsProps> = ({ navitar }) => {
  const getPowerColor = (level: number) => {
    if (level >= 8) return '#FF0000';
    if (level >= 6) return '#FFA500';
    if (level >= 4) return '#FFFF00';
    return '#00FF00';
  };

  return (
    <Card sx={{ maxWidth: 400, m: 2 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          {navitar.name}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Power Level
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(navitar.powerLevel / 10) * 100}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getPowerColor(navitar.powerLevel),
              },
            }}
          />
          <Typography variant="body2" color="text.secondary" align="right">
            {navitar.powerLevel}/10
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Special Ability
            </Typography>
            <Chip
              label={navitar.ability}
              color="primary"
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {navitar.description}
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Combat Stats
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="body2">
                Attack: {Math.floor(navitar.powerLevel * 1.5)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                Defense: {Math.floor(navitar.powerLevel * 1.2)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                Speed: {Math.floor(navitar.powerLevel * 1.3)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                Energy: {Math.floor(navitar.powerLevel * 1.4)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default NavitarStats; 