import React, { useEffect, useState, useRef } from 'react';
import { useGLTF, Text3D } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useAR } from '../contexts/ARContext';
import * as THREE from 'three';

interface AIAvatarProps {
  position: [number, number, number];
  name: string;
  personality: string;
  onSpeak: (message: string) => void;
}

const AIAvatar: React.FC<AIAvatarProps> = ({ position, name, personality, onSpeak }) => {
  const avatarRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/avatar.glb');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const { currentLocation } = useAR();

  // Animation states
  const [animationState, setAnimationState] = useState('idle');
  const [mouthOpen, setMouthOpen] = useState(0);

  // Handle speech synthesis
  const speak = async (message: string) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      return;
    }

    setIsSpeaking(true);
    setCurrentMessage(message);
    onSpeak(message);

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Animate mouth while speaking
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        setMouthOpen(0.5);
        setTimeout(() => setMouthOpen(0), 100);
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentMessage('');
      setAnimationState('idle');
    };

    window.speechSynthesis.speak(utterance);
  };

  // Handle user interaction
  const handleInteraction = async () => {
    if (isSpeaking) return;

    setAnimationState('listening');
    
    try {
      // Here you would integrate with your AI service
      // For now, we'll use a simple response
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `User interacted with ${name} at location ${currentLocation}`,
          personality,
        }),
      });

      const data = await response.json();
      speak(data.response);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      speak("I'm sorry, I couldn't process that right now.");
    }
  };

  // Animation loop
  useFrame((state, delta) => {
    if (avatarRef.current) {
      // Add subtle breathing animation
      avatarRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.02;
      
      // Handle different animation states
      switch (animationState) {
        case 'listening':
          avatarRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
          break;
        case 'speaking':
          avatarRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 3) * 0.05;
          break;
        default:
          avatarRef.current.rotation.y = 0;
      }
    }
  });

  return (
    <group ref={avatarRef} position={position} onClick={handleInteraction}>
      <primitive object={scene} scale={0.5} />
      {/* Add speech bubble when speaking */}
      {isSpeaking && (
        <mesh position={[0, 2, 0]}>
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={0.2}
            height={0.05}
            curveSegments={12}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.02}
            bevelOffset={0}
            bevelSegments={5}
          >
            {currentMessage}
            <meshStandardMaterial color="black" />
          </Text3D>
        </mesh>
      )}
    </group>
  );
};

export default AIAvatar; 