import React, { useState, useEffect } from 'react';
import { useBattle } from '../contexts/BattleContext';
import { useNavitar } from '../contexts/NavitarContext';
import { useRealm } from '../contexts/RealmContext';
import { Grid, Paper, Typography, Button, Box, LinearProgress, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import BattleEffects from './BattleEffects';

const BattleContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
}));

const NavitarCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  margin: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
}));

const BattleSystem: React.FC = () => {
  const { battleState, startBattle, endBattle, executeMove, addEffect, updateComboMeter } = useBattle();
  const { selectedNavitar, navitars } = useNavitar();
  const { activePortal } = useRealm();
  const [selectedMove, setSelectedMove] = useState<string | null>(null);

  useEffect(() => {
    if (selectedNavitar && activePortal) {
      const opponent = navitars.find(n => n.type === activePortal.type);
      if (opponent) {
        startBattle([selectedNavitar], [opponent]);
      }
    }
  }, [selectedNavitar, activePortal]);

  const handleMoveSelect = (moveName: string) => {
    setSelectedMove(moveName);
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'burn': return 'error';
      case 'freeze': return 'info';
      case 'poison': return 'secondary';
      case 'boost': return 'success';
      default: return 'default';
    }
  };

  const handleMoveExecute = () => {
    if (selectedMove && battleState.isActive) {
      const target = battleState.currentTurn === 'player' 
        ? battleState.opponentTeam[0]
        : battleState.playerTeam[0];
      
      executeMove(selectedMove, target);
      
      const effectType = Math.random() > 0.5 ? 'status' : 'environmental';
      const effect: BattleEffect = {
        type: effectType as 'status' | 'environmental',
        name: effectType === 'status' ? 
          ['burn', 'freeze', 'poison', 'boost'][Math.floor(Math.random() * 4)] :
          ['storm', 'earthquake', 'mist', 'sunlight'][Math.floor(Math.random() * 4)],
        duration: Math.floor(Math.random() * 3) + 1,
        intensity: Math.floor(Math.random() * 5) + 1,
        target: battleState.currentTurn === 'player' ? 'opponent' : 'player',
        modifiers: {
          damage: effectType === 'status' ? 0.8 : 1.2,
          defense: effectType === 'status' ? 1.2 : 0.8,
        }
      };
      
      addEffect(effect);
      updateComboMeter(10);
      setSelectedMove(null);
    }
  };

  if (!battleState.isActive) {
    return (
      <BattleContainer>
        <Typography variant="h5" align="center">
          No active battle
        </Typography>
      </BattleContainer>
    );
  }

  return (
    <BattleContainer>
      <Grid container spacing={2}>
        <Grid xs={12}>
          <Typography variant="h4" align="center" gutterBottom>
            Battle Arena
          </Typography>
        </Grid>

        {/* Player Navitar */}
        <Grid xs={12} md={6}>
          <NavitarCard>
            <Typography variant="h6">{battleState.playerTeam[0].name}</Typography>
            <Box sx={{ width: '100%', mb: 1 }}>
              <Typography>Health</Typography>
              <LinearProgress 
                variant="determinate" 
                value={(battleState.playerTeam[0].health / 100) * 100} 
                color="primary"
              />
            </Box>
            <Box sx={{ width: '100%', mb: 1 }}>
              <Typography>Energy</Typography>
              <LinearProgress 
                variant="determinate" 
                value={(battleState.playerTeam[0].energy / 100) * 100} 
                color="secondary"
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
              {battleState.effects
                .filter(effect => effect.target === 'player')
                .map((effect, index) => (
                  <StatusChip
                    key={index}
                    label={`${effect.name} (${effect.duration})`}
                    color={getStatusColor(effect.name) as any}
                    size="small"
                  />
                ))}
            </Box>
          </NavitarCard>
        </Grid>

        {/* Opponent Navitar */}
        <Grid xs={12} md={6}>
          <NavitarCard>
            <Typography variant="h6">{battleState.opponentTeam[0].name}</Typography>
            <Box sx={{ width: '100%', mb: 1 }}>
              <Typography>Health</Typography>
              <LinearProgress 
                variant="determinate" 
                value={(battleState.opponentTeam[0].health / 100) * 100} 
                color="primary"
              />
            </Box>
            <Box sx={{ width: '100%', mb: 1 }}>
              <Typography>Energy</Typography>
              <LinearProgress 
                variant="determinate" 
                value={(battleState.opponentTeam[0].energy / 100) * 100} 
                color="secondary"
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
              {battleState.effects
                .filter(effect => effect.target === 'opponent')
                .map((effect, index) => (
                  <StatusChip
                    key={index}
                    label={`${effect.name} (${effect.duration})`}
                    color={getStatusColor(effect.name) as any}
                    size="small"
                  />
                ))}
            </Box>
          </NavitarCard>
        </Grid>

        {/* Battle Effects */}
        <Grid xs={12}>
          <BattleEffects 
            effects={battleState.effects}
            comboMeter={battleState.comboMeter}
          />
        </Grid>

        {/* Battle Controls */}
        <Grid xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            {battleState.playerTeam[0].moves.map((move) => (
              <Button
                key={move.name}
                variant={selectedMove === move.name ? 'contained' : 'outlined'}
                onClick={() => handleMoveSelect(move.name)}
                disabled={battleState.currentTurn !== 'player'}
              >
                {move.name}
              </Button>
            ))}
            <Button
              variant="contained"
              color="primary"
              onClick={handleMoveExecute}
              disabled={!selectedMove || battleState.currentTurn !== 'player'}
            >
              Execute Move
            </Button>
          </Box>
        </Grid>

        {/* Combo Meter */}
        <Grid xs={12}>
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography>Combo Meter</Typography>
            <LinearProgress 
              variant="determinate" 
              value={battleState.comboMeter} 
              color="success"
            />
          </Box>
        </Grid>

        {/* Active Effects */}
        <Grid xs={12}>
          <Typography variant="h6">Weather Effects</Typography>
          {battleState.effects
            .filter(effect => effect.type === 'environmental')
            .map((effect, index) => (
              <Typography key={index}>
                {effect.name} - {effect.duration} turns remaining
                {effect.modifiers && ` (Damage: ${effect.modifiers.damage}x, Defense: ${effect.modifiers.defense}x)`}
              </Typography>
            ))}
        </Grid>
      </Grid>
    </BattleContainer>
  );
};

export default BattleSystem; 