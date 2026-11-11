import React from 'react';
import { Box, Typography, Button, Grid, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useNavitar } from '../contexts/NavitarContext';
import { NavitarDesign } from '../components/NavitarDesign';
import { featuredNavitars } from '../components/NavitarShowcase';
import { ModelViewer } from '../components/ModelViewer';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { selectedNavitar } = useNavitar();

  return (
    <Box sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              background: 'linear-gradient(45deg, #1a237e 30%, #0d47a1 90%)',
            }}
          >
            <Typography variant="h3" component="h1" gutterBottom>
              Welcome to Icewall Realm
            </Typography>
            <Typography variant="h6" paragraph>
              Enter a world of epic battles, powerful Navitars, and endless adventures.
            </Typography>
            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
              <Button variant="contained" size="large" onClick={() => navigate('/collection')}>
                Start Your Journey
              </Button>
              {selectedNavitar && (
                <Button variant="outlined" size="large" onClick={() => navigate('/battle')}>
                  Enter Battle
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 4,
              height: '100%',
              background: 'linear-gradient(45deg, #311b92 30%, #4527a0 90%)',
            }}
          >
            <Typography variant="h4" gutterBottom>
              Latest Features
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>
                • New Tag Team Battle System
              </Typography>
              <Typography component="li" paragraph>
                • Enhanced Power Meter
              </Typography>
              <Typography component="li" paragraph>
                • Special Move Storage
              </Typography>
              <Typography component="li" paragraph>
                • Dynamic Battle Effects
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Featured Navitars — the section the Home page was missing: the
            code never rendered one (no "Featured" string existed anywhere
            in src/), so the page ended at the footer. Shows the first three
            showcase navitars with their art; the full nine live on
            /collection. */}
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Featured Navitars
          </Typography>
          <Grid container spacing={2}>
            {featuredNavitars.map(navitar => (
              <Grid item xs={12} sm={6} md={4} key={navitar.name}>
                <NavitarDesign {...navitar} />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/collection')}>
              See all Navitars
            </Button>
          </Box>
        </Grid>

        {/* 3D Gallery — fresh from Tripo. The griffin is a preview only:
            it is not a roster navitar (no level, rarity, stats or type
            assigned) and its name and type are still Eddie's to pick.
            The phoenix is Ashwing in 3D. If the 3D renderer cannot mount
            (e.g. no WebGL), each card shows its 2D art instead. */}
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            3D Gallery
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Fresh from Tripo — drag to spin, scroll to zoom.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Ice Griffin
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  New 3D model — preview. Name and type still to be picked.
                </Typography>
                <ModelViewer
                  modelUrl={`${process.env.PUBLIC_URL}/models/ice-griffin.glb`}
                  fallbackAlt="Ice Griffin — 3D preview"
                  height={260}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  ↻ Drag to spin · scroll to zoom
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Fire Phoenix — Ashwing
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Ashwing, the fire phoenix, in 3D.
                </Typography>
                <ModelViewer
                  modelUrl={`${process.env.PUBLIC_URL}/models/fire-phoenix.glb`}
                  fallbackSrc={`${process.env.PUBLIC_URL}/navitars/ashwing.webp`}
                  fallbackAlt="Ashwing — 3D preview"
                  element="fire"
                  height={260}
                  zoom={1.5}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  ↻ Drag to spin · scroll to zoom
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 4,
              background: 'linear-gradient(45deg, #1b5e20 30%, #2e7d32 90%)',
            }}
          >
            <Typography variant="h4" gutterBottom>
              Battle System Updates
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6">Power Generation</Typography>
                <Typography>
                  Multiple ways to build your power meter through various activities
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6">Special Moves</Typography>
                <Typography>Store up to 3 special moves in your power meter</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6">Tag Team Combos</Typography>
                <Typography>Combine forces with other Navitars for epic battles</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home;
