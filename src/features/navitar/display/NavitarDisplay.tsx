import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useCombat } from '../contexts/CombatContext';

interface Navitar {
  id: string;
  name: string;
  ability: string;
  powerLevel: number;
  modelUrl: string;
  particleEffect?: string;
}

const navitars: Navitar[] = [
  {
    id: '1',
    name: 'Elowen',
    ability: "Nature's Embrace",
    powerLevel: 9,
    modelUrl: '/models/elowen.glb',
    particleEffect: 'healing',
  },
  {
    id: '2',
    name: 'Katalis',
    ability: 'Wild Spirit',
    powerLevel: 8,
    modelUrl: '/models/katalis.glb',
    particleEffect: 'transformation',
  },
  // Add more Navitars here...
];

const NavitarDisplay: React.FC = () => {
  const [selectedNavitar, setSelectedNavitar] = useState<Navitar | null>(null);
  const [isARActive, setIsARActive] = useState(false);
  const { useAbility } = useCombat();

  useEffect(() => {
    // Check for AR support
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        setIsARActive(supported);
      });
    }
  }, []);

  const handleAbilityUse = async (navitar: Navitar) => {
    try {
      await useAbility(navitar.id, 'target-address');
      // Trigger AR effects
      triggerAREffects(navitar);
    } catch (error) {
      console.error('Failed to use ability:', error);
    }
  };

  const triggerAREffects = (navitar: Navitar) => {
    // This would be replaced with actual AR.js effects
    const scene = document.querySelector('a-scene');
    if (scene) {
      // Create ability-specific effects
      switch (navitar.particleEffect) {
        case 'healing':
          createHealingEffect(scene);
          break;
        case 'transformation':
          createTransformationEffect(scene);
          break;
        // Add more effects...
      }
    }
  };

  const createHealingEffect = (scene: Element) => {
    const particleSystem = document.createElement('a-entity');
    particleSystem.setAttribute('particle-system', {
      preset: 'snow',
      color: '#00FF00, #00CC00',
      particleCount: 200,
      velocityValue: '0 1 0',
    });
    scene.appendChild(particleSystem);
    setTimeout(() => scene.removeChild(particleSystem), 2000);
  };

  const createTransformationEffect = (scene: Element) => {
    const particleSystem = document.createElement('a-entity');
    particleSystem.setAttribute('particle-system', {
      preset: 'fire',
      color: '#FFA500, #FF4500',
      particleCount: 300,
      velocityValue: '0 2 0',
    });
    scene.appendChild(particleSystem);
    setTimeout(() => scene.removeChild(particleSystem), 2000);
  };

  if (!isARActive) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          AR is not supported on this device
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <a-scene
        vr-mode-ui="enabled: false"
        arjs="trackingMethod: best;"
        background="color: #87CEEB;"
      >
        <a-marker preset="hiro">
          {selectedNavitar && (
            <a-entity
              gltf-model={selectedNavitar.modelUrl}
              scale="0.5 0.5 0.5"
              animation-mixer="clip: Idle"
            >
              <a-entity
                geometry="primitive: sphere; radius: 1.5"
                material="color: #0000FF; transparent: true; opacity: 0.2"
                position="0 0.5 0"
                animation="property: rotation; to: 0 360 0; loop: true; dur: 10000"
              />
            </a-entity>
          )}
        </a-marker>
        <a-entity camera />
      </a-scene>

      <Box sx={{ position: 'fixed', bottom: 20, width: '100%', textAlign: 'center' }}>
        {navitars.map((navitar) => (
          <Button
            key={navitar.id}
            variant="contained"
            onClick={() => handleAbilityUse(navitar)}
            sx={{ m: 1 }}
          >
            {navitar.name} - {navitar.ability}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default NavitarDisplay; 