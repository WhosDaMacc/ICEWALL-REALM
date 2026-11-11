import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Chip,
} from '@mui/material';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';
import { useBusiness } from '../contexts/BusinessContext';
import BattleAnimation from './BattleAnimation';
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

const HealthBar = styled(Box)(({ theme }) => ({
  height: '8px',
  borderRadius: '4px',
  background: theme.palette.grey[800],
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: theme.palette.success.main,
    transition: 'width 0.3s ease',
  },
}));

const EnergyBar = styled(Box)(({ theme }) => ({
  height: '4px',
  borderRadius: '2px',
  background: theme.palette.grey[800],
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: theme.palette.warning.main,
    transition: 'width 0.3s ease',
  },
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
    challengeBusinessNavitar,
    completeBattle,
  } = useNavitarFightClub();
  const { businesses } = useBusiness();
  const [isCreateNavitarOpen, setIsCreateNavitarOpen] = useState(false);
  const [navitarName, setNavitarName] = useState('');
  const [navitarSkills, setNavitarSkills] = useState('');
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
  // The opponent currently facing the player (first business navitar by default).
  const opponentNavitar = businessNavitars[opponentIndex] ?? businessNavitars[0] ?? null;
  // The outcome decided when a duel ends. The animation reads this when it
  // completes, instead of trusting battleEvent (a timeout may clear it).
  const outcomeRef = useRef<'victory' | 'defeat' | null>(null);

  const handleCreateNavitar = () => {
    if (navitarName && navitarSkills) {
      createUserNavitar(
        navitarName,
        navitarSkills.split(',').map(skill => skill.trim())
      );
      setIsCreateNavitarOpen(false);
      setNavitarName('');
      setNavitarSkills('');
    }
  };

  const handleBattle = (businessNavitarId: string) => {
    if (!userNavitar) return;
    const opponent = businessNavitars.find(n => n.id === businessNavitarId);
    if (!opponent) return;
    const battleId = challengeBusinessNavitar(businessNavitarId);
    if (!battleId) return;
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

  const handleCompleteBattle = async (battleId: string, outcome: 'victory' | 'defeat') => {
    outcomeRef.current = outcome;
    setBattleEvent(outcome);
    setShowBattleAnimation(true);
    setCurrentBattleId(battleId);
  };

  const handleAnimationComplete = async () => {
    if (currentBattleId) {
      // completeBattle expects the winner's navitar id, not a boolean.
      // The outcome was decided when the duel ended (see handleCompleteBattle).
      const battle = activeBattles.find(b => b.id === currentBattleId);
      const winnerId =
        outcomeRef.current === 'defeat'
          ? (battle?.defender.id ?? '')
          : (battle?.challenger.id ?? userNavitar?.id ?? '');
      await completeBattle(currentBattleId, winnerId);
      setCurrentBattleId(null);
      // Reset the duel so a rematch starts fresh.
      setBattleState(null);
    }
    setShowBattleAnimation(false);
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
    fastMove: { name: string; damage: number; energyGain: number; cooldown: number };
  }): Navitar => ({
    name: n.name,
    type: n.element,
    cp: n.level * 10,
    hp: n.hp,
    maxHp: n.maxHp,
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

  const handleMoveSelect = (move: Move) => {
    if (!battleState || !isPlayerTurn) return;

    const effectiveness = getTypeEffectiveness(move.type, battleState.opponentNavitar.type);
    const damage = Math.floor(move.damage * effectiveness);
    setDamagePreview(damage);
    setBattleEvent('taunt');
    setTimeout(() => setBattleEvent(null), 2000);

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

      // The player's move may already have finished the opponent — then
      // the AI gets no turn and the duel ends in victory.
      if (battleState.opponentNavitar.hp - damage <= 0) {
        if (currentBattleId) handleCompleteBattle(currentBattleId, 'victory');
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
        if (currentBattleId) handleCompleteBattle(currentBattleId, 'defeat');
      }
    }, 1000);
  };

  const handleBattleComplete = (isVictory: boolean) => {
    setBattleEvent(isVictory ? 'victory' : 'defeat');
    setTimeout(() => setBattleEvent(null), 3000);
  };

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

        {/* Player Navitar */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">{userNavitar?.name}</Typography>
              {!userNavitar && (
                <Box sx={{ mt: 1, mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    You don&apos;t have a Navitar yet — create one to enter battle.
                  </Typography>
                  <Button variant="contained" onClick={() => setIsCreateNavitarOpen(true)}>
                    Create your Navitar
                  </Button>
                </Box>
              )}
              <Typography variant="body2">Type: {userNavitar?.element}</Typography>
              <Typography variant="body2">Level: {userNavitar?.level}</Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  Health: {battleState?.playerNavitar.hp ?? userNavitar?.hp}/
                  {battleState?.playerNavitar.maxHp ?? userNavitar?.maxHp}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    ((battleState?.playerNavitar.hp ?? userNavitar?.hp ?? 0) /
                      (battleState?.playerNavitar.maxHp ?? userNavitar?.maxHp ?? 1)) *
                    100
                  }
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  Energy: {userNavitar?.fastMove.energyGain}/{userNavitar?.fastMove.cooldown}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    ((userNavitar?.fastMove.energyGain ?? 0) /
                      (userNavitar?.fastMove.cooldown ?? 1)) *
                    100
                  }
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Personality Traits:</Typography>
                {playerTraits.map(trait => (
                  <Chip
                    key={trait.name}
                    label={`${trait.name}: ${trait.value}`}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pick an opponent — the 4 demo navitars with art, plus any
            business navitar launched later. */}
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

        {/* Opponent Navitar */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">{opponentNavitar?.name}</Typography>
              <Typography variant="body2">Type: {opponentNavitar?.element}</Typography>
              <Typography variant="body2">Level: {opponentNavitar?.level}</Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  Health: {battleState?.opponentNavitar.hp ?? opponentNavitar?.hp}/
                  {battleState?.opponentNavitar.maxHp ?? opponentNavitar?.maxHp}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    ((battleState?.opponentNavitar.hp ?? opponentNavitar?.hp ?? 0) /
                      (battleState?.opponentNavitar.maxHp ?? opponentNavitar?.maxHp ?? 1)) *
                    100
                  }
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  Energy: {opponentNavitar?.fastMove.energyGain}/
                  {opponentNavitar?.fastMove.cooldown}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    ((opponentNavitar?.fastMove.energyGain ?? 0) /
                      (opponentNavitar?.fastMove.cooldown ?? 1)) *
                    100
                  }
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Personality Traits:</Typography>
                {opponentTraits.map(trait => (
                  <Chip
                    key={trait.name}
                    label={`${trait.name}: ${trait.value}`}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!userNavitar || !opponentNavitar}
                  onClick={() => opponentNavitar && handleBattle(opponentNavitar.id)}
                >
                  Challenge {opponentNavitar?.name ?? 'opponent'}
                </Button>
                {!userNavitar && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Create your Navitar first, then challenge.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Battle Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" align="center">
                Battle Status
              </Typography>
              {battleEvent && (
                <Typography variant="body1" align="center" color="text.secondary">
                  {battleEvent}
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
            isPlayerTurn={isPlayerTurn}
          />
        </Grid>
      </Grid>

      {/* Battle Animation Dialog */}
      <Dialog open={showBattleAnimation} onClose={() => {}} maxWidth="md" fullWidth>
        <DialogContent>
          {currentBattleId && (
            <BattleAnimation
              ability={userNavitar?.fastMove.name ?? 'Quick Attack'}
              powerLevel={userNavitar?.fastMove.damage ?? 8}
              isActive={showBattleAnimation}
              onComplete={handleAnimationComplete}
            />
          )}
        </DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateNavitarOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateNavitar}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NavitarBattle;
