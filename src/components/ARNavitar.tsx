import React, { useState } from 'react';
import { Box } from '@mui/material';
import { ModelViewer } from './ModelViewer';
import { elementColor } from '../utils/navitarArt';

// The navitar as it stands in the AR camera view: the same three-step
// visual as the Stroll companion — its GLB model when it has one, its
// 2D art on a billboard when it doesn't, an element-coloured glowing
// orb when it has neither. The renderer is transparent (ModelCanvas
// uses an alpha renderer), so the live camera feed shows through
// around it. A soft ground shadow sits under the visual so it reads
// as standing in the world, not floating on the screen.
//
// The visual is framed as a fixed on-screen anchor: the navitar stays
// centred in the frame as the phone moves. That is the honest v1
// scope — a camera-feed overlay, not true world-anchored AR (no
// ARCore/ARKit world tracking, no WebXR anchors). ARView says so
// plainly next to the stage.
export interface ARNavitarProps {
  name: string;
  element: string;
  modelUrl?: string;
  modelZoom?: number;
  imageUrl?: string | null;
}

export const ARNavitar: React.FC<ARNavitarProps> = ({
  name,
  element,
  modelUrl,
  modelZoom = 1,
  imageUrl,
}) => {
  // The 2D billboard falls back to the orb if the art fails to load,
  // so a broken image URL never leaves an empty slot over the camera.
  const [artFailed, setArtFailed] = useState(false);
  const color = elementColor(element);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {modelUrl ? (
        <ModelViewer
          modelUrl={modelUrl}
          fallbackSrc={imageUrl ?? undefined}
          fallbackAlt={`${name} art`}
          element={element}
          height="100%"
          zoom={modelZoom}
        />
      ) : imageUrl && !artFailed ? (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <img
            src={imageUrl}
            alt={`${name} art`}
            onError={() => setArtFailed(true)}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.55))',
            }}
          />
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pb: '12%',
          }}
        >
          <Box
            role="img"
            aria-label={`${name} (glowing orb)`}
            sx={{
              width: '46%',
              aspectRatio: '1',
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${color} 45%, #121212 78%)`,
              boxShadow: `0 0 42px 10px ${color}88`,
              animation: 'ar-orb-pulse 2.4s ease-in-out infinite',
              '@keyframes ar-orb-pulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.07)' },
              },
            }}
          />
        </Box>
      )}
      {/* Ground shadow: a soft dark ellipse under the visual's feet.
          The GLB is vertically centred in its box and stands ~1.8 units
          tall in a ~2.6-unit view, so its feet land near 85% down the
          box — the shadow sits at 6% up from the bottom, close under
          them. The billboard and orb are bottom-anchored, so the same
          spot works for all three. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: '4%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '58%',
          height: 26,
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0) 72%)',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
};
