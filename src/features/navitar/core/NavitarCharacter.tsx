import React from 'react';
import { Box, Typography, Avatar, Paper } from '@mui/material';
import { motion } from 'framer-motion';

export interface NavitarStats {
  strength: number;
  defense: number;
  speed: number;
  stamina: number;
}

export interface NavitarSkill {
  name: string;
  description: string;
  power: number;
  cooldown: number;
}

export interface NavitarCharacter {
  id: string;
  name: string;
  type: NavitarType;
  level: number;
  stats: NavitarStats;
  skills: NavitarSkill[];
  rarity: Rarity;
  imageUrl: string;
  description: string;
}

export type NavitarType = 
  | 'fire' 
  | 'water' 
  | 'earth' 
  | 'air' 
  | 'light' 
  | 'dark' 
  | 'tech' 
  | 'nature';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

interface NavitarCharacterProps {
  character: NavitarCharacter;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

const rarityColors = {
  common: '#9E9E9E',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FFD700'
};

const typeColors = {
  fire: '#FF5722',
  water: '#2196F3',
  earth: '#795548',
  air: '#9E9E9E',
  light: '#FFEB3B',
  dark: '#212121',
  tech: '#00BCD4',
  nature: '#4CAF50'
};

const NavitarCharacter: React.FC<NavitarCharacterProps> = ({ 
  character, 
  size = 'medium',
  onClick 
}) => {
  const sizeMap = {
    small: 64,
    medium: 96,
    large: 128
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 2,
          border: `2px solid ${rarityColors[character.rarity]}`,
          background: `linear-gradient(45deg, ${typeColors[character.type]}20, ${rarityColors[character.rarity]}20)`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={character.imageUrl}
            alt={character.name}
            sx={{
              width: sizeMap[size],
              height: sizeMap[size],
              border: `3px solid ${typeColors[character.type]}`,
              bgcolor: `${typeColors[character.type]}20`
            }}
          />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {character.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Level {character.level}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  bgcolor: `${typeColors[character.type]}20`,
                  color: typeColors[character.type],
                  px: 1,
                  py: 0.5,
                  borderRadius: 1
                }}
              >
                {character.type}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  bgcolor: `${rarityColors[character.rarity]}20`,
                  color: rarityColors[character.rarity],
                  px: 1,
                  py: 0.5,
                  borderRadius: 1
                }}
              >
                {character.rarity}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Stats
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            <Typography variant="body2">
              Strength: {character.stats.strength}
            </Typography>
            <Typography variant="body2">
              Defense: {character.stats.defense}
            </Typography>
            <Typography variant="body2">
              Speed: {character.stats.speed}
            </Typography>
            <Typography variant="body2">
              Stamina: {character.stats.stamina}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Skills
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {character.skills.map((skill, index) => (
              <Box
                key={index}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {skill.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {skill.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default NavitarCharacter; 