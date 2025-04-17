import React from 'react';
import { Box, Grid, Typography, Container } from '@mui/material';
import { NavitarDesign } from './NavitarDesign';

const sampleNavitars = [
  {
    name: 'Frostbite',
    type: 'ice',
    level: 15,
    rarity: 'rare',
    stats: {
      health: 85,
      attack: 70,
      defense: 65,
      speed: 75
    }
  },
  {
    name: 'Emberwing',
    type: 'fire',
    level: 20,
    rarity: 'epic',
    stats: {
      health: 75,
      attack: 90,
      defense: 60,
      speed: 85
    }
  },
  {
    name: 'Leafblade',
    type: 'nature',
    level: 12,
    rarity: 'common',
    stats: {
      health: 70,
      attack: 65,
      defense: 70,
      speed: 60
    }
  },
  {
    name: 'Shadowmaw',
    type: 'shadow',
    level: 25,
    rarity: 'legendary',
    stats: {
      health: 90,
      attack: 95,
      defense: 80,
      speed: 70
    }
  },
  {
    name: 'Luminara',
    type: 'light',
    level: 18,
    rarity: 'epic',
    stats: {
      health: 80,
      attack: 75,
      defense: 85,
      speed: 80
    }
  }
];

export const NavitarShowcase: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Navitar Designs
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Discover unique creatures with special abilities and characteristics
      </Typography>
      
      <Grid container spacing={3}>
        {sampleNavitars.map((navitar, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <NavitarDesign {...navitar} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Design Features
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • Unique elemental types with distinct visual styles
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • Rarity system with special visual indicators
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • Dynamic stat bars with visual feedback
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • Animated effects based on type and rarity
        </Typography>
      </Box>
    </Container>
  );
}; 