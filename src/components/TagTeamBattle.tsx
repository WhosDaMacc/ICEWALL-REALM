import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogContent,
  LinearProgress,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Navitar } from '../types/Navitar';
import { Move } from '../types/Move';

interface TagTeamBattleProps {
  team1: [Navitar, Navitar];
  team2: [Navitar, Navitar];
  onBattleComplete: (winner: 'team1' | 'team2') => void;
}

interface TagTeamState {
  activeNavitar1: Navitar;
  activeNavitar2: Navitar;
  targetNavitar1: Navitar;
  targetNavitar2: Navitar;
  isTeam1Turn: boolean;
  comboMeter: number;
  specialMovesAvailable: boolean;
}

const TagTeamContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
  borderRadius: theme.shape.borderRadius * 2,
}));

const calculateCombinedDamage = (move1: Move, move2: Move, comboMeter: number): number => {
  const baseDamage = (move1.damage + move2.damage) * 0.8; // 80% of combined damage
  const comboBonus = 1 + (comboMeter / 100); // Up to 2x damage at full combo
  return Math.floor(baseDamage * comboBonus);
};

const getCombinedMoveName = (move1: Move, move2: Move): string => {
  const type1 = move1.type.charAt(0).toUpperCase() + move1.type.slice(1);
  const type2 = move2.type.charAt(0).toUpperCase() + move2.type.slice(1);
  return `${type1}-${type2} Fusion`;
};

const TagTeamBattle: React.FC<TagTeamBattleProps> = ({ team1, team2, onBattleComplete }) => {
  const [battleState, setBattleState] = useState<TagTeamState>({
    activeNavitar1: team1[0],
    activeNavitar2: team1[1],
    targetNavitar1: team2[0],
    targetNavitar2: team2[1],
    isTeam1Turn: true,
    comboMeter: 0,
    specialMovesAvailable: false,
  });

  const [showAnimation, setShowAnimation] = useState(false);
  const [currentMove, setCurrentMove] = useState<{ move1: Move; move2: Move } | null>(null);

  const handleCombinedAttack = (move1: Move, move2: Move) => {
    if (!battleState.isTeam1Turn) return;

    setCurrentMove({ move1, move2 });
    setShowAnimation(true);

    const damage = calculateCombinedDamage(move1, move2, battleState.comboMeter);
    
    setBattleState(prev => ({
      ...prev,
      targetNavitar1: {
        ...prev.targetNavitar1,
        health: Math.max(0, prev.targetNavitar1.health - damage),
      },
      comboMeter: Math.min(100, prev.comboMeter + 20),
      specialMovesAvailable: prev.comboMeter + 20 >= 100,
      isTeam1Turn: false,
    }));
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setCurrentMove(null);

    // Check for victory conditions
    if (battleState.targetNavitar1.health <= 0 && battleState.targetNavitar2.health <= 0) {
      onBattleComplete('team1');
    } else if (battleState.activeNavitar1.health <= 0 && battleState.activeNavitar2.health <= 0) {
      onBattleComplete('team2');
    }
  };

  return (
    <TagTeamContainer>
      <Grid container spacing={2}>
        {/* Team 1 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Team 1</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">{battleState.activeNavitar1.name}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(battleState.activeNavitar1.health / battleState.activeNavitar1.maxHealth) * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">{battleState.activeNavitar2.name}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(battleState.activeNavitar2.health / battleState.activeNavitar2.maxHealth) * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Team 2 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Team 2</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">{battleState.targetNavitar1.name}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(battleState.targetNavitar1.health / battleState.targetNavitar1.maxHealth) * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">{battleState.targetNavitar2.name}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(battleState.targetNavitar2.health / battleState.targetNavitar2.maxHealth) * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Combo Meter */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Combo Meter</Typography>
              <LinearProgress 
                variant="determinate" 
                value={battleState.comboMeter}
                sx={{ height: 10, borderRadius: 5 }}
              />
              {battleState.specialMovesAvailable && (
                <Chip 
                  label="Special Moves Available!" 
                  color="primary" 
                  sx={{ mt: 1 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Combined Moves */}
        {battleState.isTeam1Turn && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6">Combined Attacks</Typography>
                <Grid container spacing={2}>
                  {battleState.activeNavitar1.moves.map((move1) =>
                    battleState.activeNavitar2.moves.map((move2) => (
                      <Grid item xs={6} key={`${move1.name}-${move2.name}`}>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => handleCombinedAttack(move1, move2)}
                          disabled={!battleState.isTeam1Turn}
                        >
                          {getCombinedMoveName(move1, move2)}
                        </Button>
                      </Grid>
                    ))
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Animation Dialog */}
      <Dialog
        open={showAnimation}
        onClose={() => {}}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          {currentMove && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {getCombinedMoveName(currentMove.move1, currentMove.move2)}
              </Typography>
              <Typography variant="body1">
                Damage: {calculateCombinedDamage(currentMove.move1, currentMove.move2, battleState.comboMeter)}
              </Typography>
              <Button 
                variant="contained" 
                onClick={handleAnimationComplete}
                sx={{ mt: 2 }}
              >
                Continue
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </TagTeamContainer>
  );
};

export default TagTeamBattle; 