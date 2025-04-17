import React from 'react';
import { Box, Typography, Button, Grid, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useNavitar } from '../contexts/NavitarContext';

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
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/collection')}
              >
                Start Your Journey
              </Button>
              {selectedNavitar && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/battle')}
                >
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
                <Typography>
                  Store up to 3 special moves in your power meter
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6">Tag Team Combos</Typography>
                <Typography>
                  Combine forces with other Navitars for epic battles
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home; 