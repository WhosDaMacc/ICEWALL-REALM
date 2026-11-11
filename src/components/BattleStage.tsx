// The visible battle stage: the duel's scenery, the two fighters facing
// each other, the VS intro, and the move feedback (lunge / flinch /
// damage numbers / winner glow). Presentational only — all duel logic
// (damage, AI turn, completeBattle) stays in NavitarBattle, which drives
// this stage through props.
//
// Scenery is the venue the duel came from (bar interior / beach / park
// feel via a gradient in the venue's element colours + the venue name as
// a banner). A duel that did not come from a venue gets a neutral arena
// backdrop. CSS scenery only — no new image assets.
import React from 'react';
import { Box, Chip, LinearProgress, Paper, Typography } from '@mui/material';
import { elementColor, elementEmoji, resolveNavitarArt } from '../utils/navitarArt';
import { NavitarArtImg } from './NavitarArtImg';
import { ModelViewer } from './ModelViewer';
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
  // venue person's art). Resolution prefers this, then the name map,
  // then the element emoji — see resolveNavitarArt.
  imageUrl?: string | null;
  // The fighter's 3D model GLB when it has one (Griffin, Ashwing) —
  // the stage renders the live model instead of the 2D art.
  modelUrl?: string | null;
  // Closer framing for the 3D model (1 = default; the phoenix's wide
  // wingspan needs 1.5 to read at a good size).
  modelZoom?: number;
}

export interface BattleStageProps {
  player: StageFighter | null;
  opponent: StageFighter | null;
  // The venue the duel came from, when there is one (challengeVenueId).
  venueName: string | null;
  venueElement: string | null;
  vsActive: boolean;
  onVsDismiss: () => void;
  playerAnim: '' | 'lunge' | 'shake';
  opponentAnim: '' | 'lunge' | 'shake';
  damagePop: { key: number; value: number; target: 'player' | 'opponent' } | null;
  winner: 'player' | 'opponent' | null;
}

function FighterArt({ fighter, size }: { fighter: StageFighter; size: number }) {
  const color = elementColor(fighter.element);
  if (fighter.modelUrl) {
    // A fighter with a 3D model (Griffin, Ashwing) shows the live
    // model spinning on the stage instead of flat art. The wrapper
    // keeps the same 150px circle + element border as the 2D art, so
    // the stage layout and the lunge/shake animation on the wrapper
    // are unchanged. While the GLB downloads the viewer veils over
    // the 2D art — or, for the Griffin (no 2D art exists), its
    // placeholder — so the slot never reads as empty.
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `4px solid ${color}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <ModelViewer
          modelUrl={fighter.modelUrl}
          zoom={fighter.modelZoom ?? 1}
          fallbackSrc={fighter.imageUrl ?? undefined}
          fallbackAlt={`${fighter.name} — 3D preview`}
          element={fighter.element}
          height="100%"
        />
      </Box>
    );
  }
  const art = resolveNavitarArt(fighter.imageUrl, fighter.name);
  if (art) {
    // The img sits on an element-coloured gradient and fades in on
    // load (NavitarArtImg), so a slow image never reads as an empty
    // circle — the slot is a themed disc until the art arrives.
    return (
      <NavitarArtImg
        src={art}
        alt={`${fighter.name} art`}
        element={fighter.element}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `4px solid ${color}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        }}
      />
    );
  }
  // No art for this name (e.g. a player-created navitar): element
  // gradient disc with the element emoji, same as the map companion.
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.45,
        background: `radial-gradient(circle at 35% 30%, ${color}, #121212 75%)`,
        border: `4px solid ${color}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
      }}
    >
      {elementEmoji(fighter.element)}
    </Box>
  );
}

function Fighter({
  fighter,
  side,
  anim,
  damagePop,
  isWinner,
}: {
  fighter: StageFighter;
  side: 'player' | 'opponent';
  anim: '' | 'lunge' | 'shake';
  damagePop: { key: number; value: number } | null;
  isWinner: boolean;
}) {
  const animClass =
    anim === 'lunge'
      ? side === 'player'
        ? 'battle-anim-lunge-right'
        : 'battle-anim-lunge-left'
      : anim === 'shake'
        ? 'battle-anim-shake'
        : '';
  const color = elementColor(fighter.element);
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        gap: 1,
      }}
    >
      <Typography variant="h6" sx={{ color: '#fff' }}>
        {fighter.name} <Chip label={`Lv. ${fighter.level}`} size="small" sx={{ ml: 0.5 }} />
      </Typography>
      <Box sx={{ width: '100%', maxWidth: 260 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" sx={{ color: '#fff' }}>
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
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
          Energy gain {fighter.energyGain} · Cooldown {fighter.cooldown}s
        </Typography>
      </Box>
      <Box
        className={`${animClass}${isWinner ? ' battle-winner' : ''}`}
        sx={{ position: 'relative', mt: 1 }}
      >
        <FighterArt fighter={fighter} size={150} />
        {damagePop && (
          <Typography
            key={damagePop.key}
            className="battle-anim-damage-pop"
            sx={{
              position: 'absolute',
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
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
  playerAnim,
  opponentAnim,
  damagePop,
  winner,
}) => {
  // Scenery: the venue's element colour washed into a dark arena
  // gradient; neutral dark when the duel did not come from a venue.
  const venueColor = venueElement ? elementColor(venueElement) : '#455a64';
  const background = `linear-gradient(160deg, ${venueColor}59 0%, #121212 55%, #1a1a1a 100%)`;
  return (
    <Paper
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background,
        p: 3,
        minHeight: 320,
      }}
    >
      {/* Venue banner — the stage is where the duel happens. */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Chip
          label={venueName ? `📍 ${venueName} — DEMO` : '⚔️ Battle Arena'}
          sx={{ bgcolor: 'rgba(0,0,0,0.45)', color: '#fff', fontWeight: 'bold' }}
        />
      </Box>
      {!player || !opponent ? (
        <Typography variant="body1" align="center" sx={{ color: '#fff', py: 6 }}>
          No duel yet — challenge an opponent to step onto the stage.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Fighter
            fighter={player}
            side="player"
            anim={playerAnim}
            damagePop={damagePop?.target === 'player' ? damagePop : null}
            isWinner={winner === 'player'}
          />
          <Typography
            variant="h4"
            sx={{
              color: '#fff',
              fontWeight: 'bold',
              alignSelf: 'center',
              textShadow: '0 2px 8px rgba(0,0,0,0.7)',
            }}
          >
            VS
          </Typography>
          <Fighter
            fighter={opponent}
            side="opponent"
            anim={opponentAnim}
            damagePop={damagePop?.target === 'opponent' ? damagePop : null}
            isWinner={winner === 'opponent'}
          />
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
