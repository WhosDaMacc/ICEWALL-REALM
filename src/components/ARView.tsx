import React, { useEffect, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { ARButton, XR, useHitTest, useXR } from '@react-three/xr';
import { OrbitControls, Text, useGLTF, Environment, Float } from '@react-three/drei';
import { useRealm } from '../contexts/RealmContext';
import { useAR } from '../contexts/ARContext';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import * as THREE from 'three';
import AIAvatar from './AIAvatar';

interface ARViewProps {
  realmId: number;
}

interface Business {
  id: number;
  name: string;
  // ... other business properties
}

interface InteractionData {
  message?: string;
  business?: Business;
  location?: { latitude: number; longitude: number };
}

// Business marker component
const BusinessMarker: React.FC<{
  position: [number, number, number];
  name: string;
  onClick: () => void;
}> = ({ position, name, onClick }) => {
  return (
    <group position={position} onClick={onClick}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        <Text
          position={[0, 0.8, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {name}
        </Text>
      </Float>
    </group>
  );
};

// Interaction marker component
const InteractionMarker: React.FC<{
  position: [number, number, number];
  type: string;
  user: string;
}> = ({ position, type, user }) => {
  return (
    <group position={position}>
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial color="blue" />
        </mesh>
        <Text
          position={[0, 0.4, 0]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {type}
        </Text>
      </Float>
    </group>
  );
};

// AR content component
const ARContent: React.FC = () => {
  const { currentRealm, interactions, recordInteraction } = useRealm();
  const { currentLocation, arObjects, addARObject } = useAR();
  const [hitPosition, setHitPosition] = useState<THREE.Vector3 | null>(null);
  const { isPresenting } = useXR();

  // Handle hit testing for AR placement
  useHitTest((hitMatrix: THREE.Matrix4) => {
    if (!hitPosition) {
      const position = new THREE.Vector3();
      position.setFromMatrixPosition(hitMatrix);
      setHitPosition(position);
    }
  });

  // Memoize business markers for better performance
  const businessMarkers = useMemo(() => {
    if (!currentRealm?.businesses) return null;
    
    return currentRealm.businesses.map((business: Business, index: number) => (
      <BusinessMarker
        key={business.id}
        position={[index * 2, 0, -5]}
        name={business.name}
        onClick={() => recordInteraction('business_view', business.id, currentLocation)}
      />
    ));
  }, [currentRealm?.businesses, recordInteraction, currentLocation]);

  // Memoize interaction markers
  const interactionMarkers = useMemo(() => {
    if (!interactions) return null;
    
    return interactions.map((interaction, index) => (
      <InteractionMarker
        key={`${interaction.user}-${interaction.timestamp}`}
        position={[index * 1.5, 1, -3]}
        type={interaction.interactionType}
        user={interaction.user}
      />
    ));
  }, [interactions]);

  // Handle AI avatar interactions
  const handleAvatarSpeak = (message: string) => {
    const interactionData: InteractionData = {
      message,
      location: currentLocation
    };
    recordInteraction('avatar_speak', interactionData, currentLocation);
  };

  // Add AI avatars when AR is active
  useEffect(() => {
    if (isPresenting && hitPosition) {
      const avatarPositions = [
        [hitPosition.x + 2, hitPosition.y, hitPosition.z],
        [hitPosition.x - 2, hitPosition.y, hitPosition.z],
      ];

      avatarPositions.forEach((position, index) => {
        addARObject({
          type: 'avatar',
          position,
          name: `Guide ${index + 1}`,
          personality: 'helpful and friendly guide',
          component: (
            <AIAvatar
              key={`avatar-${index}`}
              position={position as [number, number, number]}
              name={`Guide ${index + 1}`}
              personality="helpful and friendly guide"
              onSpeak={handleAvatarSpeak}
            />
          ),
        });
      });
    }
  }, [isPresenting, hitPosition, addARObject]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Environment preset="city" />
      
      {businessMarkers}
      {interactionMarkers}
      
      {/* Render AR objects */}
      {arObjects.map((obj) => obj.component)}

      {/* Add a ground plane for better AR placement */}
      {isPresenting && hitPosition && (
        <mesh position={hitPosition} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="white" transparent opacity={0.2} />
        </mesh>
      )}
    </>
  );
};

const ARView: React.FC<ARViewProps> = ({ realmId }) => {
  const { currentRealm, loadRealm } = useRealm();
  const { isARActive, startAR, stopAR, error: arError } = useAR();
  const [isARSupported, setIsARSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkARSupport = async () => {
      try {
        if (navigator.xr) {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setIsARSupported(supported);
          if (!supported) {
            setError('AR is not supported on your device');
          }
        } else {
          setError('WebXR is not supported on your device');
        }
      } catch (err) {
        setError('Failed to check AR support');
      } finally {
        setIsLoading(false);
      }
    };

    checkARSupport();
    loadRealm(realmId);
  }, [realmId, loadRealm]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || arError) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">{error || arError}</Typography>
      </Box>
    );
  }

  if (!isARSupported) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>AR is not supported on your device</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100vh', position: 'relative' }}>
      <ARButton
        sessionInit={{
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: document.body },
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 0], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <XR>
          <ARContent />
        </XR>
      </Canvas>
      
      {/* Overlay controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          gap: 2,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={isARActive ? stopAR : startAR}
        >
          {isARActive ? 'Stop AR' : 'Start AR'}
        </Button>
      </Box>
    </Box>
  );
};

export default ARView; 