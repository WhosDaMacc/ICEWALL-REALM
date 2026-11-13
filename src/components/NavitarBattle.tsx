import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import { JOE_OPPONENT_ID, useNavitarFightClub, type WinResult } from '../contexts/NavitarFightClub';
import { JOE_TITLES, joeVerdict, pickJoeLine, type JoeAnnounceEvent } from '../data/joe';
import { earnTitle } from '../utils/titles';
import { useVenue } from '../contexts/VenueContext';
import { useBusiness } from '../contexts/BusinessContext';
import { DEMO_VENUES } from '../data/venues';
import { ALL_NAVITAR_LOOKS, resolveNavitarArt } from '../utils/navitarArt';
import {
  POTIONS,
  armPowerBoost,
  consumePowerBoost,
  getPotions,
  isPowerBoostArmed,
  usePotion,
  type PotionCounts,
} from '../utils/potions';
import { xpProgress } from '../utils/levels';
import { attackPowerAtLevel, isValidAttacks } from '../utils/attacks';
import { LookGrid, LookPickerDialog } from './LookPickerDialog';
import BattleAnimation from './BattleAnimation';
import BattleStage, { StageFighter } from './BattleStage';
import { resolveBattleWorld, WORLD_NAMES } from './ElementalWorld';
import { BattleMoves } from './BattleMoves';
import { styled } from '@mui/material/styles';
import { NavitarPersonality } from './NavitarPersonality';

interface Navitar {
  name: string;
  type:
    'ice' | 'fire' | 'nature' | 'shadow' | 'light' | 'quantum' | 'electric' | 'spiritual' | 'water';
  cp: number;
  hp: number;
  maxHp: number;
  // The navitar's own art when it has one — carried through to the
  // stage so the fighter renders its image, not the emoji fallback.
  imageUrl?: string;
  // The navitar's 3D model GLB when it has one (Griffin, Ashwing) —
  // carried through to the stage so the fighter renders the live
  // model instead of the 2D art.
  modelUrl?: string;
  modelZoom?: number;
  // Extra Y turn for a model whose front is not +z in model space
  // (Luminara's golden dragon fronts -x; see NavitarFightClub).
  modelRotationY?: number;
  // Ground-plane offset (model units) for a model whose feet sit
  // above its bounding-box min.y (Luminara; see NavitarFightClub).
  modelYOffset?: number;
  fastMove: {
    name: string;
    damage: number;
    energyGain: number;
    cooldown: number;
  };
  chargeMove: {
    name: string;
    damage: number;
    energyCost: number;
  };
  moves: Move[];
}

interface Move {
  name: string;
  type:
    'ice' | 'fire' | 'nature' | 'shadow' | 'light' | 'quantum' | 'electric' | 'spiritual' | 'water';
  damage: number;
  energyGain: number;
  energyCost: number;
  cooldown: number;
}

interface BattleState {
  playerNavitar: Navitar;
  opponentNavitar: Navitar;
  playerEnergy: number;
  opponentEnergy: number;
  isPlayerTurn: boolean;
  isDodging: boolean;
  battleLog: string[];
  damagePreview: number;
}

interface PersonalityTrait {
  name: string;
  value: number;
  description: string;
  dialogue: string;
  battleStrategy: {
    preferredMoves: string[];
    preferredTarget: 'health' | 'defense' | 'energy';
    aggression: number;
    defense: number;
  };
}

const BattleContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
  color: 'white',
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[10],
}));

const getTypeEffectiveness = (attackerType: string, defenderType: string): number => {
  const effectivenessChart: Record<string, Record<string, number>> = {
    fire: { ice: 2, nature: 2, shadow: 1, light: 1, water: 0.5 },
    ice: { fire: 0.5, nature: 1, shadow: 1, light: 1 },
    nature: { fire: 0.5, ice: 1, shadow: 1, light: 1, electric: 2 },
    shadow: { fire: 1, ice: 1, nature: 1, light: 0.5, spiritual: 2 },
    light: { fire: 1, ice: 1, nature: 1, shadow: 2, quantum: 2 },
    water: { fire: 2, electric: 0.5 },
    electric: { water: 2, nature: 0.5 },
    quantum: { shadow: 2, light: 0.5 },
    spiritual: { quantum: 2, shadow: 0.5 },
  };
  return effectivenessChart[attackerType]?.[defenderType] || 1;
};

// POWER-LEVEL MATCHMAKING (fix wave 3, Eddie 2026-11-13: "You need
// to match me with people of my power level so I can possibly win
// some"). Honest labels + a fair default ONLY — no stat changes, no
// scaling: each opponent is compared to the player's SELECTED
// fighter by level and labelled, the picker groups fair fights
// first, and the default selection (see the effect in the
// component) is an even match when one exists. Joe keeps his boss
// framing whatever the levels say.
export type MatchTier = 'even' | 'warmup' | 'tough' | 'outclassed' | 'boss';
export const matchTierFor = (
  playerLevel: number,
  opponent: { id: string; level: number }
): MatchTier => {
  if (opponent.id === JOE_OPPONENT_ID) return 'boss';
  const diff = opponent.level - playerLevel;
  if (diff > 12) return 'outclassed';
  if (diff >= 6) return 'tough';
  if (diff >= -5) return 'even';
  return 'warmup';
};
export const MATCH_TIER_LABELS: Record<MatchTier, string> = {
  even: 'Even match',
  warmup: 'Warm-up',
  tough: 'Tough fight',
  outclassed: 'Outclasses you',
  boss: 'Boss fight',
};
// Picker display order: fair fights first, the boss last (he is
// the endgame, not the welcome mat).
const MATCH_TIER_RANK: Record<MatchTier, number> = {
  even: 0,
  warmup: 1,
  tough: 2,
  outclassed: 3,
  boss: 4,
};

const NavitarBattle: React.FC = () => {
  const {
    navitars,
    activeNavitarId,
    setActiveNavitar,
    userNavitar,
    businessNavitars,
    activeBattles,
    createUserNavitar,
    updateUserNavitarLook,
    challengeBusinessNavitar,
    completeBattle,
  } = useNavitarFightClub();
  const { businesses } = useBusiness();
  const {
    checkedInVenueId,
    pendingOpponentId,
    challengeVenueId,
    consumePendingOpponent,
    clearChallengeVenue,
    recordVenueWin,
  } = useVenue();
  const [isCreateNavitarOpen, setIsCreateNavitarOpen] = useState(false);
  // Change look for a navitar that already exists: the look-picker
  // used to live only in the create dialog, so an existing navitar
  // could never reach it. Tapping a thumb applies it immediately.
  const [isChangeLookOpen, setIsChangeLookOpen] = useState(false);
  const [navitarName, setNavitarName] = useState('');
  const [navitarSkills, setNavitarSkills] = useState('');
  // Look-picker: which art the new navitar wears. Defaults to
  // Frostbite's art — the dialog has no type input, so the default is
  // fixed and the player taps any of the 18 arts to change it.
  const [selectedLook, setSelectedLook] = useState<string>(ALL_NAVITAR_LOOKS[0].src);
  const [showBattleAnimation, setShowBattleAnimation] = useState(false);
  // How to Fight guide (fix wave 3): closed until the player taps
  // the prominent toggle in the entry flow — one tap, opens in
  // place, readable before and during setup.
  const [howToOpen, setHowToOpen] = useState(false);
  const [currentBattleId, setCurrentBattleId] = useState<string | null>(null);
  const [battleEvent, setBattleEvent] = useState<
    'victory' | 'defeat' | 'taunt' | 'compliment' | 'critical' | 'dodge' | 'special' | null
  >(null);
  const [playerTraits, setPlayerTraits] = useState<PersonalityTrait[]>([]);
  const [opponentTraits, setOpponentTraits] = useState<PersonalityTrait[]>([]);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [damagePreview, setDamagePreview] = useState(0);
  const [opponentIndex, setOpponentIndex] = useState(0);
  // Opponent (re)selection — the ONE way the selection changes (the
  // Step 2 picker, the CHALLENGE JOE button, an incoming-challenge
  // handoff). While a duel is live the pickers are locked, so this
  // only ever fires before a duel or after one. After a FINISHED
  // duel it also retires that duel's snapshot: stageOpponent and the
  // move labels read battleState while it exists (by design — the
  // result moment keeps the finished fighters on stage, healed), so
  // without this the stage kept previewing the OLD opponent and the
  // labels kept the OLD type matchup after the player had already
  // picked someone new, until the next duel started (live
  // run-through 2026-11-12: Joe stayed on stage after switching to
  // Emberwing). Clearing here makes every (re)selection refresh the
  // stage preview and recompute the labels against the newly
  // selected opponent, exactly like a fresh load.
  const selectOpponentIndex = (idx: number) => {
    setOpponentIndex(idx);
    if (duelOver) {
      setBattleState(null);
      setDuelOver(false);
      setBattleResult(null);
      setWinResult(null);
    }
  };
  // The 'taunt' status clears itself after 2s. That timeout must never
  // erase a decided result: it once fired a second after a defeat and
  // blanked Battle Status. It is cleared on duel end and only clears the
  // event if it is still 'taunt'.
  const tauntTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The KO fast path: the result used to wait for the AI turn's 1000ms
  // timeout to notice the opponent was at 0 HP, so the banner lagged
  // 2–4s after the KO. handleMoveSelect schedules the completion
  // ~600ms after the killing hit instead (long enough for the
  // lunge/damage-pop to be seen, short enough to feel instant), and
  // the AI timeout below is guarded by outcomeRef so it cannot
  // complete the duel a second time.
  const koTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The opponent currently facing the player (first business navitar by default).
  const opponentNavitar = businessNavitars[opponentIndex] ?? businessNavitars[0] ?? null;
  // The outcome decided when a duel ends. The animation reads this when it
  // completes, instead of trusting battleEvent (a timeout may clear it).
  const outcomeRef = useRef<'victory' | 'defeat' | null>(null);
  // The decided result, shown persistently in Battle Status until the
  // player starts a new duel or dismisses it. playerHpLeft is the
  // navitar's HP at the moment the duel ended — the result card carries
  // the final score in text, because the HP bars are healed to full on
  // duel end (see handleCompleteBattle) and would otherwise hide it.
  const [battleResult, setBattleResult] = useState<{
    outcome: 'victory' | 'defeat';
    opponentName: string;
    points: number;
    playerHpLeft: number;
  } | null>(null);
  // The XP this duel earned, captured when the duel banks (bankDuel
  // calls completeBattle exactly once via settledRef, eagerly in
  // handleCompleteBattle, before the result dialog opens). The result
  // card is set before banking, so the XP / level-up lines are visible
  // in the dialog from its first render — the same moment the points
  // bank. Cleared with the result on a new duel or dismiss.
  const [winResult, setWinResult] = useState<WinResult | null>(null);
  // Once the result is decided no more moves may land — the AI timeout
  // from the last move can otherwise fire after the duel is over.
  const [duelOver, setDuelOver] = useState(false);
  // Guard (battle features pass): the player braced with Guard and
  // the opponent's next hit lands halved. State (not just a ref) so
  // the "🛡️ Guarding" chip can show while it is armed; the AI turn
  // that consumes it is scheduled by the same action that armed it,
  // and the closure reads the local flag — this state is the display
  // mirror. The OPPONENT's guard is the mirror image across turns
  // (armed in the AI closure, consumed by the player's next attack),
  // so it lives in a ref; nothing renders it but the battle log.
  const [playerGuarding, setPlayerGuarding] = useState(false);
  const opponentGuardRef = useRef(false);
  // Slots 2–5 each have their own 2s cooldown (same feel as the fast
  // move's 2s cooldown): the timestamp until which that slot is cooling
  // down, keyed by the slot's index in the extra-attacks list (0–3).
  // The timeout clears the entry — and re-renders — when the cooldown
  // ends, so the button re-enables on its own. Cleared when a new duel
  // starts, so a fresh duel never opens on cooldown.
  const [extraCooldownUntil, setExtraCooldownUntil] = useState<Record<number, number>>({});
  const extraCooldownTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Battle log — what actually happened, newest last. Displayed in
  // Battle Status (the old bare "taunt" word told the player nothing).
  // A taunt line can stay as flavor, but the log is the record.
  const [battleLog, setBattleLog] = useState<string[]>([]);
  // Joe the Announcer + Joe the Judge — one "Joe says:" line per battle
  // event, and the judge's verdict when the duel ends. duelStatsRef
  // tracks what the verdict can name: a super-effective hit either
  // way, a low-HP comeback, and the round count. Stats live in a ref
  // (no re-render needed mid-duel); the line and verdict are state.
  // The {player} placeholder in a line is the attacker of that moment,
  // {opponent} the defender — sayJoe fills them in per event.
  const [joeLine, setJoeLine] = useState<string | null>(null);
  const [joeVerdictText, setJoeVerdictText] = useState<string | null>(null);
  const lastJoeLineRef = useRef<string | undefined>(undefined);
  const duelStatsRef = useRef({
    playerSuperEffective: false,
    opponentSuperEffective: false,
    playerWasLow: false,
    lowHpAnnounced: false,
    rounds: 0,
  });
  const sayJoe = useCallback(
    (event: JoeAnnounceEvent, attackerName?: string, defenderName?: string) => {
      const line = pickJoeLine(event, lastJoeLineRef.current);
      lastJoeLineRef.current = line;
      setJoeLine(
        line
          .replace(/\{player\}/g, attackerName ?? userNavitar?.name ?? 'you')
          .replace(/\{opponent\}/g, defenderName ?? 'opponent')
      );
    },
    // Every call site passes both names explicitly; the fallbacks are
    // safety only. (opponentNavitar is declared later in this component,
    // so it must not appear in this dependency array.)
    [userNavitar?.name]
  );
  // Potions — counts live in localStorage (src/utils/potions.ts) and
  // are re-read after every use, so the row always shows the live
  // count. Health/Recharge only work mid-duel and never consume the
  // player's turn (no handleMoveSelect call, so no AI counter);
  // Power Draught is armed between duels and consumed by the next
  // duel's handleBattle.
  const [potionCounts, setPotionCounts] = useState<PotionCounts>(() => getPotions());
  const [powerBoostArmed, setPowerBoostArmed] = useState<boolean>(() => isPowerBoostArmed());
  // Whether the CURRENT duel runs under a consumed Power Draught.
  // Set from consumePowerBoost() in handleBattle and cleared when the
  // duel ends. playerMoves reads it, so the fast move a click actually
  // deals carries the +5 — the boost used to live only on the
  // battleState copy that feeds the (buttonless) charge move, while
  // playerMoves read the unboosted context navitar and dealt base
  // damage. Slots 2–5 never read this flag (see extraAttacks).
  const [powerBoostActive, setPowerBoostActive] = useState(false);
  const refreshPotions = useCallback(() => {
    setPotionCounts(getPotions());
    setPowerBoostArmed(isPowerBoostArmed());
  }, []);
  useEffect(() => {
    refreshPotions();
  }, [refreshPotions]);
  // VS intro: brief face-off when a duel starts. Moves are gated until
  // it dismisses (~2s, or a tap — the overlay is the dismiss button).
  // 2s, not 1.2s: the old 1.2s hold kept being missed entirely in the
  // real browser — the remote screenshot pipeline's click-to-capture
  // latency is ~1.2s — while the code was verified correct (the overlay
  // renders, anchored in the stage's positioned Paper, backdrop
  // instant, no timer clears it early). The moment has to survive a
  // slow first look, and a Street Fighter-style face-off reads at 2s.
  const VS_INTRO_MS = 2000;
  const [vsActive, setVsActive] = useState(false);
  const vsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fight countdown (Eddie, 2026-11-12): after the VS intro, a big
  // centre-stage 3 → 2 → 1 → FIGHT! at ~600ms a beat. ALL duel
  // controls are gated while a beat is showing (movesEnabled /
  // potionLive include `countdown === null`, and the move/potion
  // handlers check it too), and the opponent cannot act during it —
  // AI turns are only ever scheduled by a player move, which cannot
  // fire. The countdown runs on EVERY duel start, rematches
  // included; unlike the VS intro it is not tap-skippable (it is
  // ~2.4s end to end). introSettledRef makes the VS dismiss exactly
  // once per duel — the 2s timer and a player tap race to end the
  // intro, and only the winner starts the countdown.
  const COUNTDOWN_BEAT_MS = 600;
  const [countdown, setCountdown] = useState<3 | 2 | 1 | 'FIGHT' | null>(null);
  const countdownTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const introSettledRef = useRef(true);
  const startCountdown = useCallback(() => {
    for (const timer of countdownTimersRef.current) clearTimeout(timer);
    countdownTimersRef.current = [
      setTimeout(() => setCountdown(2), COUNTDOWN_BEAT_MS),
      setTimeout(() => setCountdown(1), COUNTDOWN_BEAT_MS * 2),
      setTimeout(() => setCountdown('FIGHT'), COUNTDOWN_BEAT_MS * 3),
      setTimeout(() => setCountdown(null), COUNTDOWN_BEAT_MS * 4),
    ];
    setCountdown(3);
  }, []);
  const endVsIntro = useCallback(() => {
    if (introSettledRef.current) return;
    introSettledRef.current = true;
    if (vsTimeoutRef.current) {
      clearTimeout(vsTimeoutRef.current);
      vsTimeoutRef.current = null;
    }
    setVsActive(false);
    startCountdown();
  }, [startCountdown]);
  // handleBattle arms the VS timer before endVsIntro's render copy
  // exists in scope order — call it through a ref, like the duel
  // starter used to be called.
  const endVsIntroRef = useRef(endVsIntro);
  endVsIntroRef.current = endVsIntro;
  // Stage feedback: who lunges / flinches, and the damage number that
  // pops over the fighter that was hit. Cleared ~700ms after the hit so
  // the same animation can fire again on the next move.
  const [playerAnim, setPlayerAnim] = useState<'' | 'lunge' | 'shake'>('');
  const [opponentAnim, setOpponentAnim] = useState<'' | 'lunge' | 'shake'>('');
  const [damagePop, setDamagePop] = useState<{
    key: number;
    value: number;
    target: 'player' | 'opponent';
  } | null>(null);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The venue governing the current duel, captured at Challenge time
  // from the CHECK-IN state (see handleBattle). It is kept as state —
  // not read live from the context — so the stage backdrop and the
  // venue-win credit describe the duel that was actually fought, and
  // a rematch replays on the same field.
  const [duelVenueId, setDuelVenueId] = useState<string | null>(null);
  // Settle guard: the duel's points + venue win must bank exactly once.
  // The animation's onComplete and the dialog's Dismiss/Rematch buttons
  // all settle the duel, and without this guard a button clicked at the
  // same moment the animation completes would bank twice.
  const settledRef = useRef(false);
  // Rematch needs the last challenged opponent even after the picker
  // moves on.
  const lastOpponentIdRef = useRef<string | null>(null);
  // An INCOMING challenge handed over by another page (a venue meet,
  // a friend/person challenge, a wild encounter): the opponent id,
  // waiting on the Step 2 approval gate. Nothing auto-starts a duel
  // any more (Eddie's flow rule, 2026-11-12): the handoff only
  // PRE-SELECTS the opponent and raises this card; the player must
  // APPROVE (or DECLINE) and then press START BATTLE themselves.
  const [incomingOpponentId, setIncomingOpponentId] = useState<string | null>(null);

  // A challenge handed over from another page pre-selects that
  // person's navitar here and raises the approval gate (Step 2 of
  // the entry flow). The opponent is added to businessNavitars first
  // (by the meet card / friend helper), so this waits until it
  // appears in the list, then consumes the pending id. The venue id
  // is NOT consumed here — it survives until the battle completes,
  // so a win at that venue unlocks its winner perk. It used to also
  // AUTO-START the duel (the venue flow had collected a confirmation
  // upstream); Eddie's flow rule replaces that: a handoff is an
  // incoming challenge the player approves or declines HERE, and
  // only the START BATTLE button starts a duel.
  useEffect(() => {
    if (!pendingOpponentId) return;
    const idx = businessNavitars.findIndex(n => n.id === pendingOpponentId);
    if (idx >= 0) {
      selectOpponentIndex(idx);
      consumePendingOpponent();
      setIncomingOpponentId(pendingOpponentId);
    }
  }, [pendingOpponentId, businessNavitars, consumePendingOpponent]);

  // Matchmaking default (fix wave 3): when the player's FIGHTER
  // changes (Step 1 pick, first navitar created), pre-select a fair
  // fight — the first Even match in roster order, else the weakest
  // non-boss opponent. Before this, the picker opened on index 0
  // (Quantix, Lv 22) whatever the player's level, so a fresh Lv
  // 1–5 fighter's default fight was unwinnable. Keyed on the
  // fighter's ID only: levelling up mid-session keeps the opponent
  // the player chose, and an incoming-challenge handoff (pending or
  // raised on the approval gate) always wins over the default.
  const userFighterId = userNavitar?.id ?? null;
  const userFighterLevel = userNavitar?.level ?? null;
  useEffect(() => {
    if (!userFighterId || userFighterLevel === null) return;
    if (pendingOpponentId || incomingOpponentId) return;
    if (businessNavitars.length === 0) return;
    let target = businessNavitars.findIndex(n => matchTierFor(userFighterLevel, n) === 'even');
    if (target < 0) {
      let weakest = Infinity;
      businessNavitars.forEach((n, i) => {
        if (n.id === JOE_OPPONENT_ID) return;
        if (n.level < weakest) {
          weakest = n.level;
          target = i;
        }
      });
    }
    if (target >= 0) selectOpponentIndex(target);
    // (selectOpponentIndex is re-created every render; the effect
    // is keyed on the fighter changing, not on the callback.)
  }, [userFighterId]);

  // Declining an incoming challenge: drop the approval card and the
  // stored challenge venue (bookkeeping for a duel that will not
  // happen). The opponent stays in the picker — the player can still
  // pick them manually and press START BATTLE, which is their own
  // explicit choice, not a handoff.
  const handleDeclineIncoming = useCallback(() => {
    setIncomingOpponentId(null);
    clearChallengeVenue();
  }, [clearChallengeVenue]);

  // Approving: the matchup stands (the opponent is already selected)
  // and the flow moves to Step 3 — START BATTLE is the tap that
  // actually starts the duel.
  const handleApproveIncoming = useCallback(() => {
    setIncomingOpponentId(null);
  }, []);

  // Keep the stage in view when a duel starts. Starting a duel used
  // to leave the view down at the moves/log with the stage a page
  // above (live check 2026-11-12) — the start button sits below
  // the fold, and nothing brought the fight back into view. On the
  // null → live transition of battleState (START BATTLE click,
  // rematch), scroll to the TOP OF THE STAGE so the duel
  // is what the player is looking at. Mid-duel state churn (every
  // move replaces battleState) must not re-scroll: only the
  // transition fires. Guarded + try/catch: jsdom's scrollIntoView is
  // a not-implemented stub (the smoke harness counts jsdom errors).
  const stageAnchorRef = useRef<HTMLDivElement>(null);
  const wasDuelingRef = useRef(false);
  useEffect(() => {
    const dueling = battleState !== null;
    if (dueling && !wasDuelingRef.current) {
      const el = stageAnchorRef.current;
      if (el && typeof el.scrollIntoView === 'function') {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          // Scrolling is a nicety, never a duel-breaker.
        }
      }
    }
    wasDuelingRef.current = dueling;
  }, [battleState]);

  const handleCreateNavitar = () => {
    if (navitarName && navitarSkills) {
      createUserNavitar(
        navitarName,
        navitarSkills.split(',').map(skill => skill.trim()),
        selectedLook
      );
      setIsCreateNavitarOpen(false);
      setNavitarName('');
      setNavitarSkills('');
      setSelectedLook(ALL_NAVITAR_LOOKS[0].src);
    }
  };

  // Health Potion — heals the local duel navitar only (the context
  // navitar is never hurt), and does NOT consume the player's turn:
  // no handleMoveSelect call, so the AI gets no counter.
  const handleUseHealthPotion = () => {
    if (!battleState || duelOver || vsActive || countdown !== null) return;
    if (!usePotion('health')) return;
    setBattleState(prev =>
      prev
        ? {
            ...prev,
            playerNavitar: {
              ...prev.playerNavitar,
              hp: Math.min(prev.playerNavitar.maxHp, prev.playerNavitar.hp + 30),
            },
          }
        : prev
    );
    setBattleLog(prev => [...prev.slice(-5), 'Used a Health Potion — +30 HP']);
    refreshPotions();
  };

  // Recharge — same rules as the Health Potion: mid-duel only, no
  // turn consumed, no AI counter.
  const handleUseRecharge = () => {
    if (!battleState || duelOver || vsActive || countdown !== null) return;
    if (!usePotion('recharge')) return;
    setBattleState(prev =>
      prev ? { ...prev, playerEnergy: Math.min(100, prev.playerEnergy + 50) } : prev
    );
    setBattleLog(prev => [...prev.slice(-5), 'Used a Recharge — +50 energy']);
    refreshPotions();
  };

  // Power Draught — armed between duels only. The armed flag is
  // consumed by the next handleBattle, so it boosts exactly one duel.
  const handleArmPowerDraught = () => {
    if (battleState && !duelOver) return;
    if (!armPowerBoost()) return;
    refreshPotions();
  };

  const handleBattle = (businessNavitarId: string, venueId?: string | null) => {
    if (!userNavitar) return;
    const opponent = businessNavitars.find(n => n.id === businessNavitarId);
    if (!opponent) return;
    const battleId = challengeBusinessNavitar(businessNavitarId);
    if (!battleId) return;
    // A fresh duel clears the previous result — the old one must not
    // linger into the new fight.
    setBattleResult(null);
    setWinResult(null);
    setJoeLine(null);
    setJoeVerdictText(null);
    // Power Draught: consumed exactly once, by the next duel only.
    // The +5 goes on the player's fastMove BEFORE toBattleNavitar
    // derives the charge move (Power Strike = 2× fastMove), so both
    // moves carry the boost — fastMove +5, chargeMove +10 — and the
    // boost is never re-armed here.
    const powerBoost = consumePowerBoost();
    setPowerBoostActive(powerBoost);
    const playerSource = powerBoost
      ? {
          ...userNavitar,
          fastMove: { ...userNavitar.fastMove, damage: userNavitar.fastMove.damage + 5 },
        }
      : userNavitar;
    const startLog = [`${userNavitar.name} VS ${opponent.name} — FIGHT!`];
    if (powerBoost) startLog.push('Power Draught active — +5 damage this duel');
    setBattleLog(startLog);
    // A fresh duel resets Joe's running stats — a new duel's verdict
    // must name this duel's turning point, not the last one's.
    duelStatsRef.current = {
      playerSuperEffective: false,
      opponentSuperEffective: false,
      playerWasLow: false,
      lowHpAnnounced: false,
      rounds: 0,
    };
    // Joe calls the fight. A power draught is the bigger moment, so it
    // gets the line when one is armed.
    if (powerBoost) sayJoe('powerDraught', userNavitar.name, opponent.name);
    else sayJoe('fightStart', userNavitar.name, opponent.name);
    setDuelOver(false);
    settledRef.current = false;
    // A fresh duel starts unguarded on both sides, with the intro
    // unsettled (timer/tap race armed) and no countdown left over.
    setPlayerGuarding(false);
    opponentGuardRef.current = false;
    introSettledRef.current = false;
    for (const timer of countdownTimersRef.current) clearTimeout(timer);
    countdownTimersRef.current = [];
    setCountdown(null);
    lastOpponentIdRef.current = businessNavitarId;
    // The stage backdrop is the field the player is standing in: the
    // CHECKED-IN venue, captured now. A rematch passes the venue
    // explicitly, so the backdrop survives settling. The pending
    // challenge's stored venue (challengeVenueId) is deliberately NOT
    // consulted: it records where a challenge was issued, and letting
    // it govern pinned /battle to a stale venue — an old Valley Ember
    // handoff kept every /battle duel in Fire World through a
    // check-out and a fresh Griffith Park check-in alike, while
    // person-challenges (which follow check-in) fought in Nature
    // World (live check 2026-11-12). Check-in is the one truth.
    setDuelVenueId(venueId !== undefined ? venueId : (checkedInVenueId ?? null));
    if (tauntTimeoutRef.current) {
      clearTimeout(tauntTimeoutRef.current);
      tauntTimeoutRef.current = null;
    }
    if (vsTimeoutRef.current) clearTimeout(vsTimeoutRef.current);
    if (koTimeoutRef.current) {
      clearTimeout(koTimeoutRef.current);
      koTimeoutRef.current = null;
    }
    // A fresh duel never opens on cooldown: clear the slots 2–5
    // cooldown timers and state left over from the last duel.
    for (const timer of extraCooldownTimersRef.current) clearTimeout(timer);
    extraCooldownTimersRef.current = [];
    setExtraCooldownUntil({});
    // VS intro: the duel starting must be VISIBLE. A duel that starts
    // silently (status still reading "No battle yet") reads as a dead
    // button — the browser check clicked CHALLENGE twice and concluded
    // it did nothing, because nothing on screen changed until a move
    // landed. The intro shows immediately; when it dismisses (~2s, or
    // a tap) the fight countdown runs, and moves stay gated until
    // FIGHT! clears.
    setVsActive(true);
    vsTimeoutRef.current = setTimeout(() => endVsIntroRef.current(), VS_INTRO_MS);
    setBattleEvent(null);
    // Start the local duel: the moves panel and the AI turn run off this
    // state. Without it the panel early-returns and nothing can happen.
    setBattleState({
      playerNavitar: toBattleNavitar(playerSource),
      opponentNavitar: toBattleNavitar(opponent),
      playerEnergy: 100,
      opponentEnergy: 100,
      isPlayerTurn: true,
      isDodging: false,
      battleLog: [],
      damagePreview: 0,
    });
    // The armed flag was consumed above — refresh so the Potions row
    // stops showing the armed state.
    refreshPotions();
    setIsPlayerTurn(true);
    outcomeRef.current = null;
    setCurrentBattleId(battleId);
  };

  // Bank a finished duel — completeBattle (points + XP, exactly once
  // via settledRef) + the venue win + clearing the challenge venue —
  // WITHOUT closing the result dialog and WITHOUT nulling
  // currentBattleId (the Dialog renders <BattleAnimation> only while
  // currentBattleId is set; nulling it early would unmount the
  // animation inside the open dialog). Called eagerly from
  // handleCompleteBattle so the dialog opens with winResult already
  // set and the +XP / LEVEL UP lines visible.
  const bankDuel = async (battleId: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    // completeBattle expects the winner's navitar id, not a boolean.
    // The outcome was decided when the duel ended (see handleCompleteBattle).
    const battle = activeBattles.find(b => b.id === battleId);
    const winnerId =
      outcomeRef.current === 'defeat'
        ? (battle?.defender.id ?? '')
        : (battle?.challenger.id ?? userNavitar?.id ?? '');
    // completeBattle banks the points and the XP and returns what the
    // win earned — captured here so the result card can show it.
    const result = await completeBattle(battleId, winnerId);
    if (result) setWinResult(result);
    // Joe's Champion: the title is earned by WINNING the Joe fight
    // (the boss duel against the demo opponent demo-joe). It used to
    // be the quiz's prize; the quiz is scrapped (Eddie, 2026-11-12),
    // so the award moved here — the duel's one banking path.
    if (outcomeRef.current === 'victory' && battle?.defender.id === JOE_OPPONENT_ID) {
      if (earnTitle(JOE_TITLES.win)) {
        setBattleLog(prev => [
          ...prev.slice(-5),
          `🎙️ Joe: "You actually did it. Joe's Champion — that title is yours now."`,
        ]);
      }
    }
    // A win on the field the duel was fought on unlocks that venue's
    // winner perk: the venue captured at Challenge time from the
    // check-in state (duelVenueId), NOT the pending challenge's stored
    // venue — a stale handoff must not credit a win to a venue the
    // duel never visited. The pending handoff itself is consumed
    // either way — the challenge is over.
    if (outcomeRef.current === 'victory' && duelVenueId) {
      recordVenueWin(duelVenueId);
    }
    if (challengeVenueId) clearChallengeVenue();
    // Do NOT reset battleState here: the post-duel HP must stay visible
    // (the old reset silently put both navitars back to full HP, as if
    // the duel never happened). A new Challenge re-inits it via
    // handleBattle; the result card above stays until dismissed.
  };

  // playerHpLeft is the navitar's HP at the instant the duel ended.
  // It is captured here (not read from state later) because the bars
  // are healed to full on duel end — the result card is the only place
  // the final score survives (defect 3: Battle showed 6/105 while
  // Profile and the companion showed 105/105).
  const handleCompleteBattle = async (
    battleId: string,
    outcome: 'victory' | 'defeat',
    playerHpLeft: number
  ) => {
    // Exactly one completion per duel: a racing second call (the KO
    // timer vs the AI timer vs a Forfeit tap) must never re-bank or
    // flip the decided outcome. handleBattle resets the ref to null
    // for each fresh duel.
    if (outcomeRef.current) return;
    outcomeRef.current = outcome;
    setDuelOver(true);
    // The brace never outlives the duel it was raised in.
    setPlayerGuarding(false);
    opponentGuardRef.current = false;
    // The draught boosted this duel only: once the duel is over the
    // fast move goes back to its stored damage (which, after a
    // level-up, is the NEW damage — playerMoves reads the live
    // context navitar, so clearing here keeps it from showing +5 on
    // a duel that has already ended).
    setPowerBoostActive(false);
    if (tauntTimeoutRef.current) {
      clearTimeout(tauntTimeoutRef.current);
      tauntTimeoutRef.current = null;
    }
    setBattleEvent(outcome);
    // Heal after battle: the duel's damage lives only in the local
    // battleState, while the context navitar (Profile, companion) was
    // never hurt — so every page disagreed after a duel. Both fighters
    // return to full HP everywhere; the final score rides in the result
    // text instead.
    setBattleState(prev =>
      prev
        ? {
            ...prev,
            playerNavitar: { ...prev.playerNavitar, hp: prev.playerNavitar.maxHp },
            opponentNavitar: { ...prev.opponentNavitar, hp: prev.opponentNavitar.maxHp },
          }
        : prev
    );
    // The result persists (Battle Status shows it until a new duel or a
    // dismiss). Points for a win are the opponent's level x 10 — the
    // same value completeBattle banks — so the message and the bank agree.
    // cp is level x 10 by construction (see toBattleNavitar).
    const opponentName = battleState?.opponentNavitar.name ?? opponentNavitar?.name ?? 'opponent';
    // Joe the Judge: the end line first (a comeback from low HP gets
    // the comeback call), then the verdict naming this duel's turning
    // point from the stats tracked during it.
    const stats = duelStatsRef.current;
    if (outcome === 'victory') {
      if (stats.playerWasLow) sayJoe('comeback', userNavitar?.name, opponentName);
      else sayJoe('victory', userNavitar?.name, opponentName);
    } else {
      sayJoe('defeat', userNavitar?.name, opponentName);
    }
    setJoeVerdictText(
      joeVerdict({
        outcome,
        superEffectiveHit: stats.playerSuperEffective,
        opponentSuperEffectiveHit: stats.opponentSuperEffective,
        wasLowHp: stats.playerWasLow,
        hpLeftFraction:
          playerHpLeft / Math.max(1, battleState?.playerNavitar.maxHp ?? playerHpLeft),
        rounds: stats.rounds,
      })
    );
    setBattleResult({
      outcome,
      opponentName,
      points: outcome === 'victory' ? (battleState?.opponentNavitar.cp ?? 0) : 0,
      playerHpLeft,
    });
    setBattleLog(prev => [
      ...prev.slice(-5),
      outcome === 'victory'
        ? `${userNavitar?.name} beat ${opponentName} — ${playerHpLeft} HP left`
        : `${opponentName} won this time — ${userNavitar?.name} was knocked out`,
    ]);
    // Bank EAGERLY, before the dialog opens: the result Dialog opens
    // with winResult already set, so the +XP / LEVEL UP lines are
    // visible from the first render instead of never. bankDuel takes
    // the battle id as a parameter — currentBattleId state is not
    // reliable here — and does not null it or close the dialog.
    await bankDuel(battleId);
    setShowBattleAnimation(true);
    setCurrentBattleId(battleId);
  };

  // Settling the duel closes the result dialog. The banking already
  // happened eagerly in handleCompleteBattle; if this is reached
  // without that (defensive), bank first. The animation's onComplete
  // and the dialog's Dismiss/Rematch buttons all settle — the guard
  // in bankDuel makes it exactly-once.
  const settleDuel = async () => {
    if (!settledRef.current && currentBattleId) {
      await bankDuel(currentBattleId);
    }
    setCurrentBattleId(null);
    setShowBattleAnimation(false);
  };

  // Forfeit — the duel's exit door (live audit 2026-11-12: reviewers
  // look for one). Ends the duel as a loss through the SAME completion
  // path as a KO defeat (streak reset, duel record +1 loss, no XP, no
  // points — a loss costs nothing, as everywhere in this game), then
  // settles straight back to the arena without the result dialog.
  // Available from the moment the duel starts (VS intro and countdown
  // included — a mis-tapped START BATTLE should be escapable), and
  // race-safe: pending duel timers check outcomeRef, which the
  // completion sets first.
  const handleForfeit = async () => {
    if (!battleState || !currentBattleId || duelOver) return;
    if (koTimeoutRef.current) {
      clearTimeout(koTimeoutRef.current);
      koTimeoutRef.current = null;
    }
    if (vsTimeoutRef.current) clearTimeout(vsTimeoutRef.current);
    for (const timer of countdownTimersRef.current) clearTimeout(timer);
    countdownTimersRef.current = [];
    setCountdown(null);
    setVsActive(false);
    await handleCompleteBattle(currentBattleId, 'defeat', battleState.playerNavitar.hp);
    await settleDuel();
  };

  const handleAnimationComplete = async () => {
    await settleDuel();
  };

  // Rematch: settle the old duel (banks its points exactly once), then
  // start a fresh duel against the same opponent.
  const handleRematch = async () => {
    await settleDuel();
    if (lastOpponentIdRef.current) handleBattle(lastOpponentIdRef.current, duelVenueId);
  };

  const getBusinessName = (businessId: string) => {
    return businesses.find(b => b.id === businessId)?.name || 'Unknown Business';
  };

  // Converts a fight-club navitar into the local duel shape. cp is a display
  // power rating (level x 10); the charge move is derived from the fast move
  // (a Power Strike at double damage) because the fight-club model stores
  // one real move per navitar.
  const toBattleNavitar = (n: {
    name: string;
    element:
      | 'ice'
      | 'fire'
      | 'nature'
      | 'shadow'
      | 'light'
      | 'quantum'
      | 'electric'
      | 'spiritual'
      | 'water';
    level: number;
    hp: number;
    maxHp: number;
    imageUrl?: string;
    modelUrl?: string;
    modelZoom?: number;
    modelRotationY?: number;
    modelYOffset?: number;
    fastMove: { name: string; damage: number; energyGain: number; cooldown: number };
  }): Navitar => ({
    name: n.name,
    type: n.element,
    cp: n.level * 10,
    hp: n.hp,
    maxHp: n.maxHp,
    imageUrl: n.imageUrl,
    modelUrl: n.modelUrl,
    modelZoom: n.modelZoom,
    modelRotationY: n.modelRotationY,
    modelYOffset: n.modelYOffset,
    fastMove: n.fastMove,
    chargeMove: {
      name: 'Power Strike',
      damage: n.fastMove.damage * 2,
      energyCost: 20,
    },
    moves: [
      {
        name: n.fastMove.name,
        type: n.element,
        damage: n.fastMove.damage,
        energyGain: n.fastMove.energyGain,
        energyCost: 0,
        cooldown: n.fastMove.cooldown,
      },
    ],
  });

  // A navitar's Personality Traits section shows playerTraits, which
  // nothing ever populated — so a fresh navitar's section was blank even
  // though it has skills. Seed one trait from the navitar's first skill
  // (name = the skill, value 50) as the display fallback; real trait
  // editing (NavitarPersonality) still overrides it when it lands.
  const traitFromSkill = (skill: string): PersonalityTrait => ({
    name: skill,
    value: 50,
    description: `Signature skill: ${skill}`,
    dialogue: skill,
    battleStrategy: {
      preferredMoves: [skill],
      preferredTarget: 'health',
      aggression: 50,
      defense: 50,
    },
  });
  const displayedPlayerTraits =
    playerTraits.length > 0
      ? playerTraits
      : (userNavitar?.skills.filter(Boolean).slice(0, 1).map(traitFromSkill) ?? []);
  const displayedOpponentTraits =
    opponentTraits.length > 0
      ? opponentTraits
      : (opponentNavitar?.skills.filter(Boolean).slice(0, 1).map(traitFromSkill) ?? []);

  // The fight-club model stores one real move (fastMove) per navitar; the
  // moves panel wants a list, so it shows that move, typed by the navitar's
  // element. A full move list is a future creation-screen upgrade.
  // Power Draught: the +5 lives here, on the move a click actually
  // deals — handleMoveSelect takes its damage straight from this
  // list, and BattleMoves displays this same number, so the badge
  // ("Power Draught active — +5 damage this duel"), the card and the
  // damage dealt all agree. The boost applies ONLY while a duel that
  // consumed a draught is live (battleState set, not yet over): an
  // armed-but-unfought draught still shows base damage before
  // Challenge, and a finished duel shows the stored damage (the new
  // damage after a level-up). It is NOT read from the battleState
  // copy — that snapshot goes stale on level-up, and this list must
  // track the live context navitar. Slots 2–5 (extraAttacks) are
  // untouched: they never get the draught boost.
  const powerBoostLive = powerBoostActive && battleState !== null && !duelOver;
  // Honest damage labels (fix, live audit 2026-11-12): move buttons
  // showed PRE-effectiveness damage — Power Strike listed 62 and dealt
  // 31 against a fire opponent. The labels now carry the type-chart
  // multiplier against the opponent actually faced (the duel snapshot
  // mid-duel, the selected opponent before it — and after it, because
  // re-selecting an opponent retires the finished duel's snapshot;
  // see selectOpponentIndex), and BattleMoves
  // renders the adjusted number plus a ×2 / ×0.5 tag. The chart and
  // the damage math are unchanged — only the label caught up with
  // what lands. (A raised opponent Guard can still halve a hit; that
  // is a visible state, announced on its chip and in the log.)
  const labelOpponentType = battleState?.opponentNavitar.type ?? opponentNavitar?.element ?? null;
  const playerEffectiveness = labelOpponentType
    ? getTypeEffectiveness(userNavitar?.element ?? 'ice', labelOpponentType)
    : 1;
  const playerMoves = userNavitar
    ? [
        {
          name: userNavitar.fastMove.name,
          type: userNavitar.element,
          damage: userNavitar.fastMove.damage + (powerBoostLive ? 5 : 0),
          energyGain: userNavitar.fastMove.energyGain,
          energyCost: 0,
          cooldown: userNavitar.fastMove.cooldown,
          description: `${userNavitar.fastMove.name} — a quick strike.`,
          effectiveness: playerEffectiveness,
        },
      ]
    : [];

  // Slots 2–5 of the custom-attack list: extra duel moves for a navitar
  // WITH valid attacks. attacks[0] is slot 1 — the fast move — and
  // already flows through playerMoves above, because the data layer
  // re-derives fastMove from attacks[0] at the navitar's level; it is
  // not rebuilt here. Slots 2–5 are labelled with the attack name and
  // its scaled damage at the navitar's current level (1.3x per level).
  // They never get the Power Draught boost — the +5 lives on fastMove
  // only (handleBattle's battleState copy + playerMoves) — and a
  // navitar WITHOUT valid attacks (every
  // opponent, and any legacy player navitar) gets no extra slots at
  // all: exactly today's single fast move + Power Strike. Opponent
  // attacks are never read here; opponent.attacks is undefined by
  // design.
  const extraAttacks: { name: string; damage: number }[] =
    userNavitar && isValidAttacks(userNavitar.attacks)
      ? userNavitar.attacks.slice(1).map(attack => ({
          name: attack.name,
          damage: attackPowerAtLevel(attack.power, userNavitar.level),
        }))
      : [];

  // Stage feedback: the attacker's art lunges, the defender flinches,
  // a damage number pops over the defender. Cleared ~700ms after the
  // hit so the same animation can fire again on the next move.
  const flashAttack = (
    attacker: 'player' | 'opponent',
    defender: 'player' | 'opponent',
    damage: number
  ) => {
    if (attacker === 'player') {
      setPlayerAnim('lunge');
      setOpponentAnim('shake');
    } else {
      setOpponentAnim('lunge');
      setPlayerAnim('shake');
    }
    setDamagePop({ key: Date.now(), value: damage, target: defender });
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    animTimeoutRef.current = setTimeout(() => {
      setPlayerAnim('');
      setOpponentAnim('');
      setDamagePop(null);
    }, 700);
  };

  // One player action = one turn. Three kinds share this executor so
  // the turn machinery (turn gating, the AI counter, the KO fast
  // path, Joe's calls, the battle log) exists exactly once:
  //  - attack: a move (fast move, an extra slot, or Power Strike via
  //    handleMoveSelect below) — damage through the type chart, the
  //    energy economy on the move's own gain/cost.
  //  - guard (NEW): no damage, no energy change. The opponent's next
  //    hit this turn lands HALVED (the AI closure below applies it);
  //    if the opponent does not strike (it guards too, or has no
  //    move), the guard lapses — it never carries past the AI turn
  //    it was raised against.
  //  - focus (NEW): no damage; +30 energy (capped at 100) toward the
  //    next Power Strike. One clean effect, no attack buff.
  // Guard and Focus consume the turn exactly like an attack — the AI
  // counters after them. Neither gets a Joe call or a stage lunge:
  // no hit landed.
  type PlayerAction = { kind: 'attack'; move: Move } | { kind: 'guard' } | { kind: 'focus' };
  const FOCUS_ENERGY = 30;
  // Fight pacing (fix wave 3, Eddie 2026-11-13: "the cooldown
  // should be less"). Every pacing constant was cut ~40% so duels
  // feel snappier — damage, HP and the type chart are UNCHANGED:
  //   Power Strike charge requirement: 100 -> 60 energy (it still
  //     spends the WHOLE bar when fired — see handlePowerStrike).
  //   Opponent (AI) turn delay: 1000ms -> 600ms (in
  //     executePlayerAction below).
  //   Extra-attack slot cooldown: 2000ms -> 1200ms (handleExtraAttack).
  //   Fast-move cooldown stat: 2s -> 1.2s (battleFields in
  //     NavitarFightClub).
  const POWER_STRIKE_ENERGY = 60;
  const AI_TURN_DELAY_MS = 600;
  const EXTRA_ATTACK_COOLDOWN_MS = 1200;

  const executePlayerAction = (action: PlayerAction) => {
    if (!battleState || !isPlayerTurn || duelOver || vsActive || countdown !== null) return;

    const isAttack = action.kind === 'attack';
    const move = isAttack ? action.move : null;
    const guardArmed = action.kind === 'guard';
    const effectiveness = move
      ? getTypeEffectiveness(move.type, battleState.opponentNavitar.type)
      : 1;
    let playerDamage = move ? Math.floor(move.damage * effectiveness) : 0;
    // The opponent braced with Guard on its last turn: this hit
    // lands halved, and the brace is spent either way.
    let opponentGuardNote = '';
    if (isAttack && opponentGuardRef.current) {
      playerDamage = Math.floor(playerDamage / 2);
      opponentGuardRef.current = false;
      opponentGuardNote = ' (opponent Guard halved it)';
    }
    const energyDelta = move
      ? move.energyGain - move.energyCost
      : action.kind === 'focus'
        ? FOCUS_ENERGY
        : 0;
    setDamagePreview(playerDamage);
    if (isAttack) {
      setBattleEvent('taunt');
      if (tauntTimeoutRef.current) clearTimeout(tauntTimeoutRef.current);
      tauntTimeoutRef.current = setTimeout(
        () => setBattleEvent(prev => (prev === 'taunt' ? null : prev)),
        2000
      );
      // The stage shows the hit the moment it lands.
      flashAttack('player', 'opponent', playerDamage);
    }
    if (guardArmed) setPlayerGuarding(true);
    setBattleLog(prev => [
      ...prev.slice(-5),
      action.kind === 'attack'
        ? `${battleState.playerNavitar.name} used ${move!.name} — ${playerDamage} damage${opponentGuardNote}`
        : action.kind === 'guard'
          ? `${battleState.playerNavitar.name} used Guard — braced, the next hit lands halved`
          : `${battleState.playerNavitar.name} used Focus — +${FOCUS_ENERGY} energy`,
    ]);

    // KO fast path (see koTimeoutRef): if this hit finished the
    // opponent, complete the duel ~600ms from now — right after the
    // lunge/damage-pop plays — instead of waiting for the AI turn's
    // timeout to notice. The AI timeout below is guarded by
    // outcomeRef, so it cannot complete the duel a second time.
    // Guard/Focus deal no damage, so they never take this path.
    const newOpponentHp = Math.max(0, battleState.opponentNavitar.hp - playerDamage);
    // Joe calls the hit: the KO gets the knockout call, a double-damage
    // hit gets the super-effective call, a resisted hit gets the
    // resisted call, and a plain heavy hit gets the big-hit call.
    duelStatsRef.current.rounds += 1;
    if (isAttack) {
      if (effectiveness === 2) duelStatsRef.current.playerSuperEffective = true;
      if (newOpponentHp <= 0) {
        sayJoe('ko', battleState.playerNavitar.name, battleState.opponentNavitar.name);
      } else if (effectiveness === 2) {
        sayJoe('superEffective', battleState.playerNavitar.name, battleState.opponentNavitar.name);
      } else if (effectiveness === 0.5) {
        sayJoe('resisted', battleState.playerNavitar.name, battleState.opponentNavitar.name);
      } else if (playerDamage >= 18) {
        sayJoe('bigHit', battleState.playerNavitar.name, battleState.opponentNavitar.name);
      }
      if (newOpponentHp <= 0) {
        if (koTimeoutRef.current) clearTimeout(koTimeoutRef.current);
        koTimeoutRef.current = setTimeout(() => {
          if (currentBattleId)
            handleCompleteBattle(currentBattleId, 'victory', battleState.playerNavitar.hp);
        }, 600);
      }
    }

    // Update battle state
    setBattleState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        // Clamped at BOTH ends: Power Strike fires at 60 energy but
        // spends its full 100 cost (fix wave 3) — without the lower
        // clamp the bar would sit at −40 after firing.
        playerEnergy: Math.max(0, Math.min(100, prev.playerEnergy + energyDelta)),
        opponentNavitar: {
          ...prev.opponentNavitar,
          hp: Math.max(0, prev.opponentNavitar.hp - playerDamage),
        },
        isPlayerTurn: false,
      };
    });
    setIsPlayerTurn(false);

    // AI opponent's turn (600ms after the player's move — was
    // 1000ms before the fix-wave-3 pacing cut).
    setTimeout(() => {
      if (!battleState) return;
      // The KO fast path above already completed the duel — the AI
      // gets no turn after the KO, and must not complete it twice.
      if (outcomeRef.current) return;

      // The player's move may already have finished the opponent — then
      // the AI gets no turn and the duel ends in victory. The player's
      // HP is unchanged this round (no counter came), so it is the final score.
      if (battleState.opponentNavitar.hp - playerDamage <= 0) {
        if (currentBattleId)
          handleCompleteBattle(currentBattleId, 'victory', battleState.playerNavitar.hp);
        return;
      }

      const opponentStrategy = opponentTraits.reduce(
        (acc, trait) => ({
          preferredMoves: [...acc.preferredMoves, ...trait.battleStrategy.preferredMoves],
          preferredTarget: trait.battleStrategy.preferredTarget,
          aggression: acc.aggression + trait.value * trait.battleStrategy.aggression,
          defense: acc.defense + trait.value * trait.battleStrategy.defense,
        }),
        {
          preferredMoves: [] as string[],
          preferredTarget: 'health' as 'health' | 'defense' | 'energy',
          aggression: 0,
          defense: 0,
        }
      );

      const availableMoves = battleState.opponentNavitar.moves.filter(
        move => battleState.opponentEnergy >= move.energyCost
      );

      if (availableMoves.length === 0) {
        // No moves available, skip turn. A raised Guard lapses
        // unspent — the opponent never struck.
        if (guardArmed) setPlayerGuarding(false);
        setBattleState(prev => (prev ? { ...prev, isPlayerTurn: true } : null));
        setIsPlayerTurn(true);
        return;
      }

      // AI Guard: a hurt opponent (at or below half HP after the
      // player's action) sometimes braces instead of striking — a
      // 1-in-3 roll, and never on the duel's first exchange (it is
      // at full HP then), which keeps early turns predictable. The
      // brace halves the player's NEXT attack (consumed in
      // executePlayerAction via opponentGuardRef). The AI never
      // uses Focus: its moves cost no energy and it has no Power
      // Strike to charge, so Focus would be a no-op for it.
      const aiHpAfter = battleState.opponentNavitar.hp - playerDamage;
      if (
        aiHpAfter > 0 &&
        aiHpAfter <= battleState.opponentNavitar.maxHp * 0.5 &&
        Math.random() < 1 / 3
      ) {
        opponentGuardRef.current = true;
        // Both fighters re-set: a player Guard raised against a hit
        // that never came lapses too.
        if (guardArmed) setPlayerGuarding(false);
        setBattleLog(prev => [
          ...prev.slice(-5),
          `${battleState.opponentNavitar.name} used Guard — braced, your next hit lands halved`,
        ]);
        setBattleState(prev => (prev ? { ...prev, isPlayerTurn: true } : null));
        setIsPlayerTurn(true);
        return;
      }

      // Choose move based on strategy
      const chosenMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      const aiEffectiveness = getTypeEffectiveness(chosenMove.type, battleState.playerNavitar.type);
      let aiDamage = Math.floor(chosenMove.damage * aiEffectiveness);
      // Player Guard: this hit lands halved, and the brace is spent.
      let guardNote = '';
      if (guardArmed) {
        aiDamage = Math.floor(aiDamage / 2);
        guardNote = ' (Guard halved it)';
        setPlayerGuarding(false);
      }

      // Joe calls the counter too: a double-damage counter gets the
      // super-effective call, and dropping to a quarter of max HP or
      // less gets the low-HP call (once per duel) — the comeback
      // setup the verdict can name.
      if (aiEffectiveness === 2) {
        duelStatsRef.current.opponentSuperEffective = true;
        sayJoe('superEffective', battleState.opponentNavitar.name, battleState.playerNavitar.name);
      }
      const newPlayerHp = battleState.playerNavitar.hp - aiDamage;
      if (
        newPlayerHp > 0 &&
        newPlayerHp <= battleState.playerNavitar.maxHp * 0.25 &&
        !duelStatsRef.current.lowHpAnnounced
      ) {
        duelStatsRef.current.playerWasLow = true;
        duelStatsRef.current.lowHpAnnounced = true;
        sayJoe('lowHp', battleState.playerNavitar.name, battleState.opponentNavitar.name);
      }

      // The stage shows the counter the moment it lands.
      flashAttack('opponent', 'player', aiDamage);
      setBattleLog(prev => [
        ...prev.slice(-5),
        `${battleState.opponentNavitar.name} countered — ${aiDamage} damage${guardNote}`,
      ]);
      setBattleState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          opponentEnergy: Math.min(
            100,
            prev.opponentEnergy + chosenMove.energyGain - chosenMove.energyCost
          ),
          playerNavitar: {
            ...prev.playerNavitar,
            hp: Math.max(0, prev.playerNavitar.hp - aiDamage),
          },
          isPlayerTurn: true,
        };
      });
      setIsPlayerTurn(true);

      // Check for defeat with the post-hit HP (the player's HP minus the
      // AI's damage). An opponent killed by the player's move was already
      // handled at the top of this timeout.
      if (battleState.playerNavitar.hp - aiDamage <= 0) {
        if (currentBattleId)
          handleCompleteBattle(
            currentBattleId,
            'defeat',
            Math.max(0, battleState.playerNavitar.hp - aiDamage)
          );
      }
    }, AI_TURN_DELAY_MS);
  };

  // Attacks enter the shared executor through here — the fast move,
  // the extra slots and Power Strike all call this, exactly as they
  // called handleMoveSelect before the executor existed.
  const handleMoveSelect = (move: Move) => {
    executePlayerAction({ kind: 'attack', move });
  };

  // Guard — brace for the opponent's next hit (halved). Consumes the
  // turn; the halving itself is applied in the executor's AI closure.
  const handleGuard = () => {
    executePlayerAction({ kind: 'guard' });
  };

  // Focus — +30 energy toward the next Power Strike, no damage.
  // Consumes the turn. Pointless at a full bar, so the button is
  // disabled there and this guards too.
  const handleFocus = () => {
    if (!battleState || battleState.playerEnergy >= 100) return;
    executePlayerAction({ kind: 'focus' });
  };

  // Power Strike — the duel's charge move. It existed in duel state
  // (chargeMove on every battle navitar, 2× the fast move's damage)
  // but no player control ever fired it: BattleMoves listed only the
  // fast move. This wires the missing button through the SAME
  // handleMoveSelect path as every other player move — same turn
  // gating, effectiveness, log line, Joe calls, AI counter — with
  // the charge economy: it unlocks at POWER_STRIKE_ENERGY (60 since
  // fix wave 3; it was a full 100) and spends the whole bar
  // (energyCost 100 against a bar clamped at 0), so the state
  // update lands the player back at 0. Damage comes from the
  // live duel snapshot's chargeMove, which handleBattle derived from
  // the (possibly Power-Draught-boosted) source navitar — the boost
  // carries, exactly as designed there.
  const handlePowerStrike = () => {
    if (!battleState || !userNavitar) return;
    if (battleState.playerEnergy < POWER_STRIKE_ENERGY) return;
    handleMoveSelect({
      name: battleState.playerNavitar.chargeMove.name,
      type: userNavitar.element,
      damage: battleState.playerNavitar.chargeMove.damage,
      energyGain: 0,
      energyCost: 100,
      cooldown: 0,
    });
  };

  // Use one of slots 2–5. This reuses handleMoveSelect wholesale, so a
  // slot goes through the SAME path as the fast move: the same turn
  // gating (isPlayerTurn / duelOver / VS intro), the same
  // type-effectiveness math, the same battle-log line naming the move
  // actually used, the same Joe announcer calls, and the same AI
  // counter. The only differences are the slot's own: its scaled
  // damage, and energyGain 0 / energyCost 0 — extra attacks generate
  // NO energy, so the charge economy is untouched (only the fast move
  // charges Power Strike). The slot also starts its own cooldown
  // before the move lands, so a fast double-click cannot fire it
  // twice — 1.2s since fix wave 3 (was 2s); the cooldown outlives
  // the AI's 0.6s turn, so the button stays disabled briefly into
  // the next player turn.
  const handleExtraAttack = (slotIndex: number, name: string, damage: number) => {
    if (!userNavitar || !movesEnabled) return;
    if ((extraCooldownUntil[slotIndex] ?? 0) > Date.now()) return;
    setExtraCooldownUntil(prev => ({
      ...prev,
      [slotIndex]: Date.now() + EXTRA_ATTACK_COOLDOWN_MS,
    }));
    const timer = setTimeout(() => {
      setExtraCooldownUntil(prev => {
        const next = { ...prev };
        delete next[slotIndex];
        return next;
      });
    }, EXTRA_ATTACK_COOLDOWN_MS);
    extraCooldownTimersRef.current.push(timer);
    handleMoveSelect({
      name,
      type: userNavitar.element,
      damage,
      energyGain: 0,
      energyCost: 0,
      cooldown: 1.2,
    });
  };

  const handleBattleComplete = (isVictory: boolean) => {
    setBattleEvent(isVictory ? 'victory' : 'defeat');
    setTimeout(() => setBattleEvent(null), 3000);
  };

  // The stage shows the matchup even before a duel starts (a duel in
  // progress uses its live HP; otherwise the fighters stand at full
  // HP). The local duel navitar carries `type`, the context navitar
  // carries `element` — one mapper takes either shape.
  const toStageFighter = (n: {
    name: string;
    element?: string;
    type?: string;
    level?: number;
    cp?: number;
    hp: number;
    maxHp: number;
    imageUrl?: string;
    modelUrl?: string;
    modelZoom?: number;
    modelRotationY?: number;
    modelYOffset?: number;
    fastMove: { name: string; damage: number; energyGain: number; cooldown: number };
  }): StageFighter => ({
    name: n.name,
    element: n.element ?? n.type ?? 'ice',
    // The local duel navitar carries cp (level x 10) instead of level.
    level: n.level ?? Math.round((n.cp ?? 10) / 10),
    hp: n.hp,
    maxHp: n.maxHp,
    // Art resolves the same way it does everywhere else (Profile, map
    // companion): the navitar's own imageUrl first, then the name
    // map. Business/demo opponents carry no imageUrl of their own —
    // passing it through raw left the stage's billboard with nothing
    // to load, so a Quantix opponent rendered as a plain element orb
    // (live check 2026-11-12). Name-matched art now reaches the stage.
    imageUrl: resolveNavitarArt(n.imageUrl, n.name) ?? undefined,
    modelUrl: n.modelUrl,
    modelZoom: n.modelZoom,
    modelRotationY: n.modelRotationY,
    modelYOffset: n.modelYOffset,
    energyGain: n.fastMove.energyGain,
    cooldown: n.fastMove.cooldown,
  });
  // The stage header (name / Lv chip / HP bar) derives its level and
  // max HP from the LIVE context navitar, never from the battleState
  // snapshot taken at Challenge time. That snapshot froze level and
  // maxHp (via cp = level x 10) — and handleCompleteBattle heals it
  // to its own stale maxHp — so after a level-up banked at settle
  // the header still read the old level / old max HP while the XP bar
  // (xpProgress on live xp) and the move damage (live fastMove)
  // already showed the new ones. Only the CURRENT HP comes from the
  // fight, and only while the duel is live: mid-duel the bar falls
  // with battleState.hp; once the duel is over the navitar is healed
  // to full (see handleCompleteBattle), so the header shows full at
  // the CURRENT max HP. Before any duel it shows the stored HP, as
  // before. Capped at the live maxHp so a stale snapshot can never
  // overfill the bar.
  // Player-side 3D (fix, live audit 2026-11-12): an adopted/created
  // copy of a modeled showcase navitar carries NO model of its own
  // (createUserNavitar never persists one), so the player fighter
  // rendered as a small 2D picture while the same navitar on the
  // opponent's side fought in 3D. Resolve the model by SHOWCASE
  // IDENTITY at battle time: a name+element match against a modeled
  // demo opponent (Luminara, Frostbite, Emberwing) or a modeled venue
  // fighter (Griffin, Ashwing) lends the player fighter its GLB —
  // battle stage only, exactly like the opponent side. A custom
  // navitar matches nothing and stays 2D, as designed.
  const showcaseModel = (() => {
    if (!userNavitar || userNavitar.modelUrl) return null;
    const demo = businessNavitars.find(
      n => n.name === userNavitar.name && n.element === userNavitar.element && n.modelUrl
    );
    if (demo) {
      return {
        modelUrl: demo.modelUrl,
        modelZoom: demo.modelZoom,
        modelRotationY: demo.modelRotationY,
        modelYOffset: demo.modelYOffset,
      };
    }
    for (const venue of DEMO_VENUES) {
      const person = venue.people.find(
        p =>
          p.navitarName === userNavitar.name &&
          p.navitarElement === userNavitar.element &&
          p.navitarModelUrl
      );
      if (person) {
        return { modelUrl: person.navitarModelUrl, modelZoom: person.navitarModelZoom };
      }
    }
    return null;
  })();
  const stagePlayer = userNavitar
    ? {
        ...toStageFighter({
          ...userNavitar,
          ...(showcaseModel ?? {}),
          hp: !battleState
            ? userNavitar.hp
            : duelOver
              ? userNavitar.maxHp
              : Math.min(battleState.playerNavitar.hp, userNavitar.maxHp),
        }),
        // The player's live energy rides the stage header, so the
        // charge toward Power Strike is visible while watching the
        // fight. Duels start at 100 (see handleBattle), so before a
        // duel — and after one settles — the meter honestly reads 100.
        energy: battleState && !duelOver ? battleState.playerEnergy : 100,
      }
    : null;
  const stageOpponent = battleState
    ? toStageFighter(battleState.opponentNavitar)
    : opponentNavitar
      ? toStageFighter(opponentNavitar)
      : null;
  // ONE venue for the stage, preview and duel alike, from ONE truth:
  // the CHECK-IN state. Before a duel starts, the stage shows the
  // field the player is standing in (checkedInVenueId) — exactly the
  // venue handleBattle will capture if Challenge is clicked now;
  // once a duel starts, its captured venue (duelVenueId, resolved
  // from that same check-in state) governs, which also keeps the
  // backdrop — and the rematch, which passes duelVenueId back
  // explicitly — on the same field after the duel settles. The
  // pending challenge's stored venue no longer feeds the stage at
  // all: it only pre-selects the opponent, and letting it govern
  // pinned /battle to whatever venue a handoff last named — through
  // check-outs and fresh check-ins at other venues (live check
  // 2026-11-12: an old Valley Ember handoff kept every /battle duel
  // in Fire World while person-challenges at Griffith Park correctly
  // fought in Nature World). A '' id (wild / friend challenge) names
  // no venue, exactly as handleBattle treats it.
  const stageVenueId = duelVenueId ?? checkedInVenueId;
  const stageVenue = DEMO_VENUES.find(v => v.id === stageVenueId) ?? null;
  // The opponent an incoming challenge names (approval gate, Step 2
  // of the entry flow) — resolved from the handoff id each render.
  const incomingOpponent = incomingOpponentId
    ? (businessNavitars.find(n => n.id === incomingOpponentId) ?? null)
    : null;
  // The world the matchup preview promises — the same resolution the
  // stage applies (checked-in venue's element, else the opponent's),
  // named in the Step 2 summary so the player sees the field before
  // pressing START BATTLE.
  const previewWorldName = opponentNavitar
    ? WORLD_NAMES[resolveBattleWorld(stageVenue?.element ?? null, opponentNavitar.element)]
    : null;
  // The Step 2 picker, grouped by matchmaking tier (fix wave 3):
  // fair fights first, then warm-ups, tough fights, the ones that
  // outclass the player, and the boss last — each entry keeps its
  // TRUE index into businessNavitars, so selection, the stage
  // preview and the duel snapshot all stay on the one index space.
  // Without a fighter yet there are no tiers: plain roster order.
  const pickerOpponents = businessNavitars
    .map((n, i) => ({
      n,
      i,
      tier: userNavitar ? matchTierFor(userNavitar.level, n) : null,
    }))
    .sort((a, b) => {
      if (a.tier && b.tier) {
        return MATCH_TIER_RANK[a.tier] - MATCH_TIER_RANK[b.tier] || a.n.level - b.n.level;
      }
      return a.i - b.i;
    });
  // The selected matchup's tier, for the preview line ("Your Lv 5
  // vs Lv 15 — Tough fight").
  const selectedTier =
    userNavitar && opponentNavitar ? matchTierFor(userNavitar.level, opponentNavitar) : null;
  // Compact XP progress under the stage, from the navitar's stored XP.
  const xpBar = xpProgress(userNavitar?.xp ?? 0);
  // Moves are only usable during a live duel — and only once the
  // fight countdown has cleared (Eddie's rule: every control waits
  // for FIGHT!). Before START BATTLE the panel used to look active
  // (isPlayerTurn starts true) and a click silently did nothing —
  // now it reads as disabled until the duel starts.
  const movesEnabled =
    isPlayerTurn && battleState !== null && !vsActive && countdown === null && !duelOver;
  const duelActive = battleState !== null && !duelOver;
  // FIGHT-ONLY SCREEN (fix wave 3, Eddie 2026-11-13): while a duel
  // is live — and through the result animation, until it settles —
  // the battle view becomes a dedicated full-screen fight mode:
  // stage + slim status strip + control deck, nothing else. The
  // page title, the Step 1–3 setup panel, the XP bar and Battle
  // Status all leave the screen, the root becomes a fixed,
  // non-scrolling overlay, and everything fight-relevant sits on
  // the one screen. Setup stays on the normal page; a rematch from
  // the result starts the next duel already in fight mode, which
  // is where the player already is.
  // Fix wave 3.1: the fit is structural at EVERY size, not just
  // phone widths — the overlay's column is a flex column, the
  // stage flexes to the room the deck leaves (BattleStage
  // fillHeight), and the deck renders at compact density at every
  // width. Wave 3 had both gated on phone widths, so at desktop
  // sizes the stage held a fixed 430px and the deck rendered full
  // density: together they overflowed a 1919×998 screen and the
  // potions fell below the fold mid-fight.
  const fightMode = duelActive || showBattleAnimation;
  // Potions that heal/restore only work mid-duel (and not during the
  // VS intro or the countdown); the Power Draught is armed between
  // duels only.
  const potionLive = battleState !== null && !duelOver && !vsActive && countdown === null;
  const powerDraughtReady = (battleState === null || duelOver) && !powerBoostArmed;

  const handleStrategyChange = (strategy: any) => {
    // Update AI behavior based on personality traits
    console.log('New strategy:', strategy);
  };

  return (
    <Box
      data-fight-screen={fightMode ? 'true' : undefined}
      sx={
        fightMode
          ? {
              // Fight mode: a fixed full-viewport overlay above the
              // app chrome (Navbar/Footer render beneath it), no
              // scrolling — the duel is the whole screen. zIndex
              // stays below the MUI result Dialog (1300) so the
              // victory/defeat dialog still opens over the fight.
              position: 'fixed',
              inset: 0,
              zIndex: 1200,
              bgcolor: 'background.default',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              p: { xs: 1, sm: 2 },
            }
          : { p: 2 }
      }
    >
      <Grid
        container
        spacing={fightMode ? 1 : 2}
        sx={
          fightMode
            ? // The fight overlay's one column: a vertical flex stack
              // (stage / status strip / deck) filling the overlay.
              // The stage item flexes; the strip and the deck keep
              // their natural height (fix wave 3.1).
              { flex: 1, minHeight: 0, flexDirection: 'column', flexWrap: 'nowrap' }
            : undefined
        }
      >
        {!fightMode && (
          <Grid item xs={12}>
            <Typography variant="h4" align="center" gutterBottom>
              Battle Arena
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 1 }}>
              Pick your fighter, find a fair match, and battle! New here? Open{' '}
              <strong>How to Fight</strong> below — it takes ten seconds.
            </Typography>
          </Grid>
        )}

        {/* The visible battle stage: the two fighters facing each other
            in the venue's scenery. The duel logic is unchanged — this
            replaces the old side-by-side stat cards only. */}
        <Grid
          item
          xs={12}
          // Fight-mode flex via INLINE styles, deliberately: the
          // grid size class sets flexGrow: 0 / flexBasis: 100% and
          // outranks sx for exactly those longhands (measured in
          // headless Chrome — with sx the column collapsed: the
          // stage item shrank to its padding while the strip and
          // deck each claimed a full container height). An inline
          // style outranks every class, so the flex column behaves
          // deterministically here.
          style={
            fightMode
              ? // The stage takes whatever height the strip + deck
                // leave in the fight column — never less than the
                // stage's own floor (BattleStage fillHeight).
                {
                  flex: '1 1 auto',
                  minHeight: 0,
                  maxWidth: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }
              : undefined
          }
        >
          {!userNavitar && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                You don&apos;t have a Navitar yet — create one to enter battle.
              </Typography>
              <Button variant="contained" onClick={() => setIsCreateNavitarOpen(true)}>
                Create your Navitar
              </Button>
            </Box>
          )}
          <div
            ref={stageAnchorRef}
            style={fightMode ? { flex: 1, minHeight: 0, display: 'flex' } : undefined}
          >
            <BattleStage
              compact={duelActive || fightMode}
              fillHeight={fightMode}
              cameraViewsEnabled
              player={stagePlayer}
              opponent={stageOpponent}
              venueName={stageVenue?.name ?? null}
              venueElement={stageVenue?.element ?? null}
              vsActive={vsActive}
              onVsDismiss={() => endVsIntroRef.current()}
              countdown={countdown}
              playerAnim={playerAnim}
              opponentAnim={opponentAnim}
              damagePop={damagePop}
              winner={
                battleResult ? (battleResult.outcome === 'victory' ? 'player' : 'opponent') : null
              }
            />
          </div>
        </Grid>

        {/* Fight-mode status strip (fix wave 3): in fight mode the
            Battle Status card is off-screen, so the one thing the
            player needs — what just happened — rides here instead:
            a single slim line (latest battle-log entry, or the
            result once decided) plus Joe's latest call on wider
            screens. Everything else about the duel lives on the
            stage HUD and the deck. */}
        {fightMode && (
          <Grid
            item
            xs={12}
            // Inline styles for the same reason as the stage item:
            // the grid size class outranks sx on flex longhands.
            style={{ flex: '0 0 auto', maxWidth: '100%', width: '100%' }}
          >
            <Box
              data-testid="fight-status-strip"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.25,
                minHeight: 28,
              }}
            >
              <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                {battleResult
                  ? battleResult.outcome === 'victory'
                    ? `🏆 Victory over ${battleResult.opponentName}!`
                    : `Defeat — ${battleResult.opponentName} takes this one.`
                  : vsActive
                    ? 'Get ready…'
                    : countdown !== null
                      ? 'Here we go…'
                      : (battleState?.battleLog[battleState.battleLog.length - 1] ??
                        'The duel is on!')}
              </Typography>
              {joeLine && (
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: '45%' }}
                >
                  🎙️ {joeLine}
                </Typography>
              )}
            </Box>
          </Grid>
        )}

        {/* Battle entry flow (Eddie, 2026-11-12): nobody just pops up
            in a battle. Three explicit steps — 1) choose your
            navitar, 2) select an opponent (or approve/decline one
            handed over by a venue, a friend, the wilds), 3) press
            the one big START BATTLE button. It is the ONLY duel
            entry: the old picker CHALLENGE button and the venue
            handoff auto-start are both gone. The stage above already
            previews the matchup (both fighters, the governing
            world); this panel names it in text and carries the
            button. Pickers lock while a duel is live — switching
            fighters mid-duel would desync the stage from the duel
            snapshot. */}
        {!duelActive && !fightMode && (
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                {/* HOW TO FIGHT (fix wave 3, Eddie 2026-11-13: "some
                  instructions on how to fight before you start a
                  fight — a section that tells you how to fight").
                  Discoverable in ONE tap: the big friendly button
                  toggles the guide open right here, above Step 1,
                  readable before and during setup. Short plain
                  lines, no jargon; every claim matches the duel
                  code (damage labels are effectiveness-adjusted,
                  Power Strike unlocks at 60 energy, Guard halves
                  the next hit, Focus is +30, potions never use the
                  turn, XP banks on the fighter that fought, Forfeit
                  is a free loss). */}
                <Box sx={{ mb: 2.5 }}>
                  <Button
                    variant="contained"
                    color="info"
                    fullWidth
                    data-testid="how-to-fight-toggle"
                    aria-expanded={howToOpen}
                    onClick={() => setHowToOpen(o => !o)}
                    sx={{ py: 1.25, fontWeight: 'bold', borderRadius: 3, fontSize: '1rem' }}
                  >
                    ❓ How to Fight {howToOpen ? '▴' : '▾'}
                  </Button>
                  {howToOpen && (
                    <Paper
                      data-testid="how-to-fight"
                      variant="outlined"
                      sx={{ p: 2, mt: 1.5, borderRadius: 3 }}
                    >
                      <Typography variant="subtitle1" gutterBottom>
                        How to Fight — the quick version
                      </Typography>
                      <Box
                        component="ul"
                        sx={{ m: 0, pl: 2.5, '& li': { mb: 0.75 }, '& li:last-child': { mb: 0 } }}
                      >
                        <li>
                          <Typography variant="body2">
                            🎯 <strong>Pick a move each turn.</strong> Tap a move card — your
                            navitar strikes, then your opponent answers.
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            🔢 <strong>The damage on each button is the real number.</strong> It
                            already includes type matchups — ×2 when you&apos;re super effective,
                            ×0.5 when they resist you.
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            ⚡ <strong>Energy builds as you fight.</strong> When it reaches 60,{' '}
                            <strong>Power Strike</strong> is ready — it spends your energy on one
                            big hit.
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            🛡️ <strong>Guard</strong> halves the next hit against you.
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            🎯 <strong>Focus</strong> restores +30 energy instead of attacking.
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            🧪 <strong>Potions are free</strong> and don&apos;t use your turn — heal
                            up whenever you like.
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            🏆 <strong>Winning earns points and XP</strong> for the navitar that
                            fought.
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            🏳️ <strong>Forfeit</strong> ends the duel as a loss — and costs nothing.
                          </Typography>
                        </li>
                      </Box>
                    </Paper>
                  )}
                </Box>
                {/* STEP 1 — choose your navitar. The active navitar is
                  the fighter; it comes pre-selected and tapping
                  another card is the explicit choice (it switches the
                  active navitar, like Profile does). */}
                <Typography variant="h6" gutterBottom>
                  Step 1 · Your fighter
                </Typography>
                {userNavitar ? (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {navitars.map(n => {
                      const selected = n.id === (activeNavitarId ?? userNavitar.id);
                      return (
                        <Button
                          key={n.id}
                          variant={selected ? 'contained' : 'outlined'}
                          disabled={duelActive}
                          onClick={() => setActiveNavitar(n.id)}
                          sx={{ textTransform: 'none' }}
                        >
                          {selected ? '⚔️ ' : ''}
                          {n.name} · Lv. {n.level} · HP {n.maxHp}
                        </Button>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Create your Navitar above first — then pick who it fights.
                  </Typography>
                )}

                {/* STEP 2 — select or approve the opponent. */}
                <Typography variant="h6" gutterBottom>
                  Step 2 · Pick your opponent
                </Typography>
                {/* Incoming challenge: a handoff from a venue meet, a
                  friend, or the wilds lands HERE — pre-selected in
                  the picker below, with explicit Approve / Decline.
                  Approving keeps the matchup and moves to Step 3;
                  declining clears the handoff and starts nothing. */}
                {incomingOpponent && !duelActive && (
                  <Paper
                    sx={{
                      p: 2,
                      mb: 2,
                      border: '2px solid',
                      borderColor: 'warning.main',
                      bgcolor: 'rgba(255,193,7,0.08)',
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      ⚔️ Incoming challenge — {incomingOpponent.name} (Lv. {incomingOpponent.level},{' '}
                      {incomingOpponent.element}) wants to battle!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {challengeVenueId
                        ? `Issued at ${DEMO_VENUES.find(v => v.id === challengeVenueId)?.name ?? 'a venue'} — the duel itself is fought on the field you are standing in.`
                        : 'Approve it to face them, or decline and pick your own opponent.'}
                    </Typography>
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      sx={{ mr: 1 }}
                      onClick={handleApproveIncoming}
                    >
                      Approve
                    </Button>
                    <Button variant="outlined" size="small" onClick={handleDeclineIncoming}>
                      Decline
                    </Button>
                  </Paper>
                )}
                {userNavitar && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Every opponent is labelled against your fighter&apos;s level — an{' '}
                    <strong>Even match</strong> is a fair fight you can win. New here? Start there.
                  </Typography>
                )}
                {businessNavitars.length > 1 && (
                  <Box
                    sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}
                  >
                    {pickerOpponents.map(({ n, i, tier }) => (
                      <Button
                        key={n.id}
                        size="small"
                        variant={i === opponentIndex ? 'contained' : 'outlined'}
                        disabled={duelActive}
                        onClick={() => selectOpponentIndex(i)}
                        data-match-tier={tier ?? undefined}
                      >
                        {n.name} (Lv. {n.level}){tier ? ` · ${MATCH_TIER_LABELS[tier]}` : ''}
                      </Button>
                    ))}
                  </Box>
                )}
                {/* Matchup preview in text: both fighters, the world
                  that will host (the same resolution the stage
                  renders), and the opponent's vitals. */}
                {userNavitar && opponentNavitar && (
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    <strong>{userNavitar.name}</strong> (Lv. {userNavitar.level},{' '}
                    {userNavitar.element}, HP {userNavitar.maxHp}) vs{' '}
                    <strong>{opponentNavitar.name}</strong> (Lv. {opponentNavitar.level},{' '}
                    {opponentNavitar.element}, HP {opponentNavitar.maxHp}
                    {opponentNavitar.skills.length > 0
                      ? ` · skills: ${opponentNavitar.skills.join(', ')}`
                      : ''}
                    )
                    {selectedTier
                      ? ` — Your Lv ${userNavitar.level} vs Lv ${opponentNavitar.level} — ${MATCH_TIER_LABELS[selectedTier]}`
                      : ''}{' '}
                    — 🌍 {previewWorldName}
                    {stageVenue ? ` at ${stageVenue.name}` : ''}
                  </Typography>
                )}

                {/* STEP 3 — the one clear start button. */}
                <Typography variant="h6" gutterBottom>
                  Step 3 · Ready? Start the battle
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  disabled={!userNavitar || !opponentNavitar || duelActive}
                  onClick={() => opponentNavitar && handleBattle(opponentNavitar.id)}
                  sx={{ py: 1.5, fontSize: '1.15rem', fontWeight: 'bold', mb: 1 }}
                >
                  ⚔️ START BATTLE
                </Button>
                {!userNavitar && (
                  <Typography variant="body2" color="text.secondary">
                    Create your Navitar first, then start a battle.
                  </Typography>
                )}
                {duelActive && (
                  <Typography variant="body2" color="text.secondary">
                    Duel in progress — use your moves below.
                  </Typography>
                )}
                <Box sx={{ mt: 1 }}>
                  {userNavitar && (
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mr: 1 }}
                      onClick={() => setIsChangeLookOpen(true)}
                    >
                      Change look
                    </Button>
                  )}
                  {/* Joe the Impossible Challenger — a real FIGHT now
                    (Eddie, 2026-11-12: "There should be no quiz, scrap
                    the quiz. I just wanted to fight."). Joe is a boss
                    demo opponent (Lv 30) in the Step 2 picker; this
                    button pre-selects him and raises the same
                    approve/decline gate any incoming challenge gets —
                    nothing auto-starts, START BATTLE still begins the
                    duel. Beat him and the "Joe's Champion" title is
                    yours (awarded on the win, in bankDuel). */}
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    onClick={() => {
                      const joeIdx = businessNavitars.findIndex(n => n.id === JOE_OPPONENT_ID);
                      if (joeIdx >= 0) {
                        selectOpponentIndex(joeIdx);
                        setIncomingOpponentId(JOE_OPPONENT_ID);
                      }
                    }}
                  >
                    🎙️ Challenge Joe
                  </Button>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Personality Traits:</Typography>
                  {displayedPlayerTraits.map(trait => (
                    <Chip
                      key={trait.name}
                      label={`${trait.name}: ${trait.value}`}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                  {displayedOpponentTraits.map(trait => (
                    <Chip
                      key={`opp-${trait.name}`}
                      label={`${opponentNavitar?.name ?? 'Opponent'} — ${trait.name}: ${trait.value}`}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* THE CONTROL DECK (fighting ergonomics, Eddie 2026-11-12:
            "Make sure that all the buttons are in a convenient area
            to fight"). EVERY in-duel control lives in this one card
            directly under the stage: the move grid + Power Strike
            (BattleMoves), the extra attacks, Guard / Focus / Forfeit,
            and the potions. Nothing a player needs mid-fight lives
            anywhere else on the page. While a duel is live the entry
            panel above hides and the stage compacts, so on phone
            widths the stage + this deck fit one viewport without
            scrolling — the stage shrinks, the deck never goes below
            the fold. All deck buttons carry a 48px minimum height,
            and the sections' heights are content-fixed (labels and
            cooldowns swap text in place), so the deck does not jump
            around mid-fight. Fix wave 3.1: in fight mode the deck
            sits at the bottom of the overlay's flex column and
            renders at compact density at EVERY width (descriptions
            and captions collapse, sections tighten) while the stage
            flexes above it — at desktop sizes the full-density deck
            had pushed the potions off the bottom of the screen. */}
        <Grid
          item
          xs={12}
          // Inline styles for the same reason as the stage item:
          // the grid size class outranks sx on flex longhands.
          style={fightMode ? { flex: '0 0 auto', maxWidth: '100%', width: '100%' } : undefined}
        >
          {/* A styled Box, deliberately NOT a Card/Paper: the smoke
              harnesses locate the fast-move card as the .MuiPaper-root
              carrying its name + damage, and a Paper wrapper here
              would shadow it as an ancestor match. */}
          <Box
            data-testid="battle-deck"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              boxShadow: 3,
              pb: 1,
            }}
          >
            <BattleMoves
              compact={fightMode}
              moves={playerMoves}
              onMoveSelect={move =>
                handleMoveSelect({
                  name: move.name,
                  type: move.type,
                  damage: move.damage,
                  energyGain: move.energyGain ?? 0,
                  energyCost: move.energyCost ?? 0,
                  cooldown: move.cooldown,
                })
              }
              currentEnergy={battleState && !duelOver ? battleState.playerEnergy : 100}
              isPlayerTurn={movesEnabled}
              powerStrike={
                userNavitar
                  ? {
                      name: 'Power Strike',
                      damage: battleState
                        ? battleState.playerNavitar.chargeMove.damage
                        : userNavitar.fastMove.damage * 2,
                      type: userNavitar.element,
                      effectiveness: playerEffectiveness,
                      energyCost: POWER_STRIKE_ENERGY,
                    }
                  : null
              }
              onPowerStrike={handlePowerStrike}
              powerStrikeReady={
                movesEnabled && (battleState?.playerEnergy ?? 0) >= POWER_STRIKE_ENERGY
              }
            />

            {/* Slots 2–5 — the custom attacks beyond the fast move. One button
            per slot, labelled with the attack name and its scaled damage
            at the navitar's current level. Rendered as plain buttons in a
            Box (not a Card/Paper) so the smoke harness's move-card
            lookup — a .MuiPaper-root containing 'Ice Blast' + 'Damage: 9'
            — still finds only the fast-move card. A navitar without valid
            attacks renders nothing here: single fast move + Power Strike,
            exactly as today. Each button is disabled while its own 2s
            cooldown runs, and shows it. */}
            {extraAttacks.length > 0 && (
              <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* On phones the label takes its own row so the
                      four slots pack 2×2 (label sharing row 1 left
                      a 1-2-1 stack ~180px tall — deck compression,
                      fix wave 2). */}
                  <Typography variant="subtitle2" sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' } }}>
                    Extra Attacks:
                  </Typography>
                  {extraAttacks.map((slot, i) => {
                    const cooling = (extraCooldownUntil[i] ?? 0) > Date.now();
                    return (
                      <Button
                        key={`${i}-${slot.name}`}
                        variant="outlined"
                        size="small"
                        sx={{
                          minHeight: 48,
                          // Phone widths: two per row (the deck
                          // compression — one full-width row per slot
                          // cost ~56px each and pushed the tactics
                          // and potions below the fold at 390×844).
                          flex: { xs: '1 1 44%', sm: '0 1 auto' },
                          // Smaller type on phones, and a tight
                          // line-height: a label that wraps to two
                          // lines still fits the 48px row instead of
                          // the ~64px the default 1.75 line-height
                          // cost (and never spills past the border,
                          // which a nowrap label wider than its
                          // button did).
                          fontSize: { xs: '0.72rem', sm: '0.8125rem' },
                          lineHeight: 1.25,
                          padding: { xs: '4px 6px', sm: '4px 10px' },
                        }}
                        disabled={!movesEnabled || cooling}
                        onClick={() => handleExtraAttack(i, slot.name, slot.damage)}
                      >
                        {cooling ? (
                          `${slot.name} — cooling down…`
                        ) : (
                          <>
                            {`${slot.name} — ${Math.floor(slot.damage * playerEffectiveness)} dmg`}
                            {/* The cooldown suffix yields on phones
                                (the deck compression) — the button's
                                own cooling-down state still shows it
                                when it matters. */}
                            <Box
                              component="span"
                              sx={{ display: { xs: 'none', sm: 'inline' } }}
                            >{` · 1.2s`}</Box>
                            {playerEffectiveness !== 1 ? ` (×${playerEffectiveness})` : ''}
                          </>
                        )}
                      </Button>
                    );
                  })}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                    // Collapsed in fight mode at every width (the
                    // compact deck density, fix wave 3.1).
                    display: fightMode ? 'none' : { xs: 'none', sm: 'block' },
                  }}
                >
                  Extra attacks generate no energy — only the fast move charges Power Strike.
                </Typography>
              </Box>
            )}

            {/* Tactics — Guard and Focus (battle features pass). Every
            fighter's kit beyond its attacks: Guard braces for the
            opponent's next hit (halved), Focus banks +30 energy
            toward Power Strike. Both consume the turn like an attack
            (the opponent counters after them) and both are plain
            buttons in a Box, not Papers, for the same smoke-harness
            reason as the extra attacks above. Rendered whenever the
            player has a navitar; disabled outside the player's turn
            (and Focus is disabled at a full energy bar, where it
            would do nothing). */}
            {userNavitar && (
              <Box
                sx={{
                  px: { xs: 1.5, sm: 2 },
                  pb: fightMode ? 1.25 : { xs: 1.25, sm: 2 },
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography variant="subtitle2">Tactics:</Typography>
                  <Button
                    variant="outlined"
                    size="large"
                    disabled={!movesEnabled}
                    onClick={handleGuard}
                    sx={{
                      minHeight: 48,
                      flex: { xs: '1 1 0', sm: '0 1 auto' },
                      whiteSpace: 'nowrap',
                      fontSize: { xs: '0.82rem', sm: '0.9375rem' },
                      padding: { xs: '8px 4px', sm: '8px 22px' },
                    }}
                  >
                    {/* Full label on sm+, short label on phones —
                        the long labels wrapped to 2–3 lines each at
                        390px and stacked the tactics row ~190px tall
                        (deck compression, 2026-11-12). Both spans stay
                        in the DOM; CSS picks one per width. */}
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      🛡️ Guard — halve the next hit
                    </Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                      🛡️ Guard
                    </Box>
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    disabled={!movesEnabled || (battleState?.playerEnergy ?? 100) >= 100}
                    onClick={handleFocus}
                    sx={{
                      minHeight: 48,
                      flex: { xs: '1 1 0', sm: '0 1 auto' },
                      whiteSpace: 'nowrap',
                      fontSize: { xs: '0.82rem', sm: '0.9375rem' },
                      padding: { xs: '8px 4px', sm: '8px 22px' },
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      🎯 Focus — +30 energy
                    </Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                      🎯 Focus
                    </Box>
                  </Button>
                  {/* Forfeit — the duel's exit door: ends the duel as
                      a loss (costs nothing, like every loss here) and
                      returns to the arena. Enabled for the whole
                      duel, VS intro and countdown included. */}
                  <Button
                    variant="outlined"
                    color="error"
                    size="large"
                    disabled={!duelActive}
                    onClick={() => void handleForfeit()}
                    sx={{
                      minHeight: 48,
                      flex: { xs: '1 1 0', sm: '0 1 auto' },
                      whiteSpace: 'nowrap',
                      fontSize: { xs: '0.82rem', sm: '0.9375rem' },
                      padding: { xs: '8px 4px', sm: '8px 22px' },
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      🏳️ Forfeit
                    </Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                      🏳️ Forfeit
                    </Box>
                  </Button>
                  {playerGuarding && (
                    <Chip label="🛡️ Guarding — next hit halved" color="info" size="small" />
                  )}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                    display: fightMode ? 'none' : { xs: 'none', sm: 'block' },
                  }}
                >
                  Guard and Focus use your turn — your opponent moves after them. Forfeit ends the
                  duel as a loss and costs nothing.
                </Typography>
              </Box>
            )}

            {/* Potions — the deck's last section (moved here from
                below Battle Status: mid-duel they are fight controls,
                so they live in the deck with everything else).
                Health/Recharge work mid-duel only and never consume
                the player's turn; Power Draught is armed between
                duels and boosts the next duel only. Counts are live
                (re-read after every use). */}
            <Box
              sx={{
                px: { xs: 1.5, sm: 2 },
                pb: fightMode ? 1.25 : { xs: 1.25, sm: 2 },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: { xs: 1, sm: 2 },
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                }}
              >
                <Typography variant="subtitle2" sx={{ pt: 1.5 }}>
                  Potions:
                </Typography>
                <Box sx={{ flex: { xs: '1 1 40%', sm: '0 1 auto' } }}>
                  <Button
                    variant="outlined"
                    sx={{
                      minHeight: 48,
                      width: { xs: '100%', sm: 'auto' },
                      whiteSpace: 'nowrap',
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      padding: { xs: '6px 8px', sm: '6px 16px' },
                    }}
                    disabled={!potionLive || potionCounts.health <= 0}
                    onClick={handleUseHealthPotion}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      {POTIONS.health.emoji} {POTIONS.health.name} ×{potionCounts.health}
                    </Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                      {POTIONS.health.emoji} Health ×{potionCounts.health}
                    </Box>
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: fightMode ? 'none' : { xs: 'none', sm: 'block' } }}
                  >
                    {POTIONS.health.blurb}
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 40%', sm: '0 1 auto' } }}>
                  <Button
                    variant="outlined"
                    sx={{
                      minHeight: 48,
                      width: { xs: '100%', sm: 'auto' },
                      whiteSpace: 'nowrap',
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      padding: { xs: '6px 8px', sm: '6px 16px' },
                    }}
                    disabled={!potionLive || potionCounts.recharge <= 0}
                    onClick={handleUseRecharge}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      {POTIONS.recharge.emoji} {POTIONS.recharge.name} ×{potionCounts.recharge}
                    </Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                      {POTIONS.recharge.emoji} Recharge ×{potionCounts.recharge}
                    </Box>
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: fightMode ? 'none' : { xs: 'none', sm: 'block' } }}
                  >
                    {POTIONS.recharge.blurb}
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 40%', sm: '0 1 auto' } }}>
                  <Button
                    variant="outlined"
                    sx={{
                      minHeight: 48,
                      width: { xs: '100%', sm: 'auto' },
                      whiteSpace: 'nowrap',
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      padding: { xs: '6px 8px', sm: '6px 16px' },
                    }}
                    disabled={!powerDraughtReady || potionCounts.power <= 0}
                    onClick={handleArmPowerDraught}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      {POTIONS.power.emoji} {POTIONS.power.name} ×{potionCounts.power}
                    </Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                      {POTIONS.power.emoji} Power ×{potionCounts.power}
                    </Box>
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: fightMode ? 'none' : { xs: 'none', sm: 'block' } }}
                  >
                    {POTIONS.power.blurb}
                  </Typography>
                </Box>
              </Box>
              {powerBoostArmed && (
                <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                  Power Draught armed — +5 damage next duel
                </Typography>
              )}
            </Box>
          </Box>
        </Grid>

        {/* XP progress — the level the stage already shows, plus how far
            into it the navitar is. Moves when a win or training banks XP.
            Hidden in fight mode (fix wave 3): the fight screen is
            stage + strip + deck only. */}
        {userNavitar && !fightMode && (
          <Grid item xs={12}>
            <Box sx={{ maxWidth: 480, mx: 'auto' }}>
              <Typography variant="body2" align="center" color="text.secondary">
                Lv {xpBar.level} — {xpBar.xpIntoLevel}/{xpBar.xpForNextLevel} XP to Lv{' '}
                {xpBar.level + 1}
              </Typography>
              <LinearProgress variant="determinate" value={xpBar.fraction * 100} sx={{ mt: 0.5 }} />
            </Box>
          </Grid>
        )}

        {/* (The opponent picker and the old CHALLENGE button used to
            live here, below the XP bar — they moved up into the
            Step 1–3 entry-flow panel directly under the stage, where
            START BATTLE is the only duel entry.) */}

        {/* Battle Status — the battle log shows what actually happened
            (the old bare "taunt" word told the player nothing), and the
            decided result persists here until a new duel starts or the
            player dismisses it. The result carries the final score in
            text, because the HP bars are healed to full on duel end.
            Display-none in fight mode (fix wave 3): its one essential
            line rides the fight status strip instead, and the card
            returns with the result dialog when the duel settles. */}
        <Grid item xs={12} sx={{ display: fightMode ? 'none' : 'block' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" align="center">
                Battle Status
              </Typography>
              {battleResult ? (
                <>
                  <Typography
                    variant="h6"
                    align="center"
                    color={battleResult.outcome === 'victory' ? 'success.main' : 'error.main'}
                  >
                    {battleResult.outcome === 'victory'
                      ? `Victory! You beat ${battleResult.opponentName} — ${battleResult.playerHpLeft} HP left`
                      : `Defeat — ${battleResult.opponentName} won this time`}
                  </Typography>
                  <Typography variant="body1" align="center" color="text.secondary">
                    {battleResult.outcome === 'victory'
                      ? `+${battleResult.points} Battle points banked`
                      : 'Losing costs nothing — rematch anytime.'}
                  </Typography>
                  {winResult && battleResult.outcome === 'victory' && (
                    <Typography variant="body1" align="center" color="text.secondary">
                      +{winResult.xpGained} XP
                      {winResult.streak >= 2
                        ? ` — 🔥 ${winResult.streak}-win streak ×${winResult.multiplier}`
                        : ''}
                    </Typography>
                  )}
                  {winResult?.leveledUp && (
                    <Typography variant="h6" align="center" color="warning.main" sx={{ mt: 1 }}>
                      🎉 LEVEL UP! Lv {winResult.leveledUp.from} → Lv {winResult.leveledUp.to} —
                      damage {winResult.leveledUp.oldDamage}→{winResult.leveledUp.newDamage}, HP{' '}
                      {winResult.leveledUp.oldMaxHp}→{winResult.leveledUp.newMaxHp}
                    </Typography>
                  )}
                  {/* Joe the Judge — his verdict on the duel, naming the
                      turning point (a super-effective hit, a comeback,
                      a dominant win) or, on a defeat, a teaching tip. */}
                  {joeVerdictText && (
                    <Typography
                      variant="body1"
                      align="center"
                      color="text.secondary"
                      sx={{ mt: 1, fontStyle: 'italic' }}
                    >
                      🎙️ Joe, the judge: “{joeVerdictText}”
                    </Typography>
                  )}
                  <Box sx={{ textAlign: 'center', mt: 1 }}>
                    <Button size="small" variant="contained" sx={{ mr: 1 }} onClick={handleRematch}>
                      Rematch
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setBattleResult(null);
                        setWinResult(null);
                        setJoeLine(null);
                        setJoeVerdictText(null);
                      }}
                    >
                      Dismiss
                    </Button>
                  </Box>
                </>
              ) : battleLog.length > 0 ? (
                <>
                  {battleLog.slice(-3).map((entry, i) => (
                    <Typography
                      key={`${i}-${entry}`}
                      variant="body1"
                      align="center"
                      color="text.secondary"
                    >
                      {entry}
                    </Typography>
                  ))}
                  {battleEvent === 'taunt' && (
                    <Typography variant="body2" align="center" color="text.secondary">
                      {opponentNavitar?.name ?? 'Opponent'} taunts you!
                    </Typography>
                  )}
                  {/* Joe the Announcer — one called line per battle event,
                      in his voice. It updates as the duel goes on. */}
                  {joeLine && (
                    <Typography
                      variant="body2"
                      align="center"
                      color="text.secondary"
                      sx={{ fontStyle: 'italic' }}
                    >
                      🎙️ Joe: “{joeLine}”
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="body2" align="center" color="text.secondary">
                  No battle yet — choose your Navitar and opponent in Steps 1–2, then press START
                  BATTLE.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Result dialog — compact, fits its content: result text +
          points + Dismiss + Rematch. The old md-width dialog with a
          180px min-height read as a ~150px mostly-empty gray box. The
          animation scene renders nothing visible on its own in this
          app, so the dialog must not give it a big empty stage. */}
      <Dialog open={showBattleAnimation} onClose={() => {}} maxWidth="xs" fullWidth>
        <DialogContent>
          {battleResult && (
            <>
              <Typography
                variant="h6"
                align="center"
                gutterBottom
                color={battleResult.outcome === 'victory' ? 'success.main' : 'error.main'}
              >
                {battleResult.outcome === 'victory'
                  ? `Victory! You beat ${battleResult.opponentName} — ${battleResult.playerHpLeft} HP left`
                  : `Defeat — ${battleResult.opponentName} won this time`}
              </Typography>
              <Typography variant="body1" align="center" color="text.secondary" paragraph>
                {battleResult.outcome === 'victory'
                  ? `+${battleResult.points} Battle points banked`
                  : 'Losing costs nothing — rematch anytime.'}
              </Typography>
              {winResult && battleResult.outcome === 'victory' && (
                <Typography variant="body1" align="center" color="text.secondary" paragraph>
                  +{winResult.xpGained} XP
                  {winResult.streak >= 2
                    ? ` — 🔥 ${winResult.streak}-win streak ×${winResult.multiplier}`
                    : ''}
                </Typography>
              )}
              {winResult?.leveledUp && (
                <Typography variant="h6" align="center" color="warning.main" paragraph>
                  🎉 LEVEL UP! Lv {winResult.leveledUp.from} → Lv {winResult.leveledUp.to} — damage{' '}
                  {winResult.leveledUp.oldDamage}→{winResult.leveledUp.newDamage}, HP{' '}
                  {winResult.leveledUp.oldMaxHp}→{winResult.leveledUp.newMaxHp}
                </Typography>
              )}
              {joeVerdictText && (
                <Typography
                  variant="body1"
                  align="center"
                  color="text.secondary"
                  paragraph
                  sx={{ fontStyle: 'italic' }}
                >
                  🎙️ Joe, the judge: “{joeVerdictText}”
                </Typography>
              )}
            </>
          )}
          {currentBattleId && (
            <BattleAnimation
              ability={userNavitar?.fastMove.name ?? 'Quick Attack'}
              powerLevel={userNavitar?.fastMove.damage ?? 8}
              isActive={showBattleAnimation}
              onComplete={handleAnimationComplete}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button variant="contained" size="small" onClick={handleRematch}>
            Rematch
          </Button>
          <Button size="small" onClick={() => void settleDuel()}>
            Dismiss
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Navitar Dialog — the state and handler already existed, but no
          dialog or button ever opened it, so there was no way to get a
          Navitar in the UI at all. */}
      <Dialog open={isCreateNavitarOpen} onClose={() => setIsCreateNavitarOpen(false)}>
        <DialogTitle>Create your Navitar</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Name"
            value={navitarName}
            onChange={e => setNavitarName(e.target.value)}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Skills (comma separated)"
            value={navitarSkills}
            onChange={e => setNavitarSkills(e.target.value)}
          />
          {/* Look — which art the navitar wears on the stage, Profile
              and the map companion. The 9 showcase navitars and the 9
              demo fighters, all with real art. Defaults to Frostbite
              (the first look); tap any thumb to change it. */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Look
          </Typography>
          <LookGrid selected={selectedLook} onSelect={setSelectedLook} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateNavitarOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateNavitar}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change look — same 18 looks, for a navitar that already exists.
          A tap applies it immediately and closes; the context persists
          it, so the stage, Profile and companion use it at once. */}
      <LookPickerDialog
        open={isChangeLookOpen}
        onClose={() => setIsChangeLookOpen(false)}
        selected={
          resolveNavitarArt(userNavitar?.imageUrl, userNavitar?.name ?? '') ??
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

export default NavitarBattle;
