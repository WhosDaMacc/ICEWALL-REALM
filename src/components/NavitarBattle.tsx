import React, { useState, useEffect, useCallback } from 'react';
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
import { styled } from '@mui/material/styles';
import { NavitarPersonality } from './NavitarPersonality';
import { PersonalityTrait } from './NavitarPersonality';

interface Navitar {
  name: string;
  type: 'ice' | 'fire' | 'nature' | 'shadow' | 'light';
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
  type: 'ice' | 'fire' | 'nature' | 'shadow' | 'light';
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

interface BattleAnimationProps {
  attacker: Navitar;
  defender: Navitar;
  move: Move;
  onComplete: () => void;
  effectiveness: number;
  isCritical: boolean;
  isDodged: boolean;
}

interface PersonalityTrait {
  name: string;
  value: string;
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
  }
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
  }
}));

const getTypeEffectiveness = (attackerType: string, defenderType: string): number => {
  const effectivenessChart: Record<string, Record<string, number>> = {
    fire: { ice: 2, nature: 2, shadow: 1, light: 1 },
    ice: { fire: 0.5, nature: 1, shadow: 1, light: 1 },
    nature: { fire: 0.5, ice: 1, shadow: 1, light: 1 },
    shadow: { fire: 1, ice: 1, nature: 1, light: 0.5 },
    light: { fire: 1, ice: 1, nature: 1, shadow: 2 }
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
  const [battleEvent, setBattleEvent] = useState<'victory' | 'defeat' | 'taunt' | 'compliment' | 'critical' | 'dodge' | 'special' | null>(null);
  const [playerTraits, setPlayerTraits] = useState<PersonalityTrait[]>([]);
  const [opponentTraits, setOpponentTraits] = useState<PersonalityTrait[]>([]);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [damagePreview, setDamagePreview] = useState(0);

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
    challengeBusinessNavitar(businessNavitarId);
  };

  const handleCompleteBattle = async (battleId: string) => {
    setShowBattleAnimation(true);
    setCurrentBattleId(battleId);
  };

  const handleAnimationComplete = async () => {
    if (currentBattleId) {
      await completeBattle(currentBattleId, true);
      setCurrentBattleId(null);
    }
    setShowBattleAnimation(false);
  };

  const getBusinessName = (businessId: string) => {
    return businesses.find(b => b.id === businessId)?.name || 'Unknown Business';
  };

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
          hp: Math.max(0, prev.opponentNavitar.hp - damage)
        },
        isPlayerTurn: false
      };
    });

    // AI opponent's turn
    setTimeout(() => {
      if (!battleState) return;
      
      const opponentStrategy = opponentTraits.reduce((acc, trait) => ({
        preferredMoves: [...acc.preferredMoves, ...trait.battleStrategy.preferredMoves],
        preferredTarget: trait.battleStrategy.preferredTarget,
        aggression: acc.aggression + (trait.value * trait.battleStrategy.aggression),
        defense: acc.defense + (trait.value * trait.battleStrategy.defense)
      }), {
        preferredMoves: [] as string[],
        preferredTarget: 'health' as const,
        aggression: 0,
        defense: 0
      });

      const availableMoves = battleState.opponentNavitar.moves.filter(move => 
        battleState.opponentEnergy >= move.energyCost
      );

      if (availableMoves.length === 0) {
        // No moves available, skip turn
        setBattleState(prev => prev ? { ...prev, isPlayerTurn: true } : null);
        return;
      }

      // Choose move based on strategy
      const chosenMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      const effectiveness = getTypeEffectiveness(chosenMove.type, battleState.playerNavitar.type);
      const damage = Math.floor(chosenMove.damage * effectiveness);

      setBattleState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          opponentEnergy: Math.min(100, prev.opponentEnergy + chosenMove.energyGain - chosenMove.energyCost),
          playerNavitar: {
            ...prev.playerNavitar,
            hp: Math.max(0, prev.playerNavitar.hp - damage)
          },
          isPlayerTurn: true
        };
      });

      // Check for victory/defeat
      if (battleState.playerNavitar.hp - damage <= 0) {
        setBattleEvent('defeat');
        setTimeout(() => setBattleEvent(null), 3000);
      } else if (battleState.opponentNavitar.hp - damage <= 0) {
        setBattleEvent('victory');
        setTimeout(() => setBattleEvent(null), 3000);
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
              <Typography variant="body2">Type: {userNavitar?.type}</Typography>
              <Typography variant="body2">Level: {userNavitar?.level}</Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">Health: {userNavitar?.hp}/{userNavitar?.maxHp}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(userNavitar?.hp / userNavitar?.maxHp) * 100} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">Energy: {userNavitar?.fastMove.energyGain}/{userNavitar?.fastMove.cooldown}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(userNavitar?.fastMove.energyGain / userNavitar?.fastMove.cooldown) * 100} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Personality Traits:</Typography>
                {playerTraits.map((trait) => (
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

        {/* Opponent Navitar */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">{businessNavitars[0]?.name}</Typography>
              <Typography variant="body2">Type: {businessNavitars[0]?.type}</Typography>
              <Typography variant="body2">Level: {businessNavitars[0]?.level}</Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">Health: {businessNavitars[0]?.hp}/{businessNavitars[0]?.maxHp}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(businessNavitars[0]?.hp / businessNavitars[0]?.maxHp) * 100} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">Energy: {businessNavitars[0]?.fastMove.energyGain}/{businessNavitars[0]?.fastMove.cooldown}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(businessNavitars[0]?.fastMove.energyGain / businessNavitars[0]?.fastMove.cooldown) * 100} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Personality Traits:</Typography>
                {opponentTraits.map((trait) => (
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

        {/* Battle Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" align="center">Battle Status</Typography>
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
            moves={userNavitar?.moves}
            onMoveSelect={handleMoveSelect}
            currentEnergy={userNavitar?.fastMove.energyGain}
            isPlayerTurn={isPlayerTurn}
          />
        </Grid>
      </Grid>

      {/* Battle Animation Dialog */}
      <Dialog
        open={showBattleAnimation}
        onClose={() => {}}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          {currentBattleId && (
            <BattleAnimation
              attacker={userNavitar}
              defender={businessNavitars[0]}
              move={userNavitar?.moves[0]}
              onComplete={handleAnimationComplete}
              effectiveness={getTypeEffectiveness(userNavitar?.type, businessNavitars[0]?.type)}
              isCritical={false}
              isDodged={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default NavitarBattle; 