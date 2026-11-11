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
} from '@mui/material';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';
import { useVenue } from '../contexts/VenueContext';
import { useBusiness } from '../contexts/BusinessContext';
import { DEMO_VENUES } from '../data/venues';
import { ALL_NAVITAR_LOOKS, resolveNavitarArt } from '../utils/navitarArt';
import { LookGrid, LookPickerDialog } from './LookPickerDialog';
import BattleAnimation from './BattleAnimation';
import BattleStage, { StageFighter } from './BattleStage';
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

const NavitarBattle: React.FC = () => {
  const {
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
  // Once the result is decided no more moves may land — the AI timeout
  // from the last move can otherwise fire after the duel is over.
  const [duelOver, setDuelOver] = useState(false);
  // Battle log — what actually happened, newest last. Displayed in
  // Battle Status (the old bare "taunt" word told the player nothing).
  // A taunt line can stay as flavor, but the log is the record.
  const [battleLog, setBattleLog] = useState<string[]>([]);
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
  // The venue the current duel came from (challengeVenueId at duel
  // start). challengeVenueId is cleared when the duel settles, but the
  // stage backdrop must survive until the next duel — so the id is
  // captured here at Challenge time.
  const [duelVenueId, setDuelVenueId] = useState<string | null>(null);
  // Settle guard: the duel's points + venue win must bank exactly once.
  // The animation's onComplete and the dialog's Dismiss/Rematch buttons
  // all settle the duel, and without this guard a button clicked at the
  // same moment the animation completes would bank twice.
  const settledRef = useRef(false);
  // Rematch needs the last challenged opponent even after the picker
  // moves on.
  const lastOpponentIdRef = useRef<string | null>(null);

  // A challenge accepted at a venue pre-selects that person's navitar here.
  // The opponent is added to businessNavitars first (by the meet card), so
  // this waits until it appears in the list, then consumes the pending id.
  // The venue id is NOT consumed here — it survives until the battle
  // completes, so a win at that venue unlocks its winner perk.
  useEffect(() => {
    if (!pendingOpponentId) return;
    const idx = businessNavitars.findIndex(n => n.id === pendingOpponentId);
    if (idx >= 0) {
      setOpponentIndex(idx);
      consumePendingOpponent();
    }
  }, [pendingOpponentId, businessNavitars, consumePendingOpponent]);

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

  const handleBattle = (businessNavitarId: string, venueId?: string | null) => {
    if (!userNavitar) return;
    const opponent = businessNavitars.find(n => n.id === businessNavitarId);
    if (!opponent) return;
    const battleId = challengeBusinessNavitar(businessNavitarId);
    if (!battleId) return;
    // A fresh duel clears the previous result — the old one must not
    // linger into the new fight.
    setBattleResult(null);
    setBattleLog([`${userNavitar.name} VS ${opponent.name} — FIGHT!`]);
    setDuelOver(false);
    settledRef.current = false;
    lastOpponentIdRef.current = businessNavitarId;
    // The stage backdrop is the venue the challenge came from (captured
    // now — challengeVenueId clears when the duel settles). A rematch
    // passes the venue explicitly, so the backdrop survives settling.
    setDuelVenueId(venueId !== undefined ? venueId : (challengeVenueId ?? null));
    if (tauntTimeoutRef.current) {
      clearTimeout(tauntTimeoutRef.current);
      tauntTimeoutRef.current = null;
    }
    if (vsTimeoutRef.current) clearTimeout(vsTimeoutRef.current);
    if (koTimeoutRef.current) {
      clearTimeout(koTimeoutRef.current);
      koTimeoutRef.current = null;
    }
    // VS intro: the duel starting must be VISIBLE. A duel that starts
    // silently (status still reading "No battle yet") reads as a dead
    // button — the browser check clicked CHALLENGE twice and concluded
    // it did nothing, because nothing on screen changed until a move
    // landed. The intro shows immediately; moves stay gated until it
    // dismisses (~2s, or a tap).
    setVsActive(true);
    vsTimeoutRef.current = setTimeout(() => setVsActive(false), VS_INTRO_MS);
    setBattleEvent(null);
    // Start the local duel: the moves panel and the AI turn run off this
    // state. Without it the panel early-returns and nothing can happen.
    setBattleState({
      playerNavitar: toBattleNavitar(userNavitar),
      opponentNavitar: toBattleNavitar(opponent),
      playerEnergy: 100,
      opponentEnergy: 100,
      isPlayerTurn: true,
      isDodging: false,
      battleLog: [],
      damagePreview: 0,
    });
    setIsPlayerTurn(true);
    outcomeRef.current = null;
    setCurrentBattleId(battleId);
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
    outcomeRef.current = outcome;
    setDuelOver(true);
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
    setShowBattleAnimation(true);
    setCurrentBattleId(battleId);
  };

  // Settling the duel banks its points + venue win and closes the
  // result dialog. The animation's onComplete and the dialog's
  // Dismiss/Rematch buttons all settle — the guard makes it exactly-once.
  const settleDuel = async () => {
    if (settledRef.current) {
      setShowBattleAnimation(false);
      return;
    }
    settledRef.current = true;
    if (currentBattleId) {
      // completeBattle expects the winner's navitar id, not a boolean.
      // The outcome was decided when the duel ended (see handleCompleteBattle).
      const battle = activeBattles.find(b => b.id === currentBattleId);
      const winnerId =
        outcomeRef.current === 'defeat'
          ? (battle?.defender.id ?? '')
          : (battle?.challenger.id ?? userNavitar?.id ?? '');
      await completeBattle(currentBattleId, winnerId);
      // A win at the venue where the challenge started unlocks its winner
      // perk. The venue id clears either way — the challenge is over.
      if (outcomeRef.current === 'victory' && challengeVenueId) {
        recordVenueWin(challengeVenueId);
      }
      if (challengeVenueId) clearChallengeVenue();
      setCurrentBattleId(null);
      // Do NOT reset battleState here: the post-duel HP must stay visible
      // (the old reset silently put both navitars back to full HP, as if
      // the duel never happened). A new Challenge re-inits it via
      // handleBattle; the result card above stays until dismissed.
    }
    setShowBattleAnimation(false);
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
  const playerMoves = userNavitar
    ? [
        {
          name: userNavitar.fastMove.name,
          type: userNavitar.element,
          damage: userNavitar.fastMove.damage,
          energyGain: userNavitar.fastMove.energyGain,
          energyCost: 0,
          cooldown: userNavitar.fastMove.cooldown,
          description: `${userNavitar.fastMove.name} — a quick strike.`,
        },
      ]
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

  const handleMoveSelect = (move: Move) => {
    if (!battleState || !isPlayerTurn || duelOver || vsActive) return;

    const effectiveness = getTypeEffectiveness(move.type, battleState.opponentNavitar.type);
    const damage = Math.floor(move.damage * effectiveness);
    setDamagePreview(damage);
    setBattleEvent('taunt');
    if (tauntTimeoutRef.current) clearTimeout(tauntTimeoutRef.current);
    tauntTimeoutRef.current = setTimeout(
      () => setBattleEvent(prev => (prev === 'taunt' ? null : prev)),
      2000
    );
    // The stage shows the hit the moment it lands.
    flashAttack('player', 'opponent', damage);
    setBattleLog(prev => [
      ...prev.slice(-5),
      `${battleState.playerNavitar.name} used ${move.name} — ${damage} damage`,
    ]);

    // KO fast path (see koTimeoutRef): if this hit finished the
    // opponent, complete the duel ~600ms from now — right after the
    // lunge/damage-pop plays — instead of waiting for the AI turn's
    // timeout to notice. The AI timeout below is guarded by
    // outcomeRef, so it cannot complete the duel a second time.
    const newOpponentHp = Math.max(0, battleState.opponentNavitar.hp - damage);
    if (newOpponentHp <= 0) {
      if (koTimeoutRef.current) clearTimeout(koTimeoutRef.current);
      koTimeoutRef.current = setTimeout(() => {
        if (currentBattleId)
          handleCompleteBattle(currentBattleId, 'victory', battleState.playerNavitar.hp);
      }, 600);
    }

    // Update battle state
    setBattleState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        playerEnergy: Math.min(100, prev.playerEnergy + move.energyGain - move.energyCost),
        opponentNavitar: {
          ...prev.opponentNavitar,
          hp: Math.max(0, prev.opponentNavitar.hp - damage),
        },
        isPlayerTurn: false,
      };
    });
    setIsPlayerTurn(false);

    // AI opponent's turn
    setTimeout(() => {
      if (!battleState) return;
      // The KO fast path above already completed the duel — the AI
      // gets no turn after the KO, and must not complete it twice.
      if (outcomeRef.current) return;

      // The player's move may already have finished the opponent — then
      // the AI gets no turn and the duel ends in victory. The player's
      // HP is unchanged this round (no counter came), so it is the final score.
      if (battleState.opponentNavitar.hp - damage <= 0) {
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
        // No moves available, skip turn
        setBattleState(prev => (prev ? { ...prev, isPlayerTurn: true } : null));
        setIsPlayerTurn(true);
        return;
      }

      // Choose move based on strategy
      const chosenMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      const aiEffectiveness = getTypeEffectiveness(chosenMove.type, battleState.playerNavitar.type);
      const aiDamage = Math.floor(chosenMove.damage * aiEffectiveness);

      // The stage shows the counter the moment it lands.
      flashAttack('opponent', 'player', aiDamage);
      setBattleLog(prev => [
        ...prev.slice(-5),
        `${battleState.opponentNavitar.name} countered — ${aiDamage} damage`,
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
    }, 1000);
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
    fastMove: { name: string; damage: number; energyGain: number; cooldown: number };
  }): StageFighter => ({
    name: n.name,
    element: n.element ?? n.type ?? 'ice',
    // The local duel navitar carries cp (level x 10) instead of level.
    level: n.level ?? Math.round((n.cp ?? 10) / 10),
    hp: n.hp,
    maxHp: n.maxHp,
    imageUrl: n.imageUrl,
    modelUrl: n.modelUrl,
    modelZoom: n.modelZoom,
    energyGain: n.fastMove.energyGain,
    cooldown: n.fastMove.cooldown,
  });
  const stagePlayer = battleState
    ? toStageFighter(battleState.playerNavitar)
    : userNavitar
      ? toStageFighter(userNavitar)
      : null;
  const stageOpponent = battleState
    ? toStageFighter(battleState.opponentNavitar)
    : opponentNavitar
      ? toStageFighter(opponentNavitar)
      : null;
  const duelVenue = DEMO_VENUES.find(v => v.id === duelVenueId) ?? null;
  // Moves are only usable during a live duel. Before Challenge the
  // panel used to look active (isPlayerTurn starts true) and a click
  // silently did nothing — now it reads as disabled until the duel starts.
  const movesEnabled = isPlayerTurn && battleState !== null && !vsActive && !duelOver;
  const duelActive = battleState !== null && !duelOver;

  const handleStrategyChange = (strategy: any) => {
    // Update AI behavior based on personality traits
    console.log('New strategy:', strategy);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h4" align="center" gutterBottom>
            Battle Arena
          </Typography>
        </Grid>

        {/* The visible battle stage: the two fighters facing each other
            in the venue's scenery. The duel logic is unchanged — this
            replaces the old side-by-side stat cards only. */}
        <Grid item xs={12}>
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
          <BattleStage
            player={stagePlayer}
            opponent={stageOpponent}
            venueName={duelVenue?.name ?? null}
            venueElement={duelVenue?.element ?? null}
            vsActive={vsActive}
            onVsDismiss={() => setVsActive(false)}
            playerAnim={playerAnim}
            opponentAnim={opponentAnim}
            damagePop={damagePop}
            winner={
              battleResult ? (battleResult.outcome === 'victory' ? 'player' : 'opponent') : null
            }
          />
        </Grid>

        {/* Pick an opponent — the 4 demo navitars with art, plus any
            business navitar launched later, plus venue opponents added
            by a challenge. */}
        {businessNavitars.length > 1 && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="subtitle2">Opponent:</Typography>
              {businessNavitars.map((n, i) => (
                <Button
                  key={n.id}
                  size="small"
                  variant={i === opponentIndex ? 'contained' : 'outlined'}
                  onClick={() => setOpponentIndex(i)}
                >
                  {n.name} (Lv. {n.level})
                </Button>
              ))}
            </Box>
          </Grid>
        )}

        {/* Challenge — the button that starts the duel. It must be
            visibly tied to the duel starting (VS intro + log), or it
            reads as dead: the old layout left Battle Status on "No
            battle yet" after a Challenge click, and the browser check
            concluded the button did nothing. Disabled mid-duel. */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            disabled={!userNavitar || !opponentNavitar || duelActive}
            onClick={() => opponentNavitar && handleBattle(opponentNavitar.id)}
          >
            Challenge {opponentNavitar?.name ?? 'opponent'}
          </Button>
          {userNavitar && (
            <Button
              variant="outlined"
              size="small"
              sx={{ ml: 1 }}
              onClick={() => setIsChangeLookOpen(true)}
            >
              Change look
            </Button>
          )}
          {!userNavitar && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Create your Navitar first, then challenge.
            </Typography>
          )}
          {duelActive && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Duel in progress — use your move below.
            </Typography>
          )}
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
        </Grid>

        {/* Battle Status — the battle log shows what actually happened
            (the old bare "taunt" word told the player nothing), and the
            decided result persists here until a new duel starts or the
            player dismisses it. The result carries the final score in
            text, because the HP bars are healed to full on duel end. */}
        <Grid item xs={12}>
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
                  <Box sx={{ textAlign: 'center', mt: 1 }}>
                    <Button size="small" variant="contained" sx={{ mr: 1 }} onClick={handleRematch}>
                      Rematch
                    </Button>
                    <Button size="small" onClick={() => setBattleResult(null)}>
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
                </>
              ) : (
                <Typography variant="body2" align="center" color="text.secondary">
                  No battle yet — challenge an opponent to begin.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Moves */}
        <Grid item xs={12}>
          <BattleMoves
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
            currentEnergy={userNavitar?.fastMove.energyGain ?? 0}
            isPlayerTurn={movesEnabled}
          />
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
