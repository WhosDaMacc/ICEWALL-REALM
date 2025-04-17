import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface BattleAnimationProps {
  ability: string;
  powerLevel: number;
  isActive: boolean;
  onComplete: () => void;
}

const BattleAnimation: React.FC<BattleAnimationProps> = ({
  ability,
  powerLevel,
  isActive,
  onComplete,
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !sceneRef.current) return;

    const scene = document.createElement('a-scene');
    scene.setAttribute('embedded', '');
    scene.setAttribute('arjs', 'trackingMethod: best;');
    scene.setAttribute('renderer', 'logarithmicDepthBuffer: true;');

    // Create marker
    const marker = document.createElement('a-marker');
    marker.setAttribute('preset', 'hiro');

    // Create ability-specific effects
    const effect = createAbilityEffect(ability, powerLevel);
    marker.appendChild(effect);

    scene.appendChild(marker);
    scene.appendChild(document.createElement('a-entity').setAttribute('camera', ''));

    sceneRef.current.appendChild(scene);

    // Cleanup after animation
    const timeout = setTimeout(() => {
      sceneRef.current?.removeChild(scene);
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(timeout);
      sceneRef.current?.removeChild(scene);
    };
  }, [ability, powerLevel, isActive, onComplete]);

  const createAbilityEffect = (ability: string, powerLevel: number) => {
    const container = document.createElement('a-entity');
    
    switch (ability.toLowerCase()) {
      case "nature's embrace":
        return createHealingEffect(container, powerLevel);
      case 'wild spirit':
        return createTransformationEffect(container, powerLevel);
      case 'marsh shuffle':
        return createTerrainEffect(container, powerLevel);
      case 'pixie dust':
        return createInvisibilityEffect(container, powerLevel);
      case 'thunder strike':
        return createLightningEffect(container, powerLevel);
      // Add more ability effects...
      default:
        return createDefaultEffect(container, powerLevel);
    }
  };

  const createHealingEffect = (container: HTMLElement, powerLevel: number) => {
    const particles = document.createElement('a-entity');
    particles.setAttribute('particle-system', {
      preset: 'snow',
      color: '#00FF00, #00CC00',
      particleCount: powerLevel * 20,
      velocityValue: '0 1 0',
    });
    container.appendChild(particles);
    return container;
  };

  const createTransformationEffect = (container: HTMLElement, powerLevel: number) => {
    const particles = document.createElement('a-entity');
    particles.setAttribute('particle-system', {
      preset: 'fire',
      color: '#FFA500, #FF4500',
      particleCount: powerLevel * 30,
      velocityValue: '0 2 0',
    });
    container.appendChild(particles);
    return container;
  };

  const createTerrainEffect = (container: HTMLElement, powerLevel: number) => {
    const terrain = document.createElement('a-entity');
    terrain.setAttribute('geometry', {
      primitive: 'plane',
      width: powerLevel * 0.5,
      height: powerLevel * 0.5,
    });
    terrain.setAttribute('material', {
      color: '#8B4513',
      transparent: true,
      opacity: 0.7,
    });
    terrain.setAttribute('animation', {
      property: 'rotation',
      to: '0 360 0',
      dur: 2000,
      loop: true,
    });
    container.appendChild(terrain);
    return container;
  };

  const createInvisibilityEffect = (container: HTMLElement, powerLevel: number) => {
    const particles = document.createElement('a-entity');
    particles.setAttribute('particle-system', {
      preset: 'snow',
      color: '#FFFFFF, #E0E0E0',
      particleCount: powerLevel * 25,
      velocityValue: '0 1.5 0',
    });
    container.appendChild(particles);
    return container;
  };

  const createLightningEffect = (container: HTMLElement, powerLevel: number) => {
    const lightning = document.createElement('a-entity');
    lightning.setAttribute('geometry', {
      primitive: 'cylinder',
      radius: 0.1,
      height: powerLevel * 0.8,
    });
    lightning.setAttribute('material', {
      color: '#FFFF00',
      emissive: '#FFFF00',
      emissiveIntensity: 1,
    });
    lightning.setAttribute('animation', {
      property: 'scale',
      from: '1 1 1',
      to: '1.5 1.5 1.5',
      dur: 500,
      loop: true,
    });
    container.appendChild(lightning);
    return container;
  };

  const createDefaultEffect = (container: HTMLElement, powerLevel: number) => {
    const particles = document.createElement('a-entity');
    particles.setAttribute('particle-system', {
      preset: 'snow',
      color: '#FFFFFF, #E0E0E0',
      particleCount: powerLevel * 15,
      velocityValue: '0 1 0',
    });
    container.appendChild(particles);
    return container;
  };

  return <Box ref={sceneRef} sx={{ width: '100%', height: '100%' }} />;
};

export default BattleAnimation; 