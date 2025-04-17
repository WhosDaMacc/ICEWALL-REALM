import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

interface Move {
  name: string;
  type: 'ice' | 'fire' | 'nature' | 'shadow' | 'light';
  damage: number;
  energyGain?: number;
  energyCost?: number;
  cooldown: number;
  description: string;
}

interface BattleMovesProps {
  moves: Move[];
  onMoveSelect: (move: Move) => void;
  currentEnergy: number;
  isPlayerTurn: boolean;
}

const MoveCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
  color: 'white',
  borderRadius: theme.shape.borderRadius * 2,
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  }
}));

const getTypeColor = (type: string) => {
  switch (type) {
    case 'ice': return '#81D4FA';
    case 'fire': return '#FF5722';
    case 'nature': return '#4CAF50';
    case 'shadow': return '#9C27B0';
    case 'light': return '#FFC107';
    default: return '#2196F3';
  }
};

export const BattleMoves: React.FC<BattleMovesProps> = ({
  moves,
  onMoveSelect,
  currentEnergy,
  isPlayerTurn
}) => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom color="white">
        Available Moves
      </Typography>
      {moves.map((move, index) => (
        <MoveCard
          key={index}
          onClick={() => isPlayerTurn && onMoveSelect(move)}
          sx={{
            opacity: isPlayerTurn ? 1 : 0.5,
            cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
            borderLeft: `4px solid ${getTypeColor(move.type)}`,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ color: getTypeColor(move.type) }}>
              {move.name}
            </Typography>
            <Typography variant="body2">
              {move.energyCost ? `Energy: ${move.energyCost}` : `Gain: ${move.energyGain}`}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {move.description}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">
              Damage: {move.damage}
            </Typography>
            <Typography variant="body2">
              Cooldown: {move.cooldown}s
            </Typography>
          </Box>
        </MoveCard>
      ))}
    </Box>
  );
}; 