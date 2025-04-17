import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { Navitar } from '../data/navitars';

interface BattleEnvironmentProps {
  attacker: Navitar;
  defender: Navitar;
  isActive: boolean;
  onEnvironmentReady: () => void;
}

const BattleEnvironment: React.FC<BattleEnvironmentProps> = ({
  attacker,
  defender,
  isActive,
  onEnvironmentReady,
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !sceneRef.current) return;

    setupEnvironment();
    onEnvironmentReady();

    return () => {
      cleanup();
    };
  }, [isActive, attacker, defender]);

  const setupEnvironment = () => {
    if (!sceneRef.current) return;

    const scene = document.createElement('a-scene');
    scene.setAttribute('embedded', '');
    scene.setAttribute('arjs', 'trackingMethod: best; debugUIEnabled: false;');
    scene.setAttribute('renderer', 'antialias: true; physicallyCorrectLights: true;');

    // Add environment
    const environment = createEnvironment();
    scene.appendChild(environment);

    // Add lighting
    const lights = createLighting();
    lights.forEach(light => scene.appendChild(light));

    // Add terrain
    const terrain = createTerrain();
    scene.appendChild(terrain);

    // Add weather effects
    const weather = createWeatherEffects();
    scene.appendChild(weather);

    // Add combatants
    const [attackerEntity, defenderEntity] = createCombatants();
    scene.appendChild(attackerEntity);
    scene.appendChild(defenderEntity);

    sceneRef.current.innerHTML = '';
    sceneRef.current.appendChild(scene);
  };

  const createEnvironment = () => {
    const environment = document.createElement('a-entity');
    const preset = getEnvironmentPreset();
    
    environment.setAttribute('environment', {
      preset,
      skyType: 'atmosphere',
      lighting: getTimeOfDay(),
      shadow: true,
      fog: 0.5,
      dressing: getEnvironmentDressing(),
      dressingAmount: 15,
      dressingColor: getEnvironmentColor(),
      ground: 'canyon',
      groundYScale: 5,
      groundTexture: 'walkernoise',
      groundColor: getGroundColor(),
      groundColor2: getGroundColor2(),
    });

    return environment;
  };

  const createLighting = () => {
    const lights = [];

    // Ambient light
    const ambient = document.createElement('a-entity');
    ambient.setAttribute('light', {
      type: 'ambient',
      color: '#BBB',
      intensity: 0.5,
    });
    lights.push(ambient);

    // Directional light
    const directional = document.createElement('a-entity');
    directional.setAttribute('light', {
      type: 'directional',
      color: '#FFF',
      intensity: 1,
      castShadow: true,
    });
    directional.setAttribute('position', '1 1 1');
    lights.push(directional);

    // Type-specific lighting
    const typeLight = document.createElement('a-entity');
    typeLight.setAttribute('light', {
      type: 'point',
      color: getTypeColor(attacker.type),
      intensity: 0.5,
      distance: 20,
    });
    typeLight.setAttribute('position', '0 5 -5');
    lights.push(typeLight);

    return lights;
  };

  const createTerrain = () => {
    const terrain = document.createElement('a-entity');
    
    // Base terrain
    terrain.setAttribute('geometry', {
      primitive: 'plane',
      width: 100,
      height: 100,
    });
    
    terrain.setAttribute('material', {
      shader: 'standard',
      color: getGroundColor(),
      roughness: 1,
      metalness: 0,
      normalMap: '#terrainNormal',
      normalTextureRepeat: '50 50',
      displacementMap: '#terrainHeight',
      displacementScale: 10,
      displacementBias: -0.5,
    });

    // Add terrain features based on type
    const features = createTerrainFeatures();
    features.forEach(feature => terrain.appendChild(feature));

    return terrain;
  };

  const createTerrainFeatures = () => {
    const features = [];
    const type = attacker.type;

    switch (type) {
      case 'healer':
        // Add healing crystals
        for (let i = 0; i < 5; i++) {
          const crystal = document.createElement('a-entity');
          crystal.setAttribute('geometry', {
            primitive: 'cone',
            radiusBottom: 0.5,
            radiusTop: 0,
            height: 2,
          });
          crystal.setAttribute('material', {
            color: '#7CFF7C',
            emissive: '#7CFF7C',
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8,
          });
          crystal.setAttribute('position', {
            x: Math.random() * 20 - 10,
            y: 1,
            z: Math.random() * 20 - 10,
          });
          features.push(crystal);
        }
        break;

      case 'attacker':
        // Add lava pools
        for (let i = 0; i < 3; i++) {
          const lava = document.createElement('a-entity');
          lava.setAttribute('geometry', {
            primitive: 'circle',
            radius: 2,
          });
          lava.setAttribute('material', {
            shader: 'standard',
            color: '#FF4500',
            emissive: '#FF0000',
            emissiveIntensity: 1,
          });
          lava.setAttribute('position', {
            x: Math.random() * 20 - 10,
            y: 0.1,
            z: Math.random() * 20 - 10,
          });
          lava.setAttribute('rotation', '-90 0 0');
          features.push(lava);
        }
        break;

      // Add more type-specific features
    }

    return features;
  };

  const createWeatherEffects = () => {
    const weather = document.createElement('a-entity');
    
    switch (attacker.type) {
      case 'healer':
        weather.setAttribute('particle-system', {
          preset: 'dust',
          particleCount: 1000,
          color: ['#7CFF7C', '#00FF00'],
          size: 0.1,
          maxAge: 2,
          velocityValue: '0 -0.1 0',
        });
        break;

      case 'attacker':
        weather.setAttribute('particle-system', {
          preset: 'fire',
          particleCount: 500,
          color: ['#FF4500', '#FF0000'],
          size: 0.2,
          maxAge: 1,
          velocityValue: '0 1 0',
        });
        break;

      // Add more weather effects
    }

    return weather;
  };

  const createCombatants = () => {
    const attackerEntity = document.createElement('a-entity');
    const defenderEntity = document.createElement('a-entity');

    // Set up attacker
    attackerEntity.setAttribute('gltf-model', attacker.modelUrl || '#defaultModel');
    attackerEntity.setAttribute('position', '-2 0 -5');
    attackerEntity.setAttribute('scale', '0.5 0.5 0.5');
    attackerEntity.setAttribute('animation-mixer', {
      clip: 'Idle',
      loop: 'repeat',
    });

    // Set up defender
    defenderEntity.setAttribute('gltf-model', defender.modelUrl || '#defaultModel');
    defenderEntity.setAttribute('position', '2 0 -5');
    defenderEntity.setAttribute('scale', '0.5 0.5 0.5');
    defenderEntity.setAttribute('animation-mixer', {
      clip: 'Idle',
      loop: 'repeat',
    });

    return [attackerEntity, defenderEntity];
  };

  const getEnvironmentPreset = () => {
    switch (attacker.type) {
      case 'healer': return 'forest';
      case 'attacker': return 'volcano';
      case 'defender': return 'mountain';
      case 'support': return 'starry';
      default: return 'default';
    }
  };

  const getTimeOfDay = () => {
    switch (attacker.type) {
      case 'healer': return 'morning';
      case 'attacker': return 'night';
      case 'defender': return 'sunset';
      case 'support': return 'twilight';
      default: return 'day';
    }
  };

  const getEnvironmentDressing = () => {
    switch (attacker.type) {
      case 'healer': return 'trees';
      case 'attacker': return 'towers';
      case 'defender': return 'stones';
      case 'support': return 'mushrooms';
      default: return 'none';
    }
  };

  const getEnvironmentColor = () => {
    switch (attacker.type) {
      case 'healer': return '#1A5D1A';
      case 'attacker': return '#8B0000';
      case 'defender': return '#4A4A4A';
      case 'support': return '#4B0082';
      default: return '#666666';
    }
  };

  const getGroundColor = () => {
    switch (attacker.type) {
      case 'healer': return '#2E8B57';
      case 'attacker': return '#8B4513';
      case 'defender': return '#708090';
      case 'support': return '#483D8B';
      default: return '#A0522D';
    }
  };

  const getGroundColor2 = () => {
    switch (attacker.type) {
      case 'healer': return '#228B22';
      case 'attacker': return '#A0522D';
      case 'defender': return '#778899';
      case 'support': return '#6A5ACD';
      default: return '#8B4513';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'healer': return '#00FF00';
      case 'attacker': return '#FF0000';
      case 'defender': return '#0000FF';
      case 'support': return '#800080';
      default: return '#FFFFFF';
    }
  };

  const cleanup = () => {
    if (sceneRef.current) {
      sceneRef.current.innerHTML = '';
    }
  };

  return (
    <Box
      ref={sceneRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
};

export default BattleEnvironment; 