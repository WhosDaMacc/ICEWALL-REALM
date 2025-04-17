import React, { useEffect, useRef } from 'react';
import { BattleEffect } from '../contexts/BattleContext';

interface BattleSoundEffectsProps {
  effects: BattleEffect[];
  comboMeter: number;
  isActive: boolean;
}

const BattleSoundEffects: React.FC<BattleSoundEffectsProps> = ({ 
  effects, 
  comboMeter, 
  isActive 
}) => {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    // Preload sound effects
    const soundEffects = {
      burn: '/sounds/burn.mp3',
      freeze: '/sounds/freeze.mp3',
      poison: '/sounds/poison.mp3',
      boost: '/sounds/boost.mp3',
      storm: '/sounds/storm.mp3',
      earthquake: '/sounds/earthquake.mp3',
      mist: '/sounds/mist.mp3',
      sunlight: '/sounds/sunlight.mp3',
      combo: '/sounds/combo.mp3',
      special: '/sounds/special.mp3'
    };

    Object.entries(soundEffects).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audioRefs.current[key] = audio;
    });

    return () => {
      // Cleanup audio elements
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // Play effect sounds
    effects.forEach(effect => {
      const audio = audioRefs.current[effect.name];
      if (audio) {
        audio.currentTime = 0;
        audio.volume = effect.intensity * 0.2;
        audio.play().catch(error => {
          console.warn(`Failed to play sound for ${effect.name}:`, error);
        });
      }
    });

    // Play combo sound when combo meter is high
    if (comboMeter > 50) {
      const comboAudio = audioRefs.current.combo;
      if (comboAudio) {
        comboAudio.volume = comboMeter * 0.01;
        comboAudio.play().catch(error => {
          console.warn('Failed to play combo sound:', error);
        });
      }
    }

    // Play special move sound when combo meter is full
    if (comboMeter >= 100) {
      const specialAudio = audioRefs.current.special;
      if (specialAudio) {
        specialAudio.play().catch(error => {
          console.warn('Failed to play special move sound:', error);
        });
      }
    }
  }, [effects, comboMeter, isActive]);

  return null; // This component doesn't render anything
};

export default BattleSoundEffects; 