import React, { Component, lazy, ReactNode, Suspense, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { NavitarArtImg } from './NavitarArtImg';

// The three.js renderer lives behind React.lazy so the (large) three.js
// code splits out of the main bundle and only loads when a 3D view is
// actually shown. A failure to load or mount it can never take the page
// down: the lazy import or the canvas render throws inside
// ModelErrorBoundary and the 2D art renders instead.
//
// NOTE: this deliberately does NOT use @react-three/fiber. Fiber 9 (via
// its `its-fine` dependency) statically references React.use, which
// React 18 does not export — importing fiber breaks the production build
// outright ("'use' is not exported from 'react'"). The viewer therefore
// uses plain three.js (see ModelCanvas), which compiles and runs on
// React 18. If the app ever moves to React 19, the viewer can be
// revisited — the ModelViewer props stay the same either way.
const ModelCanvas = lazy(() => import('./ModelCanvas'));

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.warn('3D model failed to render, showing 2D art instead:', error);
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export interface ModelViewerProps {
  modelUrl: string;
  // 2D art shown while the GLB loads, and in place of the model if 3D
  // is unavailable. Absent for the griffin (no 2D art exists for it),
  // in which case the slot is a neutral placeholder.
  fallbackSrc?: string;
  fallbackAlt: string;
  element?: string;
  height?: number | string;
  // Closer framing for wide-spanning models (the phoenix's wings).
  zoom?: number;
}

// A real browser always defines WebGLRenderingContext; jsdom and
// WebGL-less environments do not. Checking for the constructor (instead
// of calling canvas.getContext) avoids a jsdom "not implemented" console
// error and skips the renderer entirely where it cannot run.
function webglAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { WebGLRenderingContext?: unknown };
  return typeof w.WebGLRenderingContext !== 'undefined';
}

export const ModelViewer: React.FC<ModelViewerProps> = ({
  modelUrl,
  fallbackSrc,
  fallbackAlt,
  element = 'ice',
  height = 260,
  zoom = 1,
}) => {
  // One-shot gate: no WebGL, no Canvas attempt at all.
  const [canRender3d] = useState(() => webglAvailable());
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const fallback = fallbackSrc ? (
    <NavitarArtImg
      src={fallbackSrc}
      alt={fallbackAlt}
      element={element}
      style={{ width: '100%', height: '100%' }}
    />
  ) : (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 30%, #546e7a66, #121212 75%)',
        px: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary" align="center">
        {fallbackAlt}
      </Typography>
    </Box>
  );

  // While the GLB itself downloads (17–22 MB) the slot shows the 2D art
  // under a "Loading 3D model…" veil, so it never reads as an empty box.
  const loadingOverlay = (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {fallback}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.45)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading 3D model…</Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        width: '100%',
        height,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
      }}
    >
      {canRender3d && !failed ? (
        <ModelErrorBoundary fallback={fallback}>
          <Suspense fallback={loadingOverlay}>
            <ModelCanvas
              modelUrl={modelUrl}
              zoom={zoom}
              onLoaded={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          </Suspense>
          {!loaded && <Box sx={{ position: 'absolute', inset: 0 }}>{loadingOverlay}</Box>}
        </ModelErrorBoundary>
      ) : (
        fallback
      )}
    </Box>
  );
};
