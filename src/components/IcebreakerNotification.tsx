// Icebreaker notification — a card delivered by the player's OWN
// active navitar ("Frostbite has an icebreaker for you") when someone
// open, visible, and not-yet-met is standing at the checked-in venue.
//
// CONDUCT RULE (Eddie, 2026-11-13 — standing design law): the navitar
// represents its person like a PR agent. Every line it speaks —
// cards, match openers, declines, deflections — is polite, warm, and
// professional: never rude, never snarky, never anything uncalled
// for, including when declining. If a line has an edge, soften it.
// Scripted, like every intro in the demo: "Say hi" hands off to the
// Realm Map meet card, where picking an answer runs the existing
// icebreaker flow (friend + seeded thread). Rendered once, at the app
// level (App.tsx), driven entirely by PresenceContext — which is also
// what suppresses it for 'battle'/'quiet' statuses.
import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';
import { usePresence } from '../contexts/PresenceContext';
import { elementEmoji, resolveNavitarArt } from '../utils/navitarArt';
import { NavitarArtImg } from './NavitarArtImg';

const IcebreakerNotification: React.FC = () => {
  const { icebreakerOffer, sayHiIcebreaker, dismissIcebreaker } = usePresence();
  const { userNavitar } = useNavitarFightClub();

  if (!icebreakerOffer || !userNavitar) return null;
  const { person, venue, reason, opener } = icebreakerOffer;
  const art = resolveNavitarArt(userNavitar.imageUrl, userNavitar.name);
  // The headline names the match context when there is one — the
  // strongest reason this person is worth meeting (Part 5).
  const headline =
    reason?.kind === 'business'
      ? `${userNavitar.name} spotted a business match`
      : reason?.kind === 'interest'
        ? `${userNavitar.name} spotted a shared interest`
        : reason?.kind === 'dating'
          ? `${userNavitar.name} spotted a possible dating intro`
          : `${userNavitar.name} has an icebreaker for you`;

  return (
    <Paper
      data-testid="icebreaker-notification"
      elevation={8}
      sx={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 1300,
        maxWidth: 360,
        width: 'calc(100vw - 32px)',
        p: 2,
        borderRadius: 4,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        {art ? (
          <NavitarArtImg
            src={art}
            alt={`${userNavitar.name} art`}
            element={userNavitar.element}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              flexShrink: 0,
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0,
              bgcolor: 'rgba(33,150,243,0.15)',
            }}
          >
            {elementEmoji(userNavitar.element)}
          </Box>
        )}
        <Typography variant="subtitle1" data-testid="icebreaker-headline">
          {headline}
        </Typography>
      </Box>
      {reason ? (
        <Typography
          variant="body2"
          data-testid="icebreaker-match-reason"
          data-match-kind={reason.kind}
          paragraph
        >
          {reason.detail}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" paragraph>
          {person.name} is here at {venue.name} and open to meeting people:
        </Typography>
      )}
      <Typography variant="body1" gutterBottom>
        “{opener}”
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
        <Button variant="contained" data-testid="icebreaker-say-hi" onClick={sayHiIcebreaker}>
          Say hi
        </Button>
        <Button variant="outlined" data-testid="icebreaker-dismiss" onClick={dismissIcebreaker}>
          Not now
        </Button>
      </Box>
    </Paper>
  );
};

export default IcebreakerNotification;
