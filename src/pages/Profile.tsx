import React from 'react';
import { Box, Typography, Paper, Grid, Chip, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useNavitar } from '../contexts/NavitarContext';
import { useUser } from '../contexts/UserContext';

// Profile page — shows the signed-in player's profile (when a wallet is
// connected and a profile loads) and the currently selected Navitar.
// No profile exists yet without a wallet connection, so the page states
// that plainly instead of inventing one.
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { selectedNavitar, navitars } = useNavitar();
  const { profile, isLoading } = useUser();

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Your Profile
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        {isLoading ? (
          <Typography>Loading profile…</Typography>
        ) : profile ? (
          <>
            <Typography variant="h6">{profile.username}</Typography>
            <Typography variant="body2" color="text.secondary">
              {profile.email} · Reputation {profile.reputation}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Wallet: {profile.walletAddress}
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6">No profile loaded</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Connect your wallet to load your Ice Wall profile. Until then, your Navitars live in
              this browser session only.
            </Typography>
          </>
        )}
      </Paper>

      <Typography variant="h5" gutterBottom>
        Selected Navitar
      </Typography>
      {selectedNavitar ? (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6">
            {selectedNavitar.name}{' '}
            <Chip label={selectedNavitar.type} color="primary" size="small" />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Level {selectedNavitar.level} · Health {selectedNavitar.health} · Energy{' '}
            {selectedNavitar.energy}
          </Typography>
          <Typography variant="body2" paragraph>
            {selectedNavitar.personality}
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Moves
          </Typography>
          {selectedNavitar.moves.map(move => (
            <Chip
              key={move.name}
              label={`${move.name} — ${move.damage} dmg`}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Paper>
      ) : (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography paragraph>No Navitar selected yet.</Typography>
          <Button variant="contained" onClick={() => navigate('/collection')}>
            Choose from your collection
          </Button>
        </Paper>
      )}

      <Typography variant="h5" gutterBottom>
        Your Navitars ({navitars.length})
      </Typography>
      {navitars.length === 0 ? (
        <Typography color="text.secondary">
          You have no Navitars yet. Create one in a battle or from your collection.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {navitars.map(navitar => (
            <Grid item xs={12} sm={6} md={4} key={navitar.id}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1">
                  {navitar.name} <Chip label={navitar.type} size="small" />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Level {navitar.level} · Health {navitar.health}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Profile;
