import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { useTierProgression } from '../contexts/TierProgression';
import { useWeb3 } from '../contexts/Web3Context';

const TierProgression: React.FC = () => {
  const {
    currentTier,
    progress,
    requirements,
    realms,
    currentRealm,
    unlockTier,
    enterRealm,
    leaveRealm,
    getTierBenefits,
  } = useTierProgression();
  const { account } = useWeb3();

  const tiers = ['mortal', 'ascendant', 'interdimensional', 'celestial', 'primordial'] as const;
  const currentTierIndex = tiers.indexOf(currentTier);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'mortal':
        return '#9E9E9E';
      case 'ascendant':
        return '#2196F3';
      case 'interdimensional':
        return '#9C27B0';
      case 'celestial':
        return '#FFD700';
      case 'primordial':
        return '#FF5722';
      default:
        return '#9E9E9E';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'mortal':
        return '👤';
      case 'ascendant':
        return '🌟';
      case 'interdimensional':
        return '🌌';
      case 'celestial':
        return '👼';
      case 'primordial':
        return '👑';
      default:
        return '❓';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Tier Progression
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={currentTierIndex} alternativeLabel>
          {tiers.map((tier) => (
            <Step key={tier}>
              <StepLabel
                icon={
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: getTierColor(tier),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.5rem',
                    }}
                  >
                    {getTierIcon(tier)}
                  </Box>
                }
              >
                <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                  {tier}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Progress
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Battles Completed: {progress.battlesCompleted}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(progress.battlesCompleted / 100) * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Tournaments Won: {progress.tournamentsWon}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(progress.tournamentsWon / 20) * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Players Mentored: {progress.mentors}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(progress.mentors / 10) * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Benefits
              </Typography>
              {(() => {
                const benefits = getTierBenefits(currentTier);
                return (
                  <>
                    <Typography variant="body2" gutterBottom>
                      Battle Bonus: +{benefits.battleBonus}%
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      ICE Rewards: x{benefits.iceReward}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Special Abilities:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      {benefits.specialAbilities.map((ability, index) => (
                        <Typography
                          key={index}
                          component="li"
                          variant="body2"
                          color="text.secondary"
                        >
                          {ability}
                        </Typography>
                      ))}
                    </Box>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Available Realms
          </Typography>
          <Grid container spacing={2}>
            {realms.map((realm) => (
              <Grid item xs={12} sm={6} md={4} key={realm.id}>
                <Card
                  sx={{
                    bgcolor: currentRealm?.id === realm.id ? 'primary.light' : 'background.paper',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {realm.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Difficulty: {realm.difficulty}/10
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Rewards:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      <Typography component="li" variant="body2" color="text.secondary">
                        {realm.rewards.ice} ICE
                      </Typography>
                      <Typography component="li" variant="body2" color="text.secondary">
                        {realm.rewards.xp} XP
                      </Typography>
                      {realm.rewards.items.map((item, index) => (
                        <Typography
                          key={index}
                          component="li"
                          variant="body2"
                          color="text.secondary"
                        >
                          {item}
                        </Typography>
                      ))}
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      {currentRealm?.id === realm.id ? (
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => leaveRealm()}
                          fullWidth
                        >
                          Leave Realm
                        </Button>
                      ) : (
                        <Tooltip
                          title={
                            realm.type === 'interdimensional' && currentTier !== 'interdimensional'
                              ? 'Interdimensional tier required'
                              : ''
                          }
                        >
                          <span>
                            <Button
                              variant="contained"
                              onClick={() => enterRealm(realm.id)}
                              disabled={
                                realm.type === 'interdimensional' &&
                                currentTier !== 'interdimensional'
                              }
                              fullWidth
                            >
                              Enter Realm
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TierProgression; 