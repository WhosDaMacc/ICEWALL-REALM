// The demo explainer + partner sections for the landing page.
//
// Static copy only — no game state, no network, no localStorage.
// Every venue, person and perk on this page is DEMO: fictional bar
// names, scripted people, demo perks. Real venues and real perks need
// partnerships; nothing here invents a real business, a real offer,
// a player count, or revenue we do not have.
import React from 'react';
import { Box, Chip, Grid, Paper, Typography } from '@mui/material';
import { NavitarArtImg } from './NavitarArtImg';
import { DEMO_VENUES } from '../data/venues';
import { elementColor } from '../utils/navitarArt';

// The Neon Marquee is the demo's home venue; Maya / Frostpup are its
// first (Lv 1) scripted person — the same data the Realm Map uses.
const MARQUEE = DEMO_VENUES[0];
const MAYA = MARQUEE.people[0];
const WIN_PERK = MARQUEE.perks.find(p => p.unlocksOn === 'win');

const DEMO_CHIP = <Chip label="DEMO" size="small" color="warning" sx={{ fontWeight: 'bold' }} />;

export const ExplainerSection: React.FC = () => (
  <Paper sx={{ p: 3, mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="h4" component="h2">
        Check in at a real place. Meet a real person. And make a friend.
      </Typography>
      {DEMO_CHIP}
    </Box>
    <Typography variant="h6" color="text.secondary" paragraph sx={{ mt: 1 }}>
      Icewall Realm is a game you play in the real world. Your navitar walks beside you — and when
      you check in somewhere, the people there can meet you, and battle you, if you choose.
    </Typography>

    {/* The 3-step loop, each step with real art from the game. */}
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} md={4}>
        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            1. Check in
          </Typography>
          <NavitarArtImg
            src={MAYA.navitarImage ?? ''}
            alt="Frostpup, Maya's ice navitar"
            element="ice"
            style={{ width: '100%', height: 140, borderRadius: 8 }}
          />
          <Typography variant="body1" sx={{ mt: 1 }}>
            Walk into a place that&apos;s part of the game. A bar, a park, a beach. Checking in puts
            you on the map, and your navitar stands next to you.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {MARQUEE.name}, {MARQUEE.area} — demo bar {DEMO_CHIP}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            2. Meet
          </Typography>
          <NavitarArtImg
            src={MAYA.navitarImage ?? ''}
            alt="Frostpup, Maya's ice navitar"
            element="ice"
            style={{ width: '100%', height: 140, borderRadius: 8 }}
          />
          <Typography variant="body1" sx={{ mt: 1 }}>
            The app shows you who&apos;s there. Say hello with an icebreaker — a real question, a
            real answer, a real person. Or just message them.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Maya (demo person) asks: &ldquo;{MAYA.icebreakerQuestion}&rdquo;
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            3. Battle — only if you choose
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <NavitarArtImg
              src={`${process.env.PUBLIC_URL}/navitars/frostbite.jpg`}
              alt="Frostbite, ice navitar"
              element="ice"
              style={{ width: '50%', height: 140, borderRadius: 8 }}
            />
            <NavitarArtImg
              src={MAYA.navitarImage ?? ''}
              alt="Frostpup, Maya's ice navitar"
              element="ice"
              style={{ width: '50%', height: 140, borderRadius: 8 }}
            />
          </Box>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Challenge them to a duel and your navitars face off on a visible stage, right there in
            the venue. Win and you bank points, level up, and unlock that venue&apos;s perk.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Demo win perk: {WIN_PERK?.text ?? 'Free appetizer if you win a battle here'}
          </Typography>
        </Paper>
      </Grid>
    </Grid>

    {/* Eddie's scenario, in his own words. */}
    <Box
      sx={{
        mt: 3,
        p: 2,
        borderLeft: `4px solid ${elementColor('ice')}`,
        bgcolor: 'action.hover',
        borderRadius: 1,
      }}
    >
      <Typography variant="body1" fontStyle="italic">
        &ldquo;I wanna be able to walk into a bar that has perks, meet a person there, and have a
        little battle with them if I choose to.&rdquo;
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        — Eddie, on the game in one sentence
      </Typography>
    </Box>

    {/* What your navitar is. */}
    <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
      What your navitar is
    </Typography>
    <Typography variant="body1" paragraph>
      A companion that fights beside you. It levels up from winning, trains, learns custom attacks —
      five of them, names and power you choose — collects potions at refill stations, and faces wild
      navitars that appear on the map.
    </Typography>
    <Typography variant="body1" paragraph>
      Joe — the announcer and judge — calls the fights and runs the Impossible Challenger: a
      3-question knowledge duel, take 2 of 3.
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Every venue, person and perk in this demo is labelled DEMO — fictional bar names and scripted
      people. Real players can sign in today and challenge each other by display name; real venues
      and real perks need partnerships.
    </Typography>
  </Paper>
);

// Partner section, tailored to IPX Exchange ONLY — there is no second
// company. Facts below are from the draft (checked 2026-11-11, plus IPX's
// Oct 28–29, 2026 announcements checked 2026-11-12). Never promises a
// token, fundraising, minting, or revenue. The profit-share model and
// the token are labelled plainly as a design / unminted concept, not live.
export const PartnerSection: React.FC = () => (
  <Paper sx={{ p: 3, mb: 3 }}>
    <Typography variant="h4" component="h2" gutterBottom>
      Built for real places.
    </Typography>
    <Typography variant="h6" color="text.secondary" paragraph>
      For IPX Exchange — a place where this game could become IP fans can own a piece of.
    </Typography>

    <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
      What Icewall Realm brings IPX
    </Typography>
    <Typography variant="body1" paragraph>
      A complete, playable game — not a pitch deck. The loop is real: check in at a real place, meet
      a real person, battle if you choose. The map is real, accounts are real, and the multiplayer
      foundation is real.
    </Typography>
    <Typography variant="body1" paragraph>
      IP with a community built in: players show up at real places, meet real people, and battle. A
      project token for the realm would be tied to something fans already do — not something
      promised.
    </Typography>

    <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
      Why the timing fits
    </Typography>
    <Typography variant="body1" paragraph>
      On October 29, 2026, IPX detailed its KPI-Gated Escrow: crowdfunding and sponsorship money for
      video games, released as agreed milestones are met — planned for use with its November 15,
      2026 launch. That is the shape this game is already built in: a playable loop first, with
      milestones that can be shown, not just promised. IPX&apos;s Bridge fiat on/off-ramps are
      scheduled to go live with the same launch, so real-world venue and sponsor money has a path in
      and out.
    </Typography>

    <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
      A profit-share design, on paper
    </Typography>
    <Typography variant="body1" paragraph>
      The GLACER 20% model: 20% of net profit split across active users and verified businesses —
      the same shape as IPX&apos;s revenue-based rewards. This is a{' '}
      <strong>design, not live</strong>. The token (GLCR concept) is <strong>unminted</strong> — no
      token exists, and none is promised.
    </Typography>

    <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
      The ask
    </Typography>
    <Typography variant="body1" paragraph>
      Talk about tokenizing the game&apos;s IP on IPX&apos;s launchpad when the game has real
      players. No minting, no fundraising, no promises until then.
    </Typography>

    <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
      Who IPX is
    </Typography>
    <Typography variant="body1" paragraph>
      IPX Exchange is based in Miami and built on Base. Founder and CEO Brendan McCafferty. Website:
      ipx.exchange. It raised a $4M seed round at a $125M valuation, announced October 15, 2026, led
      by Bitsurge Holdings. It is an agentic OS for IP, plus a tokenization launchpad and an
      exchange: creators tokenize their IP without transferring ownership, and fans buy project
      tokens for perks, access, and revenue-based rewards. Launch is planned for November 15, 2026 —
      it has not launched yet.
    </Typography>
    <Typography variant="body2" color="text.secondary">
      The game today is demo venues and demo people, with real accounts and a real multiplayer
      foundation. Real venues and real perks need partnerships — that is what this page is for.
    </Typography>
  </Paper>
);
