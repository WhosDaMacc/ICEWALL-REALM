import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@mui/material/styles';

interface PortalEntryAnimationProps {
  portalType: string;
  onComplete: () => void;
}

export const PortalEntryAnimation: React.FC<PortalEntryAnimationProps> = ({
  portalType,
  onComplete
}) => {
  const theme = useTheme();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load and play portal entry sound
    audioRef.current = new Audio(`/assets/sounds/portal_${portalType}.mp3`);
    audioRef.current.play();

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [portalType]);

  const getPortalColor = () => {
    switch (portalType) {
      case 'ice': return theme.palette.primary.main;
      case 'fire': return theme.palette.error.main;
      case 'nature': return theme.palette.success.main;
      case 'shadow': return theme.palette.grey[900];
      case 'light': return theme.palette.warning.main;
      default: return theme.palette.primary.main;
    }
  };

  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    size: Math.random() * 20 + 10,
    delay: Math.random() * 0.5,
    duration: Math.random() * 0.5 + 0.5
  }));

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 9999
      }}
    >
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.5 }}
          onAnimationComplete={onComplete}
        >
          <Box
            sx={{
              position: 'relative',
              width: 300,
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Portal Ring */}
            <motion.div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                border: `4px solid ${getPortalColor()}`,
                borderRadius: '50%'
              }}
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear'
              }}
            />

            {/* Portal Core */}
            <motion.div
              style={{
                width: '60%',
                height: '60%',
                backgroundColor: getPortalColor(),
                borderRadius: '50%',
                opacity: 0.8
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />

            {/* Particles */}
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                style={{
                  position: 'absolute',
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: getPortalColor(),
                  borderRadius: '50%',
                  opacity: 0.8
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 0.8, 0],
                  x: [
                    0,
                    (Math.random() - 0.5) * 200,
                    (Math.random() - 0.5) * 400
                  ],
                  y: [
                    0,
                    (Math.random() - 0.5) * 200,
                    (Math.random() - 0.5) * 400
                  ]
                }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  repeat: Infinity
                }}
              />
            ))}

            {/* Portal Text */}
            <Typography
              variant="h4"
              sx={{
                position: 'absolute',
                color: 'white',
                textShadow: `0 0 10px ${getPortalColor()}`,
                fontWeight: 'bold'
              }}
            >
              Entering {portalType.toUpperCase()} Realm
            </Typography>
          </Box>
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}; 