// Guided demo: a scripted, hands-off walkthrough of the loop,
// about 30 seconds, no sign-in and no navitar creation.
//
// STRICTLY LOCAL: everything here lives in component state only.
// This demo never writes to localStorage, never creates or modifies
// a navitar, never banks points or XP, and never calls any
// NavitarFightClub mutator. The win at the end is scripted theatre —
// the "+10 points / level-up / perk unlocked" is what a real win
// would do, shown here as a demo result, not applied anywhere.
//
// The duel reuses the real BattleStage (VS intro, HP bars, lunge /
// flinch, damage numbers) with scripted fighters: the demo
// player's Frostbite vs Maya's Frostpup, both Lv 1 at The Neon
// Marquee. Damage is scripted for a ~30s watch, not the real
// combat math (a real Lv 1 duel trades 9 damage a round and takes
// far longer) — the stage, the art and the venue are the real ones.
import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import BattleStage, { type StageFighter } from './BattleStage';
import { NavitarArtImg } from './NavitarArtImg';
import { DEMO_VENUES } from '../data/venues';

const MARQUEE = DEMO_VENUES[0];
const MAYA = MARQUEE.people[0];
const WIN_PERK = MARQUEE.perks.find(p => p.unlocksOn === 'win');

type Phase = 'idle' | 'checkin' | 'meet' | 'vs' | 'duel' | 'win';

// Scripted hits, in order. Three player hits finish Frostpup;
// Maya's two counters keep the duel honest.
const HITS: { by: 'player' | 'opponent'; value: number; move: string }[] = [
  { by: 'player', value: 35, move: 'Frostbite uses Ice Blast!' },
  { by: 'opponent', value: 12, move: 'Frostpup counters with Frost Nip!' },
  { by: 'player', value: 35, move: 'Frostbite uses Ice Blast!' },
  { by: 'opponent', value: 12, move: 'Frostpup counters with Snow Step!' },
  { by: 'player', value: 40, move: 'Frostbite uses Ice Blast — critical!' },
];

const PLAYER_MAX_HP = 105;
const OPP_MAX_HP = 105;

function hpAfter(step: number, side: 'player' | 'opponent'): number {
  const max = side === 'player' ? PLAYER_MAX_HP : OPP_MAX_HP;
  let hp = max;
  for (let i = 0; i <= step && i < HITS.length; i++) {
    // A hit lands on the OTHER side: subtract it from the side that
    // received it, not the side that dealt it.
    if (HITS[i].by !== side) hp -= HITS[i].value;
  }
  return Math.max(0, hp);
}

const PLAYER_BASE: Omit<StageFighter, 'hp'> = {
  name: 'Frostbite',
  element: 'ice',
  level: 1,
  maxHp: PLAYER_MAX_HP,
  energyGain: 9,
  cooldown: 2,
  imageUrl: `${process.env.PUBLIC_URL}/navitars/frostbite.jpg`,
};

const OPP_BASE: Omit<StageFighter, 'hp'> = {
  name: 'Frostpup',
  element: 'ice',
  level: 1,
  maxHp: OPP_MAX_HP,
  energyGain: 9,
  cooldown: 2,
  imageUrl: MAYA.navitarImage ?? undefined,
};

const ANSWER = MAYA.icebreakerAnswers[0];

export const GuidedDemo: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [meetStep, setMeetStep] = useState(0);
  const [duelStep, setDuelStep] = useState(0);

  const running = phase !== 'idle' && phase !== 'win';

  const start = () => {
    setMeetStep(0);
    setDuelStep(0);
    setPhase('checkin');
  };
  const stop = () => setPhase('idle');

  // The script clock: one timeout per beat, cleaned up on every
  // phase change, stop, or unmount.
  useEffect(() => {
    if (phase === 'idle' || phase === 'win') return;
    let delay = 3000;
    let next: () => void = () => setPhase('idle');
    if (phase === 'checkin') {
      delay = 3500;
      next = () => setPhase('meet');
    } else if (phase === 'meet') {
      delay = 3000;
      next = meetStep < 2 ? () => setMeetStep(s => s + 1) : () => setPhase('vs');
    } else if (phase === 'vs') {
      delay = 2500;
      next = () => setPhase('duel');
    } else if (phase === 'duel') {
      delay = 2600;
      next = duelStep < HITS.length - 1 ? () => setDuelStep(s => s + 1) : () => setPhase('win');
    }
    const timer = window.setTimeout(next, delay);
    return () => window.clearTimeout(timer);
  }, [phase, meetStep, duelStep]);

  const scrollToFunnel = () => {
    document.getElementById('start-funnel')?.scrollIntoView({ behavior: 'smooth' });
  };

  const hit = HITS[Math.min(duelStep, HITS.length - 1)];
  const player: StageFighter = {
    ...PLAYER_BASE,
    hp: phase === 'duel' || phase === 'win' ? hpAfter(duelStep, 'player') : PLAYER_MAX_HP,
  };
  const opponent: StageFighter = {
    ...OPP_BASE,
    hp: phase === 'duel' || phase === 'win' ? hpAfter(duelStep, 'opponent') : OPP_MAX_HP,
  };

  const phaseLabel: Record<Phase, string> = {
    idle: 'Watch the loop — check in, meet Maya, battle Frostpup.',
    checkin: 'Step 1 — Checking in…',
    meet: 'Step 2 — Meeting Maya…',
    vs: 'Step 3 — The challenge is accepted!',
    duel: 'Step 3 — Battle on the bar stage',
    win: 'You won — points banked, level up, perk unlocked.',
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h4" component="h2">
          Watch the loop
        </Typography>
        <Chip label="SCRIPTED DEMO" size="small" color="warning" sx={{ fontWeight: 'bold' }} />
      </Box>
      <Typography variant="body1" color="text.secondary" paragraph sx={{ mt: 1 }}>
        {phaseLabel[phase]} About 30 seconds, hands-off — no sign-in, no navitar needed. Demo
        characters only: nothing you see here is saved, banked, or added to your collection.
      </Typography>

      {phase === 'idle' && (
        <Button variant="contained" size="large" onClick={start}>
          ▶ Watch the loop
        </Button>
      )}

      {running && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Button variant="outlined" size="small" onClick={stop}>
            Stop demo
          </Button>
        </Box>
      )}

      {/* Step 1 — check in at The Neon Marquee. */}
      {(phase === 'checkin' ||
        phase === 'meet' ||
        phase === 'vs' ||
        phase === 'duel' ||
        phase === 'win') && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            📍 Checked in — {MARQUEE.name} {MARQUEE.area}
          </Typography>
          <Typography variant="body1">
            {MARQUEE.tagline} You&apos;re on the map, and your navitar Frostbite stands next to you.
            Demo bar — fictional name, demo perks.
          </Typography>
        </Paper>
      )}

      {/* Step 2 — meet Maya: one scripted icebreaker exchange. */}
      {(phase === 'meet' || phase === 'vs' || phase === 'duel' || phase === 'win') && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <NavitarArtImg
              src={MAYA.navitarImage ?? ''}
              alt="Frostpup, Maya's ice navitar"
              element="ice"
              style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0 }}
            />
            <Typography variant="h6">
              Maya is here — with Frostpup, ice, Lv 1 (demo person)
            </Typography>
          </Box>
          <Typography variant="body1" paragraph>
            Maya: &ldquo;{MAYA.icebreakerQuestion}&rdquo;
          </Typography>
          {meetStep >= 1 && (
            <Typography variant="body1" paragraph>
              You: &ldquo;{ANSWER.label}&rdquo;
            </Typography>
          )}
          {meetStep >= 2 && (
            <Typography variant="body1">Maya: &ldquo;{ANSWER.reply}&rdquo;</Typography>
          )}
          {meetStep >= 2 && phase === 'meet' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Ice broken. Now — challenge her?
            </Typography>
          )}
        </Paper>
      )}

      {/* Step 3 — the visible duel on the bar stage. */}
      {(phase === 'vs' || phase === 'duel' || phase === 'win') && (
        <Box key={phase === 'duel' ? `duel-${duelStep}` : phase} sx={{ mb: 2 }}>
          <BattleStage
            player={player}
            opponent={opponent}
            venueName={MARQUEE.name}
            venueElement={MARQUEE.element}
            vsActive={phase === 'vs'}
            onVsDismiss={() => setPhase('duel')}
            playerAnim={phase === 'duel' ? (hit.by === 'player' ? 'lunge' : 'shake') : ''}
            opponentAnim={phase === 'duel' ? (hit.by === 'opponent' ? 'lunge' : 'shake') : ''}
            damagePop={
              phase === 'duel'
                ? {
                    key: duelStep,
                    value: hit.value,
                    target: hit.by === 'player' ? 'opponent' : 'player',
                  }
                : null
            }
            winner={phase === 'win' ? 'player' : null}
          />
          {phase === 'duel' && (
            <Typography variant="body1" align="center" sx={{ mt: 1 }}>
              {hit.move} (-{hit.value})
            </Typography>
          )}
        </Box>
      )}

      {/* Win — points banked, level-up, perk unlocks (scripted result). */}
      {phase === 'win' && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🏆 You won the duel!
          </Typography>
          <Typography variant="body1" paragraph>
            +10 points banked · Frostbite levels up, Lv 1 → Lv 2 · Venue perk unlocked:{' '}
            {WIN_PERK?.text ?? 'Free appetizer if you win a battle here'}.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Scripted demo result — nothing was banked and no navitar was created. Play for real
            below and these rewards are yours to earn.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={start}>
              ↻ Replay
            </Button>
            <Button variant="contained" onClick={scrollToFunnel}>
              Now try it yourself
            </Button>
          </Box>
        </Paper>
      )}
    </Paper>
  );
};
