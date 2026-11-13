import React from 'react';
import { Box, Grid, Typography, Container } from '@mui/material';
import { NavitarDesign, type NavitarDesignProps } from './NavitarDesign';

// The full 9-navitar roster. The Home page's "Featured Navitars" strip shows the first three;
// the landing funnel's pick-one chooser offers all nine.
export const sampleNavitars: NavitarDesignProps[] = [
  {
    name: 'Frostbite',
    type: 'ice',
    level: 15,
    rarity: 'rare',
    stats: {
      health: 85,
      attack: 70,
      defense: 65,
      speed: 75,
    },
    imageUrl: `${process.env.PUBLIC_URL}/navitars/frostbite.jpg`,
    // Battles-only 3D (Eddie's standing rule, 2026-11-12): her ice
    // dragon GLB renders on the battle stage only (see DEMO_OPPONENTS
    // in NavitarFightClub) — showcase/collection cards are 2D art, so
    // no modelUrl is carried here any more.
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
      speed: 85,
    },
    imageUrl: `${process.env.PUBLIC_URL}/navitars/emberwing.jpg`,
    // Battles-only 3D (Eddie's standing rule, 2026-11-12): her fire
    // dragon GLB renders on the battle stage only (see DEMO_OPPONENTS
    // in NavitarFightClub) — no modelUrl on the card.
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
      speed: 60,
    },
    imageUrl: `${process.env.PUBLIC_URL}/navitars/leafblade.webp`,
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
      speed: 70,
    },
    imageUrl: `${process.env.PUBLIC_URL}/navitars/shadowmaw.jpg`,
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
      speed: 80,
    },
    imageUrl: `${process.env.PUBLIC_URL}/navitars/luminara.jpg`,
    // Battles-only 3D (Eddie's standing rule, 2026-11-12): her
    // golden dragon GLB renders on the battle stage only (see
    // DEMO_OPPONENTS in NavitarFightClub) — no modelUrl on the card.
  },
  {
    name: 'Quantix',
    type: 'quantum',
    level: 22,
    rarity: 'epic',
    stats: {
      health: 80,
      attack: 88,
      defense: 70,
      speed: 90,
    },
    imageUrl: `${process.env.PUBLIC_URL}/navitars/quantix.webp`,
  },
  {
    name: 'Voltwing',
    type: 'electric',
    level: 19,
    rarity: 'epic',
    stats: {
      health: 72,
      attack: 85,
      defense: 60,
      speed: 95,
    },
    imageUrl: `${process.env.PUBLIC_URL}/navitars/voltwing.webp`,
  },
  {
    name: 'Spiritmaw',
    type: 'spiritual',
    level: 24,
    rarity: 'legendary',
    stats: {
      health: 95,
      attack: 80,
      defense: 88,
      speed: 65,
    },
    imageUrl: `${process.env.PUBLIC_URL}/navitars/spiritmaw.webp`,
  },
  {
    name: 'Tidefang',
    type: 'water',
    level: 17,
    rarity: 'rare',
    stats: {
      health: 82,
      attack: 78,
      defense: 75,
      speed: 80,
    },
    imageUrl: `${process.env.PUBLIC_URL}/navitars/tidefang.webp`,
  },
];

// The Home page's "Featured Navitars" strip shows the first three.
export const featuredNavitars: NavitarDesignProps[] = sampleNavitars.slice(0, 3);

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
        {/* Ashwing — the fire phoenix from the bar loop (Darius's navitar,
            fire, Lv 2). Not part of the 9-navitar roster. Its card
            carries stat bars like every other card (fix, live audit
            2026-11-12: Ashwing's was the only card without them). The
            numbers are display defaults in the same spirit as the
            Griffin card below — no canonical roster stats exist for
            Ashwing; in battle it derives from its Lv 2 venue entry,
            on equal footing with Griffin. Battles-only 3D: its GLB
            fights on the battle stage (venue opponents in venues.ts),
            never on this card. */}
        <Grid item xs={12} sm={6} md={4}>
          <NavitarDesign
            name="Ashwing"
            type="fire"
            level={2}
            imageUrl={`${process.env.PUBLIC_URL}/navitars/ashwing.webp`}
            stats={{ health: 80, attack: 80, defense: 65, speed: 85 }}
          />
        </Grid>
        {/* Griffin — the white-blue winged lion from the bar loop (Kai's
            navitar, ice, Lv 2). Not part of the 9-navitar roster. These
            are DEFAULTS, not Eddie's picks: name, type, level 2 (matches
            Ashwing so the two fight on equal footing), rarity rare,
            stats 80/75/70/80 — all changeable on his say-so. It has no
            2D art, so the card keeps the type-coloured gradient;
            battles-only 3D: its GLB fights on the battle stage only. */}
        <Grid item xs={12} sm={6} md={4}>
          <NavitarDesign
            name="Griffin"
            type="ice"
            level={2}
            rarity="rare"
            stats={{ health: 80, attack: 75, defense: 70, speed: 80 }}
          />
        </Grid>
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
