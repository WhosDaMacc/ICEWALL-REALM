import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useCombat } from '../contexts/CombatContext';

const CombatAbilities: React.FC = () => {
  const { abilities, activeAbilities, draftAbilities, useAbility } = useCombat();
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null);
  const [showAbilityDialog, setShowAbilityDialog] = useState(false);

  const handleAbilityClick = (abilityId: string) => {
    setSelectedAbility(abilityId);
    setShowAbilityDialog(true);
  };

  const handleUseAbility = async (target: string) => {
    if (!selectedAbility) return;
    await useAbility(selectedAbility, target);
    setShowAbilityDialog(false);
  };

  const getAbilityColor = (type: string) => {
    switch (type) {
      case 'melee':
        return '#f44336';
      case 'ranged':
        return '#2196f3';
      case 'elemental':
        return '#9c27b0';
      case 'defense':
        return '#4caf50';
      case 'mobility':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Combat Abilities
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={draftAbilities}
        sx={{ mb: 3 }}
      >
        Draft New Abilities
      </Button>

      <Grid container spacing={3}>
        {activeAbilities.map((ability) => (
          <Grid item xs={12} sm={6} md={4} key={ability.id}>
            <Card
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.02)',
                  transition: 'transform 0.2s',
                },
              }}
              onClick={() => handleAbilityClick(ability.id)}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {ability.name}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={ability.type}
                    sx={{
                      bgcolor: getAbilityColor(ability.type),
                      color: 'white',
                      mr: 1,
                    }}
                  />
                  {ability.element && (
                    <Chip
                      label={ability.element}
                      sx={{
                        bgcolor: '#673ab7',
                        color: 'white',
                      }}
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {ability.description}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Power: {ability.power}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Range: {ability.range}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Cooldown: {ability.cooldown} turns
                  </Typography>
                </Box>
                {ability.randomizedTraits && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Random Effects:
                    </Typography>
                    {ability.randomizedTraits.map((trait, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: 2 }}
                      >
                        {trait.chance}% chance: {trait.effect}
                      </Typography>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={showAbilityDialog}
        onClose={() => setShowAbilityDialog(false)}
      >
        <DialogTitle>Use Ability</DialogTitle>
        <DialogContent>
          <Typography>
            Select a target for your ability:
          </Typography>
          {/* Add target selection UI here */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAbilityDialog(false)}>Cancel</Button>
          <Button
            onClick={() => handleUseAbility('target-address')}
            variant="contained"
          >
            Use Ability
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CombatAbilities; 