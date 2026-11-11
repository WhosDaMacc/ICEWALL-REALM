import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useNavitar } from '../contexts/NavitarContext';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';
import { useVenue } from '../contexts/VenueContext';
import { useUser } from '../contexts/UserContext';
import { ALL_NAVITAR_LOOKS, resolveNavitarArt } from '../utils/navitarArt';
import { NavitarArtImg } from '../components/NavitarArtImg';
import { LookPickerDialog } from '../components/LookPickerDialog';
import { NavitarChat } from '../components/NavitarChat';
import { isLiveAiEnabled, setLiveAiEnabled, liveAiStatus } from '../utils/liveAi';

// Profile page — shows the signed-in player's profile (when a wallet is
// connected and a profile loads) and the player's Navitar.
// The navitar created in Battle lives in NavitarFightClubContext, so this
// page reads THAT store — not NavitarContext, whose `navitars` list is
// never populated by any flow and always read as 0 ("Your Navitars (0)"
// even right after creating one in Battle). That was the bug.
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { selectedNavitar } = useNavitar();
  const { userNavitar, points, updateUserNavitarLook } = useNavitarFightClub();
  const { checkedInVenueId } = useVenue();
  const { profile, isLoading } = useUser();
  // Change look for the existing navitar — the picker used to live
  // only in the create dialog, so a player who already had a navitar
  // could never reach it. A tap applies the look immediately.
  const [isChangeLookOpen, setIsChangeLookOpen] = useState(false);
  // Live AI (DeepSeek) — OFF by default until go-live. While off, the
  // navitar answers from its scripted lines and no AI service is called,
  // so there are no charges. Persists in localStorage (icewall-live-ai).
  const [liveAi, setLiveAi] = useState<boolean>(() => isLiveAiEnabled());
  const handleLiveAiToggle = (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setLiveAiEnabled(checked);
    setLiveAi(checked);
  };
  // The navitar's art: its own picked look first, then the name map,
  // then nothing (the emoji fallback only lives on the stage/map).
  const userArt = userNavitar ? resolveNavitarArt(userNavitar.imageUrl, userNavitar.name) : null;

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
              Connect your wallet to load your Ice Wall profile. Until then, your Navitars are
              stored in this browser.
            </Typography>
          </>
        )}
      </Paper>

      <Typography variant="h5" gutterBottom>
        Battle points: {points}
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Points won in duels — a win banks its points, a loss costs nothing.
          {checkedInVenueId
            ? ' You are checked in at a venue; your companion is there with you.'
            : ' Check in at a bar, park or beach on the Realm Map to meet people and battle.'}
        </Typography>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Selected Navitar
      </Typography>
      {userNavitar ? (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            {userArt && (
              <NavitarArtImg
                src={userArt}
                alt={`${userNavitar.name} art`}
                element={userNavitar.element}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  border: '3px solid #2196f3',
                  flexShrink: 0,
                }}
              />
            )}
            <Box>
              <Typography variant="h6">
                {userNavitar.name} <Chip label={userNavitar.element} color="primary" size="small" />
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Level {userNavitar.level} · HP {userNavitar.hp}/{userNavitar.maxHp}
              </Typography>
            </Box>
          </Box>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Skills
          </Typography>
          {userNavitar.skills.map(skill => (
            <Chip key={skill} label={skill} sx={{ mr: 1, mb: 1 }} />
          ))}
          <Typography variant="body2" color="text.secondary">
            Fast move: {userNavitar.fastMove.name} — {userNavitar.fastMove.damage} dmg
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" size="small" onClick={() => setIsChangeLookOpen(true)}>
              Change look
            </Button>
          </Box>
        </Paper>
      ) : selectedNavitar ? (
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
        Your Navitars ({userNavitar ? 1 : 0})
      </Typography>
      {userNavitar ? (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              {userArt && (
                <NavitarArtImg
                  src={userArt}
                  alt={`${userNavitar.name} art`}
                  element={userNavitar.element}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: '2px solid #2196f3',
                    flexShrink: 0,
                  }}
                />
              )}
              <Box>
                <Typography variant="subtitle1">
                  {userNavitar.name} <Chip label={userNavitar.element} size="small" />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Level {userNavitar.level} · HP {userNavitar.hp}/{userNavitar.maxHp}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Typography color="text.secondary">
          You have no Navitars yet. Create one in a battle or from your collection.
        </Typography>
      )}

      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={liveAi}
              onChange={handleLiveAiToggle}
              inputProps={{ 'aria-label': 'Live AI (DeepSeek)' }}
            />
          }
          label="Live AI (DeepSeek) — off until go-live"
        />
        <Typography variant="body2" color="text.secondary">
          {liveAi
            ? liveAiStatus() === 'ready'
              ? 'On — your navitar answers through DeepSeek.'
              : 'On, but no DeepSeek key is configured in this build — your navitar still answers from its scripted lines.'
            : 'Off — your navitar answers from its scripted lines and no AI service is called, so there are no charges.'}
        </Typography>
      </Paper>

      <NavitarChat
        navitar={userNavitar ? { name: userNavitar.name, element: userNavitar.element } : null}
        liveAiEnabled={liveAi}
      />

      {/* Change look — same 18 looks as the create dialog. A tap
          applies it immediately; the context persists it, so the stage,
          this page and the companion use it at once. */}
      <LookPickerDialog
        open={isChangeLookOpen}
        onClose={() => setIsChangeLookOpen(false)}
        selected={
          (userNavitar && resolveNavitarArt(userNavitar.imageUrl, userNavitar.name)) ??
          ALL_NAVITAR_LOOKS[0].src
        }
        onSelect={src => {
          updateUserNavitarLook(src);
          setIsChangeLookOpen(false);
        }}
      />
    </Box>
  );
};

export default Profile;
