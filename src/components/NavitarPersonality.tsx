import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, Slider, Button, Paper, IconButton } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

export interface PersonalityTrait {
  name: string;
  value: number;
  description: string;
  dialogue: {
    normal: string[];
    critical: string[];
    dodge: string[];
    special: string[];
  };
  battleStrategy: {
    preferredMoves: string[];
    preferredTarget: 'health' | 'energy' | 'defense';
    aggression: number;
    defense: number;
  };
}

interface NavitarPersonalityProps {
  name: string;
  type: 'ice' | 'fire' | 'nature' | 'shadow' | 'light';
  onTraitChange: (traits: PersonalityTrait[]) => void;
  isInBattle?: boolean;
  battleEvent?: 'victory' | 'defeat' | 'taunt' | 'compliment' | 'critical' | 'dodge' | 'special';
  onStrategyChange?: (strategy: any) => void;
}

const PersonalityContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
  color: 'white',
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[10],
}));

const DialogueBubble = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  background: 'rgba(255, 255, 255, 0.1)',
  borderRadius: theme.shape.borderRadius * 2,
  marginTop: theme.spacing(2),
  animation: `${keyframes`
    0% { transform: scale(0.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  `} 0.3s ease-out`,
  '&::before': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: '50%',
    width: 0,
    height: 0,
    border: '20px solid transparent',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderBottom: 0,
    marginLeft: '-20px',
    marginBottom: '-20px',
  }
}));

const getTypeSpecificDialogue = (type: string) => {
  const typeDialogue = {
    ice: {
      victory: [
        "Feel the chill of defeat!",
        "Frozen solid!",
        "Ice to meet you!",
        "You're on thin ice now!",
        "That was a cool battle!"
      ],
      defeat: [
        "I'll be back... with reinforcements!",
        "This cold war isn't over!",
        "I'm just warming up!",
        "You've melted my defenses!",
        "I need to chill out!"
      ],
      taunt: [
        "You're giving me the cold shoulder!",
        "Time to break the ice!",
        "You're as cold as my heart!",
        "Let's make this quick!",
        "You're frozen in fear!"
      ],
      compliment: [
        "You're pretty cool!",
        "Not bad for a warm-blooded!",
        "You've got some fire!",
        "You're melting my heart!",
        "You're hot stuff!"
      ],
      critical: [
        "Absolute Zero!",
        "Frostbite!",
        "Ice Age!",
        "Glacial Impact!",
        "Permafrost!"
      ],
      dodge: [
        "Too slow!",
        "Ice skating!",
        "Slippery when wet!",
        "Like a snowflake!",
        "Frosty footwork!"
      ],
      special: [
        "Blizzard incoming!",
        "Let it snow!",
        "Winter is coming!",
        "Ice storm!",
        "Frozen fortress!"
      ]
    },
    fire: {
      victory: [
        "You got burned!",
        "Too hot to handle!",
        "That was lit!",
        "You're toast!",
        "Feel the heat!"
      ],
      defeat: [
        "I'll be back with a vengeance!",
        "You've extinguished my flame!",
        "I'm just warming up!",
        "This fire isn't out!",
        "I need to recharge!"
      ],
      taunt: [
        "You're playing with fire!",
        "Time to turn up the heat!",
        "You're as cold as ice!",
        "Let's make this hot!",
        "You're burning up!"
      ],
      compliment: [
        "You're on fire!",
        "Not bad for a water type!",
        "You've got some spark!",
        "You're heating things up!",
        "You're cool under pressure!"
      ],
      critical: [
        "Inferno!",
        "Blaze of Glory!",
        "Solar Flare!",
        "Volcanic Eruption!",
        "Meteor Strike!"
      ],
      dodge: [
        "Too hot to touch!",
        "Fire dance!",
        "Blazing speed!",
        "Like a flame!",
        "Fiery footwork!"
      ],
      special: [
        "Volcano incoming!",
        "Let it burn!",
        "Summer is coming!",
        "Fire storm!",
        "Burning fortress!"
      ]
    },
    // ... similar patterns for other types
  };
  return typeDialogue[type as keyof typeof typeDialogue] || typeDialogue.ice;
};

const defaultTraits: PersonalityTrait[] = [
  {
    name: 'Confidence',
    value: 50,
    description: 'How cocky and self-assured the Navitar is',
    dialogue: {
      victory: ["That's what I'm talking about!", "Too easy!", "I'm just built different!"],
      defeat: ["I'll get you next time!", "That was just a warm-up!", "You got lucky!"],
      taunt: ["You fight like a newborn!", "Is that all you've got?", "Time to put you in your place!"],
      compliment: ["Not bad... for a beginner!", "You've got some moves!", "I'm actually impressed!"],
      critical: ["Perfect timing!", "Right where I want you!", "Just as planned!"],
      dodge: ["Too slow!", "Missed me!", "Try harder!"],
      special: ["Here we go!", "Watch this!", "Time to shine!"]
    },
    battleStrategy: {
      preferredMoves: ['high-damage', 'critical-hit'],
      preferredTarget: 'health',
      aggression: 0.8,
      defense: 0.2
    }
  },
  {
    name: 'Honor',
    value: 50,
    description: 'How respectful and honorable the Navitar is',
    dialogue: {
      victory: ["A well-fought battle!", "You fought with honor!", "A worthy opponent!"],
      defeat: ["You have bested me fairly!", "A lesson well learned!", "I shall train harder!"],
      taunt: ["Show me your true strength!", "Let us test our skills!", "Face me with honor!"],
      compliment: ["Your technique is impressive!", "You fight with honor!", "Your skill is remarkable!"],
      critical: ["With honor!", "For glory!", "By the code!"],
      dodge: ["With grace!", "Elegantly!", "Skillfully!"],
      special: ["For honor!", "With dignity!", "By the rules!"]
    },
    battleStrategy: {
      preferredMoves: ['balanced', 'defensive'],
      preferredTarget: 'energy',
      aggression: 0.5,
      defense: 0.5
    }
  },
  {
    name: 'Sarcasm',
    value: 50,
    description: 'How sarcastic and witty the Navitar is',
    dialogue: {
      victory: ["Oh, did I win? How unexpected!", "Wow, what a surprise!", "Another victory? How original!"],
      defeat: ["Oh no, I lost! Whatever shall I do?", "What a tragedy!", "I'm devastated! Not really."],
      taunt: ["Are you trying to win?", "Is this your best? Really?", "You're doing great! Not really."],
      compliment: ["You're almost good!", "Not terrible!", "You're getting there! Maybe."],
      critical: ["Oops, did I do that?", "My bad!", "Sorry not sorry!"],
      dodge: ["Almost had me!", "Nice try!", "Better luck next time!"],
      special: ["Here we go again!", "This should be fun!", "Let's do this!"]
    },
    battleStrategy: {
      preferredMoves: ['status-effect', 'energy-drain'],
      preferredTarget: 'status',
      aggression: 0.6,
      defense: 0.4
    }
  }
];

const getRandomDialogue = (traits: PersonalityTrait[], event: string, type: string): string => {
  const weightedTraits = traits.map(trait => ({
    trait,
    weight: trait.value
  }));

  weightedTraits.sort((a, b) => b.weight - a.weight);
  const dominantTrait = weightedTraits[0].trait;
  const typeDialogue = getTypeSpecificDialogue(type);
  
  const dialogues = [
    ...dominantTrait.dialogue[event as keyof typeof dominantTrait.dialogue],
    ...typeDialogue[event as keyof typeof typeDialogue]
  ];
  
  return dialogues[Math.floor(Math.random() * dialogues.length)];
};

export const NavitarPersonality: React.FC<NavitarPersonalityProps> = ({
  name,
  type,
  onTraitChange,
  isInBattle = false,
  battleEvent,
  onStrategyChange
}) => {
  const [traits, setTraits] = useState<PersonalityTrait[]>(defaultTraits);
  const [currentDialogue, setCurrentDialogue] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (isInBattle && battleEvent) {
      const dialogue = getRandomDialogue(traits, battleEvent, type);
      setCurrentDialogue(dialogue);
      
      if (!isMuted) {
        // Play voice line
        const audio = new Audio(`/assets/voices/${type}/${battleEvent}.mp3`);
        audio.play().catch(() => console.log('Audio playback failed'));
      }
    }
  }, [isInBattle, battleEvent, traits, type, isMuted]);

  const handleTraitChange = (index: number, value: number) => {
    const newTraits = [...traits];
    newTraits[index].value = value;
    setTraits(newTraits);
    onTraitChange(newTraits);
    
    if (onStrategyChange) {
      const strategy = newTraits.reduce((acc, trait) => ({
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
      
      strategy.aggression /= newTraits.length;
      strategy.defense /= newTraits.length;
      onStrategyChange(strategy);
    }
  };

  return (
    <PersonalityContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color="primary">
          {name}'s Personality
        </Typography>
        <IconButton onClick={() => setIsMuted(!isMuted)} color="primary">
          {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
      </Box>
      
      {isInBattle && currentDialogue && (
        <DialogueBubble>
          <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
            "{currentDialogue}"
          </Typography>
        </DialogueBubble>
      )}

      {!isInBattle && traits.map((trait, index) => (
        <Box key={trait.name} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1">{trait.name}</Typography>
            <Chip
              label={trait.value}
              size="small"
              sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {trait.description}
          </Typography>
          <Slider
            value={trait.value}
            onChange={(_, value) => handleTraitChange(index, value as number)}
            min={0}
            max={100}
            sx={{
              color: 'primary.main',
              '& .MuiSlider-thumb': {
                width: 24,
                height: 24,
                transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                '&:before': {
                  boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
                },
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: '0 0 0 8px rgba(58, 133, 137, 0.16)',
                },
                '&.Mui-active': {
                  width: 28,
                  height: 28,
                },
              },
            }}
          />
        </Box>
      ))}
    </PersonalityContainer>
  );
}; 