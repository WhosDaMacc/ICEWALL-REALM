import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { EmojiEvents, Star, SportsEsports } from '@mui/icons-material';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';

interface VictoryScreenProps {
  open: boolean;
  onClose: () => void;
  battleId: string;
}

const VictoryScreen: React.FC<VictoryScreenProps> = ({ open, onClose, battleId }) => {
  const { activeBattles } = useNavitarFightClub();
  const battle = activeBattles.find(b => b.id === battleId);

  if (!battle || !battle.rewards) return null;

  const isUserWinner = battle.winner === battle.challenger.id;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(45deg, #FFD700 30%, #FFA500 90%)',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="center">
          <EmojiEvents sx={{ fontSize: 40, mr: 2 }} />
          <Typography variant="h4" component="div">
            {isUserWinner ? 'Victory!' : 'Defeat'}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Battle Results
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={5}>
                    <Typography variant="subtitle1" color="primary">
                      {battle.challenger.name}
                    </Typography>
                    <Typography variant="body2">
                      Level: {battle.challenger.level}
                    </Typography>
                  </Grid>
                  <Grid item xs={2}>
                    <Typography variant="h5" align="center">
                      VS
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="subtitle1" color="secondary">
                      {battle.defender.name}
                    </Typography>
                    <Typography variant="body2">
                      Level: {battle.defender.level}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {isUserWinner && (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Rewards Earned
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Star color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${battle.rewards.points} Points`}
                        secondary="Added to your total"
                      />
                    </ListItem>
                    {battle.rewards.items?.map((item, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <SportsEsports color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item}
                          secondary="Added to your inventory"
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VictoryScreen; 