import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useCombat } from '../contexts/CombatContext';
import CombatAbilities from './CombatAbilities';

const BattleInterface: React.FC = () => {
  const {
    currentBattle,
    startBattle,
    endBattle,
    useAbility,
    activeAbilities,
  } = useCombat();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartBattle = async () => {
    setIsLoading(true);
    try {
      await startBattle('opponent-address');
    } catch (error) {
      console.error('Failed to start battle:', error);
    }
    setIsLoading(false);
  };

  const handleEndBattle = async () => {
    setIsLoading(true);
    try {
      await endBattle();
    } catch (error) {
      console.error('Failed to end battle:', error);
    }
    setIsLoading(false);
  };

  if (!currentBattle) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          No Active Battle
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleStartBattle}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Start Battle'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Battle in Progress
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="h6">Your Navitar</Typography>
                <Typography>Health: {currentBattle.playerHealth}</Typography>
                <Typography>Energy: {currentBattle.playerEnergy}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6">Opponent</Typography>
                <Typography>Health: {currentBattle.opponentHealth}</Typography>
                <Typography>Energy: {currentBattle.opponentEnergy}</Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Battle Log
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {currentBattle.logs.map((log, index) => (
                <Typography key={index} variant="body2">
                  {log}
                </Typography>
              ))}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <CombatAbilities />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleEndBattle}
            disabled={isLoading}
            sx={{ mt: 2 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'End Battle'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BattleInterface; 