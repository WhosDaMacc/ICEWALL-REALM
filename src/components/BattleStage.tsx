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
import React, { useCallback, useRef, useState } from 'react';
import { Box, Button, Chip, LinearProgress, Paper, Typography } from '@mui/material';
import { elementColor } from '../utils/navitarArt';
import ElementalWorld, {
  WORLD_NAMES,
  resolveBattleWorld,
  type CameraView,
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
  // Fill height (fix wave 3.1): in the fight-only screen the stage
  // FLEXES to whatever vertical room the control deck leaves inside
  // the fixed full-viewport overlay, at EVERY viewport size — the
  // old fixed 430px desktop height plus a full-density deck
  // overflowed a 1919×998 screen mid-duel (potions below the fold,
  // scrolling to reach them). The Paper stretches to its flex
  // parent and keeps only a floor (~240px; 230px on phone widths,
  // the pinned wave-2 budget) so the fighters always have a stage.
  // Absent (GuidedDemo, the setup preview) = exactly as before.
  fillHeight?: boolean;
  // Camera views (fix wave 3): when enabled, the stage carries the
  // view switcher (Behind you / First-person / Arena) and a quick
  // tap on the stage cycles views; the default is the third-person
  // 'behind' view. Absent (GuidedDemo) = no switcher, Arena camera.
  cameraViewsEnabled?: boolean;
  playerAnim: '' | 'lunge' | 'shake';
  opponentAnim: '' | 'lunge' | 'shake';
  damagePop: { key: number; value: number; target: 'player' | 'opponent' } | null;
  winner: 'player' | 'opponent' | null;
}

function FighterHeader({
  fighter,
  damagePop,
  isWinner,
  compact = false,
}: {
  fighter: StageFighter;
  damagePop: { key: number; value: number } | null;
  isWinner: boolean;
  // Slim power bars (fix wave 3, Eddie 2026-11-13: "Power bars need
  // to be smaller on the screen so I can actually see my
  // characters"). Mid-duel the header compacts hard — thinner HP
  // and energy bars, smaller name row, tighter stack — so the
  // fighters, not the chrome, own the stage. Every datum (name, Lv,
  // HP numbers, element, energy) is still there; it just takes a
  // third of the vertical room.
  compact?: boolean;
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
        gap: compact ? 0.25 : 0.75,
      }}
    >
      <Typography
        variant={compact ? 'subtitle1' : 'h6'}
        sx={{
          color: '#fff',
          textShadow: '0 2px 6px rgba(0,0,0,0.8)',
          wordBreak: 'break-word',
          lineHeight: compact ? 1.25 : undefined,
        }}
      >
        {fighter.name}{' '}
        <Chip
          label={`Lv. ${fighter.level}`}
          size="small"
          sx={compact ? { ml: 0.5, height: 18, fontSize: '0.62rem' } : { ml: 0.5 }}
        />
      </Typography>
      <Box sx={{ width: '100%', maxWidth: compact ? 210 : 260 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: compact ? 0.25 : 0.5 }}>
          <Typography
            variant={compact ? 'caption' : 'body2'}
            sx={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
          >
            HP {fighter.hp}/{fighter.maxHp}
          </Typography>
          <Typography
            variant={compact ? 'caption' : 'body2'}
            sx={{ color: color, fontWeight: 'bold' }}
          >
            {fighter.element}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(fighter.hp / Math.max(1, fighter.maxHp)) * 100}
          sx={{
            height: compact ? 6 : 12,
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.18)',
          }}
        />
        {fighter.energy !== undefined && (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, fighter.energy))}
            color="warning"
            sx={{
              height: compact ? 4 : 8,
              borderRadius: 2,
              mt: compact ? 0.5 : 0.75,
              bgcolor: 'rgba(255,255,255,0.18)',
            }}
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
        sx={{ position: 'relative', height: compact ? 24 : 36, width: '100%' }}
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
              fontSize: compact ? '1.45rem' : '1.9rem',
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

const CAMERA_VIEW_ORDER: CameraView[] = ['behind', 'first', 'arena'];
const CAMERA_VIEW_LABELS: Record<CameraView, string> = {
  behind: 'Behind you',
  first: 'First-person',
  arena: 'Arena',
};

const BattleStage: React.FC<BattleStageProps> = ({
  player,
  opponent,
  venueName,
  venueElement,
  vsActive,
  onVsDismiss,
  countdown = null,
  compact = false,
  fillHeight = false,
  cameraViewsEnabled = false,
  playerAnim,
  opponentAnim,
  damagePop,
  winner,
}) => {
  // Fight camera (fix wave 3): the fight screen opens in the
  // third-person 'behind' view; the switcher (and tap-to-cycle)
  // move between Behind you / First-person / Arena. Consumers
  // without the switcher (GuidedDemo) stay in Arena, untouched.
  const [cameraView, setCameraView] = useState<CameraView>(cameraViewsEnabled ? 'behind' : 'arena');
  const cycleCameraView = useCallback(() => {
    setCameraView(v => {
      const i = CAMERA_VIEW_ORDER.indexOf(v);
      return CAMERA_VIEW_ORDER[(i + 1) % CAMERA_VIEW_ORDER.length];
    });
  }, []);
  // Tap-to-cycle: a quick tap (barely moved, quickly released) on
  // the stage cycles the view; a drag must NOT — dragging is how
  // the player looks around in every view, and it produces a long,
  // moved press, which this distinguishes by distance + duration.
  const tapRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const handleStagePointerDown = (e: React.PointerEvent) => {
    tapRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const handleStagePointerUp = (e: React.PointerEvent) => {
    const start = tapRef.current;
    tapRef.current = null;
    if (!cameraViewsEnabled || !start || vsActive) return;
    if ((e.target as HTMLElement).closest('[data-view-switcher]')) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (moved < 8 && Date.now() - start.t < 500) cycleCameraView();
  };
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
      data-camera-view={cameraViewsEnabled ? cameraView : undefined}
      onPointerDown={handleStagePointerDown}
      onPointerUp={handleStagePointerUp}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: compact ? { xs: 1, sm: 3 } : 3,
        // Fight mode (fillHeight): the min-height is only a floor —
        // the flex parent decides the real height (see the prop),
        // so the stage gives room to the deck at desktop sizes
        // instead of holding a fixed 430px and pushing the deck's
        // tail off the bottom of the screen.
        minHeight: fillHeight ? { xs: 230, sm: 240 } : compact ? { xs: 230, sm: 430 } : 430,
        ...(fillHeight ? { flex: '1 1 auto', minWidth: 0 } : {}),
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
        cameraView={cameraViewsEnabled ? cameraView : undefined}
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
          height: compact ? '36%' : '46%',
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
        <Box sx={{ textAlign: 'center', mb: compact ? 1 : 2 }}>
          <Chip
            label={venueName ? `📍 ${venueName} — ${worldName} — DEMO` : `⚔️ ${worldName}`}
            size={compact ? 'small' : 'medium'}
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
              compact={compact}
            />
            <Typography
              variant={compact ? 'h5' : 'h4'}
              sx={{
                color: '#fff',
                fontWeight: 'bold',
                alignSelf: 'flex-start',
                mt: compact ? 1.5 : 4,
                textShadow: '0 2px 8px rgba(0,0,0,0.7)',
              }}
            >
              VS
            </Typography>
            <FighterHeader
              fighter={opponent}
              damagePop={damagePop?.target === 'opponent' ? damagePop : null}
              isWinner={winner === 'opponent'}
              compact={compact}
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
      {/* Camera switcher (fix wave 3): three small labelled buttons
          in the stage's bottom-right corner. Active view is filled;
          the others are ghosted. pointerdown is stopped so pressing
          a button never starts a stage drag or a tap-cycle; the
          stage's own tap handler also ignores presses that start
          inside this box. Hidden during the VS intro (zIndex below
          the overlay) so the face-off stays clean. */}
      {cameraViewsEnabled && player && opponent && (
        <Box
          data-view-switcher="true"
          sx={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            zIndex: 3,
            display: 'flex',
            gap: 0.5,
            bgcolor: 'rgba(0,0,0,0.5)',
            borderRadius: 999,
            p: 0.5,
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          {CAMERA_VIEW_ORDER.map(v => (
            <Button
              key={v}
              data-testid={`camera-view-${v}`}
              size="small"
              variant={cameraView === v ? 'contained' : 'text'}
              onClick={() => setCameraView(v)}
              sx={{
                minWidth: 0,
                px: 1,
                py: 0.25,
                fontSize: '0.68rem',
                borderRadius: 999,
                color: cameraView === v ? undefined : '#fff',
                textTransform: 'none',
              }}
            >
              {CAMERA_VIEW_LABELS[v]}
            </Button>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default BattleStage;
