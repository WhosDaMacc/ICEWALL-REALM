import React from 'react';
import { Box, Typography, Button, Paper, LinearProgress } from '@mui/material';
import { styled } from '@mui/material/styles';

interface Move {
  name: string;
  type:
    'ice' | 'fire' | 'nature' | 'shadow' | 'light' | 'quantum' | 'electric' | 'spiritual' | 'water';
  damage: number;
  energyGain?: number;
  energyCost?: number;
  cooldown: number;
  description: string;
  // Type-chart multiplier against the opponent actually faced. The
  // card renders the ADJUSTED damage (what will land), not the raw
  // base — the audit caught Power Strike listing 62 and dealing 31.
  effectiveness?: number;
}

interface BattleMovesProps {
  moves: Move[];
  onMoveSelect: (move: Move) => void;
  // The player's LIVE duel energy (0–100) — the meter above the moves.
  // (This prop used to receive the fast move's energyGain and was
  // never rendered at all, which is why energy was invisible.)
  currentEnergy: number;
  isPlayerTurn: boolean;
  // Power Strike — the duel's charge move (2× fast-move damage in the
  // duel state). Rendered as its own card under the fast move; ready
  // once energy reaches `energyCost` (60 since fix wave 3 — the
  // charge requirement was cut ~40% from 100), and firing it spends
  // the whole bar. Its damage label is effectiveness-adjusted like
  // every other move.
  powerStrike?: {
    name: string;
    damage: number;
    type: Move['type'];
    effectiveness?: number;
    energyCost?: number;
  } | null;
  onPowerStrike?: () => void;
  powerStrikeReady?: boolean;
  // Compact duel mode (fighting ergonomics, 2026-11-12): while a
  // duel is live this panel squeezes — tighter cards, no heading, no
  // move descriptions — so the stage + the whole control deck fit
  // one viewport without scrolling (verified at 390×844 in the
  // browser parity suite; the pre-compact deck measured 991px tall
  // there and pushed Guard/Focus/Forfeit and the potions below the
  // fold). Fix wave 3.1: the squeeze applies at EVERY width, not
  // just phone widths — keyed to the fight-only screen being
  // active, because at desktop sizes the full-density deck plus a
  // fixed-height stage overflowed even a 1919×998 viewport.
  compact?: boolean;
}

const MoveCard = styled(Paper, {
  shouldForwardProp: prop => prop !== 'compact',
})<{ compact?: boolean }>(({ theme, compact }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
  color: 'white',
  borderRadius: theme.shape.borderRadius * 2,
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
  // Phone widths: tighter cards so the whole control deck fits under
  // the stage in one viewport (fighting ergonomics, 2026-11-12).
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
  },
  // Mid-duel (compact) the deck compresses further — at EVERY width
  // (fix wave 3.1): slimmer cards, half the gap. The moves stay
  // full-width and tappable; they just stop spending vertical space
  // the fight doesn't need.
  ...(compact ? { padding: theme.spacing(1), marginBottom: theme.spacing(1) } : {}),
}));

// The honest damage number for a move card: base damage adjusted by
// the type chart against the faced opponent, with the multiplier
// spelled out when it is not neutral — "31 (×0.5 resisted)" tells the
// player exactly what will land and why.
function damageLabel(damage: number, effectiveness?: number): string {
  const eff = effectiveness ?? 1;
  if (eff === 1) return `Damage: ${damage}`;
  const adjusted = Math.floor(damage * eff);
  return eff > 1
    ? `Damage: ${adjusted} (×${eff} super effective)`
    : `Damage: ${adjusted} (×${eff} resisted)`;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'ice':
      return '#81D4FA';
    case 'fire':
      return '#FF5722';
    case 'nature':
      return '#4CAF50';
    case 'shadow':
      return '#9C27B0';
    case 'light':
      return '#FFC107';
    case 'quantum':
      return '#B388FF';
    case 'electric':
      return '#FFEA00';
    case 'spiritual':
      return '#80DEEA';
    case 'water':
      return '#2196F3';
    default:
      return '#2196F3';
  }
};

export const BattleMoves: React.FC<BattleMovesProps> = ({
  moves,
  onMoveSelect,
  currentEnergy,
  isPlayerTurn,
  powerStrike,
  onPowerStrike,
  powerStrikeReady,
  compact = false,
}) => {
  const energy = Math.max(0, Math.min(100, Math.round(currentEnergy)));
  return (
    <Box sx={{ p: compact ? 1.25 : 2 }}>
      <Typography
        variant="h6"
        gutterBottom
        color="white"
        sx={compact ? { display: 'none' } : undefined}
      >
        Your move
      </Typography>
      {/* Energy meter — the charge economy made visible. Fast moves
          grant energy (see "Gain:" on the move card), a Recharge
          potion adds 50, and Power Strike below spends a full bar. */}
      <Box sx={{ mb: compact ? 1 : 2 }} aria-label={`Energy ${energy} of 100`}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="white">
            ⚡ Energy
          </Typography>
          <Typography variant="body2" color="white">
            {energy}/100
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={energy}
          color="warning"
          sx={{
            height: compact ? 6 : 10,
            borderRadius: 5,
            bgcolor: 'rgba(255,255,255,0.15)',
          }}
        />
      </Box>
      {moves.map((move, index) => (
        <MoveCard
          key={index}
          compact={compact}
          onClick={() => isPlayerTurn && onMoveSelect(move)}
          sx={{
            opacity: isPlayerTurn ? 1 : 0.5,
            cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
            borderLeft: `4px solid ${getTypeColor(move.type)}`,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: compact ? 0.5 : 1,
            }}
          >
            <Typography variant="subtitle1" sx={{ color: getTypeColor(move.type) }}>
              {move.name}
            </Typography>
            <Typography variant="body2">
              {move.energyCost ? `Energy: ${move.energyCost}` : `Gain: ${move.energyGain}`}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, display: compact ? 'none' : { xs: 'none', sm: 'block' } }}
          >
            {move.description}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">{damageLabel(move.damage, move.effectiveness)}</Typography>
            <Typography variant="body2">Cooldown: {move.cooldown}s</Typography>
          </Box>
        </MoveCard>
      ))}
      {powerStrike && (
        <MoveCard
          compact={compact}
          onClick={() => powerStrikeReady && onPowerStrike?.()}
          sx={{
            opacity: powerStrikeReady ? 1 : 0.5,
            cursor: powerStrikeReady ? 'pointer' : 'not-allowed',
            borderLeft: `4px solid #FFC107`,
            // Charged Power Strike is unmistakable: gold ring + glow
            // on top of the gold edge, so "ready" reads at a glance
            // mid-fight (ergonomics pass, 2026-11-12).
            ...(powerStrikeReady
              ? {
                  border: '2px solid #FFC107',
                  boxShadow: '0 0 18px rgba(255,193,7,0.55)',
                  background: 'linear-gradient(135deg, #3a2f10 0%, #1a1a1a 100%)',
                }
              : {}),
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: compact ? 0.5 : 1,
            }}
          >
            <Typography variant="subtitle1" sx={{ color: '#FFC107' }}>
              💥 {powerStrike.name}
            </Typography>
            <Typography variant="body2">Energy: {powerStrike.energyCost ?? 100}</Typography>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, display: compact ? 'none' : { xs: 'none', sm: 'block' } }}
          >
            {powerStrikeReady
              ? 'Fully charged — unleash it!'
              : `Charge to ${powerStrike.energyCost ?? 100} energy to unleash it (now ${energy}/100).`}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">
              {damageLabel(powerStrike.damage, powerStrike.effectiveness)}
            </Typography>
            <Typography variant="body2">Spends all energy</Typography>
          </Box>
        </MoveCard>
      )}
    </Box>
  );
};
