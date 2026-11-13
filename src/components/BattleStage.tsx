// The visible battle stage: the duel's scenery, the two fighters facing
// each other, the VS intro, and the move feedback (lunge / flinch /
// damage numbers / winner glow). Presentational only — all duel logic
// (damage, AI turn, completeBattle) stays in NavitarBattle, which drives
// this stage through props.
//
// The scenery is now a real 3D elemental world (ElementalWorld.tsx):
// every element has a world of its own (Ice Field, Fire World,
// Quantum Realm, Water World, …). A venue duel fights in the venue's
// element world; a duel with no venue takes the opponent's element
// world. The two fighters
// stand inside that world (GLB in 3D when they have one, 2D billboard
// when they don't), the camera drifts in a slow orbit, and the lunge /
// flinch / winner ring happen in the scene. The DOM layer keeps what
// it is good at: the venue/world banner, the name + Lv + HP headers,
// the damage numbers, and the VS intro overlay. The overlay is
// pointer-events-none so the world can be dragged to look around;
// only the VS overlay (tap to skip) takes clicks.
import React, { useCallback, useState } from 'react';
import { Box, Chip, LinearProgress, Paper, Typography } from '@mui/material';
import { elementColor } from '../utils/navitarArt';
import ElementalWorld, {
  WORLD_NAMES,
  resolveBattleWorld,
  type FighterScreenPos,
} from './ElementalWorld';
import './BattleStage.css';

export interface StageFighter {
  name: string;
  element: string;
  level: number;
  hp: number;
  maxHp: number;
  energyGain: number;
  cooldown: number;
  // The fighter's own art when it has one (picked at creation, or the
  // venue person's art). The world uses it for the 2D billboard when
  // the fighter has no 3D model.
  imageUrl?: string | null;
  // The fighter's 3D model GLB when it has one (Griffin, Ashwing) —
  // the world renders the live model instead of the billboard.
  modelUrl?: string | null;
  // Closer framing for the 3D model (1 = default; the phoenix's wide
  // wingspan needs 1.5 to read at a good size).
  modelZoom?: number;
  // Extra Y turn for a model whose front is not +z in model space
  // (Luminara's golden dragon fronts -x; see NavitarFightClub).
  modelRotationY?: number;
  // Ground-plane offset (model units) for a model whose feet sit
  // above its bounding-box min.y (Luminara; see NavitarFightClub).
  modelYOffset?: number;
  // Live duel energy (0–100) — a meter under this header's HP bar when
  // present (set for the player fighter); undefined hides the meter.
  energy?: number;
}

export interface BattleStageProps {
  player: StageFighter | null;
  opponent: StageFighter | null;
  // The venue governing the duel, when there is one — the CHECKED-IN
  // venue (NavitarBattle resolves it from the check-in state and
  // captures it at Challenge time).
  venueName: string | null;
  venueElement: string | null;
  vsActive: boolean;
  onVsDismiss: () => void;
  // Fight countdown (round: battle features pass) — after the VS
  // intro dismisses, NavitarBattle runs 3 → 2 → 1 → FIGHT! at
  // ~600ms a beat and passes the current beat here. The stage shows
  // it as a big centre overlay; duel controls stay disabled in
  // NavitarBattle until the beat clears (null). Optional so other
  // stage consumers (GuidedDemo) render exactly as before.
  countdown?: 3 | 2 | 1 | 'FIGHT' | null;
  // Compact stage (fighting ergonomics, 2026-11-12): while a duel is
  // live, the stage shrinks on phone widths so the stage + the whole
  // control deck under it fit one viewport — the deck never goes
  // below the fold mid-fight; the stage is what gives.
  compact?: boolean;
  playerAnim: '' | 'lunge' | 'shake';
  opponentAnim: '' | 'lunge' | 'shake';
  damagePop: { key: number; value: number; target: 'player' | 'opponent' } | null;
  winner: 'player' | 'opponent' | null;
}

function FighterHeader({
  fighter,
  damagePop,
  isWinner,
}: {
  fighter: StageFighter;
  damagePop: { key: number; value: number } | null;
  isWinner: boolean;
}) {
  const color = elementColor(fighter.element);
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        gap: 0.75,
      }}
    >
      <Typography
        variant="h6"
        sx={{ color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,0.8)', wordBreak: 'break-word' }}
      >
        {fighter.name} <Chip label={`Lv. ${fighter.level}`} size="small" sx={{ ml: 0.5 }} />
      </Typography>
      <Box sx={{ width: '100%', maxWidth: 260 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography
            variant="body2"
            sx={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
          >
            HP {fighter.hp}/{fighter.maxHp}
          </Typography>
          <Typography variant="body2" sx={{ color: color, fontWeight: 'bold' }}>
            {fighter.element}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(fighter.hp / Math.max(1, fighter.maxHp)) * 100}
          sx={{ height: 12, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.18)' }}
        />
        {fighter.energy !== undefined && (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, fighter.energy))}
            color="warning"
            sx={{ height: 8, borderRadius: 4, mt: 0.75, bgcolor: 'rgba(255,255,255,0.18)' }}
            aria-label={`Energy ${Math.round(fighter.energy)} of 100`}
          />
        )}
        {/* Round 3 (live check 2026-11-12): the header used to carry
            two TEXT lines under the bars — the energy status
            ("100/100 - Power Strike ready!") and an "Energy gain /
            Cooldown" line. Both lived in the same top band the
            fighters' heads project into, and both collided live:
            the status text landed on the player fighter's card at
            500px wide, and the gain line landed on the opponent's
            name label. Both are GONE from the stage — structurally,
            not by clamping: the energy status already lives in the
            controls flow below the stage (BattleMoves renders the
            Energy meter with the same number, and its Power Strike
            card announces when it is fully charged), and each move
            card prints its own Gain / Cooldown. The header keeps
            only the name row and the two bars (text ends ~35% down
            the stage), and the name labels moved to a floor lane
            under the fighters (see renderLabel) — no stage element
            shares a lane with another any more. */}
      </Box>
      {/* Damage-number anchor: the fighter's body is in the 3D world
          now, so the number pops over this side of the stage instead of
          over an art circle. The winner's gold glow rides here too. */}
      <Box
        className={isWinner ? 'battle-winner' : ''}
        sx={{ position: 'relative', height: 36, width: '100%' }}
      >
        {damagePop && (
          <Typography
            key={damagePop.key}
            className="battle-anim-damage-pop"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: '#ff5252',
              fontWeight: 'bold',
              fontSize: '1.9rem',
              textShadow: '0 2px 6px rgba(0,0,0,0.8)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            -{damagePop.value}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

const BattleStage: React.FC<BattleStageProps> = ({
  player,
  opponent,
  venueName,
  venueElement,
  vsActive,
  onVsDismiss,
  countdown = null,
  compact = false,
  playerAnim,
  opponentAnim,
  damagePop,
  winner,
}) => {
  // World selection goes through the ONE helper (resolveBattleWorld
  // in ElementalWorld): the venue's element world when NavitarBattle
  // passes a venue, the opponent's element world when it doesn't.
  // NavitarBattle derives that venue from the CHECK-IN state (and
  // captures it at Challenge time for the duel itself), so this
  // stage — which renders both the pre-challenge preview and the
  // duel — always names the field the player is actually standing
  // in. The header below reads this same resolved world.
  const world = resolveBattleWorld(venueElement, opponent?.element);
  const worldName = WORLD_NAMES[world];
  // DOM fighter labels: the world projects each fighter's floor
  // position to stage percentages; the names render here as real
  // text — full name, clamped inside the stage, always attached to
  // its fighter. (In-world canvas sprites truncated and detached in
  // two live checks; see ElementalWorld.)
  const [labelPos, setLabelPos] = useState<Record<'player' | 'opponent', FighterScreenPos | null>>({
    player: null,
    opponent: null,
  });
  const handleFighterPositions = useCallback(
    (pos: Record<'player' | 'opponent', FighterScreenPos | null>) => setLabelPos(pos),
    []
  );
  const renderLabel = (fighter: StageFighter | null, pos: FighterScreenPos | null) => {
    if (!fighter || !pos || vsActive) return null;
    // FLOOR LANE (round 3): the world now projects each fighter's
    // BASE (floor point), and the name label renders just BELOW that
    // point — a nameplate under the fighter's feet, standing in the
    // open ground lane. The old scheme projected the fighter's HEAD
    // and clamped the label under the HUD (y ≥ 32%), but the head
    // itself projects to y ≈ 28–39% at every stage size (measured
    // with the real camera math: fov 50, dist 7.6, sway ±0.3), which
    // IS the HUD band — the header text ends ~35% down the stage and
    // its damage anchor reaches ~46% — so an above-head label could
    // not be clamped clear of the HUD at ANY stage height; it
    // collided with the header's text lines in two straight live
    // checks. The floor point projects to y ≈ 54–59% at desktop,
    // 500px and tall stages alike: below the fighters' feet and
    // contact shadows, below the damage anchor, and far from every
    // HUD element, at every width. The clamp only guards drag-orbit
    // extremes (camera swung behind the fighters).
    const x = Math.min(88, Math.max(12, pos.x));
    const y = Math.min(88, Math.max(46, pos.y));
    return (
      <Box
        sx={{
          position: 'absolute',
          left: `${x}%`,
          top: `calc(${y}% + 14px)`,
          transform: 'translate(-50%, 0)',
          zIndex: 2,
          pointerEvents: 'none',
          bgcolor: 'rgba(0,0,0,0.38)',
          borderRadius: 2,
          px: 1,
          py: 0.25,
          whiteSpace: 'nowrap',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: '#fff', fontWeight: 'bold', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
        >
          {fighter.name}
        </Typography>
      </Box>
    );
  };
  return (
    <Paper
      data-compact={compact ? 'true' : 'false'}
      data-player-model={player?.modelUrl ?? ''}
      data-opponent-model={opponent?.modelUrl ?? ''}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: compact ? { xs: 1.5, sm: 3 } : 3,
        minHeight: compact ? { xs: 230, sm: 430 } : 430,
      }}
    >
      {/* The elemental world is the stage backdrop — the duel happens
          inside it. Without WebGL it degrades to a themed gradient
          with the world name (never an empty box, never a GLB fetch). */}
      <ElementalWorld
        world={world}
        accentElement={venueElement}
        player={player}
        opponent={opponent}
        playerAnim={playerAnim}
        opponentAnim={opponentAnim}
        winner={winner}
        onFighterPositions={handleFighterPositions}
      />
      {/* HUD scrim: a soft dark gradient behind the banner + headers
          so the HUD text stays legible over bright worlds (Light,
          Ice) and over anything the world renders behind it. Sits
          above the canvas, below the labels and the DOM layer. */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '46%',
          zIndex: 1,
          pointerEvents: 'none',
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.22) 55%, rgba(0,0,0,0) 100%)',
        }}
      />
      {/* Fighter name labels, projected from the fighters' positions
          in the world. Hidden during the VS intro — the overlay names
          both fighters in full, and the labels stay out of its way. */}
      {renderLabel(player, labelPos.player)}
      {renderLabel(opponent, labelPos.opponent)}
      {/* DOM layer: banner + headers + damage numbers. pointerEvents
          none so the world underneath can be dragged to look around. */}
      <Box sx={{ position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Chip
            label={venueName ? `📍 ${venueName} — ${worldName} — DEMO` : `⚔️ ${worldName}`}
            sx={{ bgcolor: 'rgba(0,0,0,0.45)', color: '#fff', fontWeight: 'bold' }}
          />
        </Box>
        {!player || !opponent ? (
          <Typography
            variant="body1"
            align="center"
            sx={{ color: '#fff', py: 6, textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}
          >
            No duel yet — challenge an opponent to step onto the stage.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <FighterHeader
              fighter={player}
              damagePop={damagePop?.target === 'player' ? damagePop : null}
              isWinner={winner === 'player'}
            />
            <Typography
              variant="h4"
              sx={{
                color: '#fff',
                fontWeight: 'bold',
                alignSelf: 'flex-start',
                mt: 4,
                textShadow: '0 2px 8px rgba(0,0,0,0.7)',
              }}
            >
              VS
            </Typography>
            <FighterHeader
              fighter={opponent}
              damagePop={damagePop?.target === 'opponent' ? damagePop : null}
              isWinner={winner === 'opponent'}
            />
          </Box>
        )}
      </Box>
      {/* Fight countdown: 3 → 2 → 1 → FIGHT!, one big beat at centre
          stage after the VS intro. Purely presentational — the
          gating lives in NavitarBattle (moves/potions check the
          countdown state), and the opponent cannot act because AI
          turns are only ever scheduled by a player move. Not
          tap-skippable: it is ~2.4s and runs on every duel,
          rematches included. pointer-events-none so the world can
          still be dragged underneath it. */}
      {countdown !== null && player && opponent && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          <Typography
            key={String(countdown)}
            className="battle-anim-vs"
            sx={{
              color: countdown === 'FIGHT' ? '#69f0ae' : '#fff',
              fontWeight: 'bold',
              fontSize: { xs: '4.5rem', sm: '6.5rem' },
              lineHeight: 1,
              textShadow: '0 4px 24px rgba(0,0,0,0.9)',
            }}
          >
            {countdown === 'FIGHT' ? 'FIGHT!' : countdown}
          </Typography>
        </Box>
      )}
      {/* VS intro: brief face-off before moves become usable. Click
          dismisses it early; NavitarBattle also auto-dismisses after ~2s. */}
      {vsActive && player && opponent && (
        <Box
          onClick={onVsDismiss}
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.55)',
            cursor: 'pointer',
            textAlign: 'center',
            px: 2,
          }}
        >
          <Typography
            variant="h4"
            className="battle-anim-vs"
            sx={{ color: '#fff', fontWeight: 'bold', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
          >
            {player.name} VS {opponent.name}
          </Typography>
          <Typography
            variant="h3"
            className="battle-anim-vs"
            sx={{
              color: '#ffd54f',
              fontWeight: 'bold',
              mt: 1,
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            }}
          >
            FIGHT!
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 1 }}>
            Tap to skip
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default BattleStage;
