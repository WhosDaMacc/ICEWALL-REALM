import React, { lazy, Suspense, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, ButtonGroup, CircularProgress, Paper, Typography } from '@mui/material';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';
import { resolveNavitarArt } from '../utils/navitarArt';
import { AVATAR_OUTFITS, loadAvatarOutfit, saveAvatarOutfit } from '../utils/avatarOutfit';
import type { StrollEnvironment, TouchKeys } from '../components/StrollScene';

// The 3D scene lives behind React.lazy so the (large) three.js code
// splits out of the main bundle and only loads when the Stroll page is
// actually shown — same pattern as ModelViewer. The scene itself uses
// plain three.js, not @react-three/fiber (fiber 9 breaks the React 18
// build outright — see ModelCanvas).
const StrollScene = lazy(() => import('../components/StrollScene'));

// A real browser always defines WebGLRenderingContext; jsdom and
// WebGL-less environments do not. Checking for the constructor (instead
// of calling canvas.getContext) avoids a jsdom "not implemented" console
// error and skips the scene entirely where it cannot run.
function webglAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { WebGLRenderingContext?: unknown };
  return typeof w.WebGLRenderingContext !== 'undefined';
}

const Stroll: React.FC = () => {
  const { userNavitar } = useNavitarFightClub();
  // One-shot gate: no WebGL, no scene attempt at all — the page stays a
  // friendly message instead of a blank canvas or a crash.
  const [canRender3d] = useState(() => webglAvailable());
  const [environment, setEnvironment] = useState<StrollEnvironment>('forest');
  // The avatar's outfit: a swappable character look, persisted by id.
  // The scene applies it live; the picker just switches the id.
  const [outfit, setOutfit] = useState(() => loadAvatarOutfit());
  const touchKeys = useRef<TouchKeys>({ forward: false, left: false, right: false, back: false });

  const companion = userNavitar
    ? {
        name: userNavitar.name,
        element: userNavitar.element,
        modelUrl: userNavitar.modelUrl,
        modelZoom: userNavitar.modelZoom,
        imageUrl: resolveNavitarArt(userNavitar.imageUrl, userNavitar.name),
      }
    : null;

  // Hold-to-walk buttons for touch: pressing one sets the same flag the
  // keyboard sets, releasing clears it. touch-action none so the page
  // doesn't scroll while a button is held.
  const holdProps = (key: keyof TouchKeys) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      touchKeys.current[key] = true;
    },
    onPointerUp: () => {
      touchKeys.current[key] = false;
    },
    onPointerLeave: () => {
      touchKeys.current[key] = false;
    },
    onPointerCancel: () => {
      touchKeys.current[key] = false;
    },
    onContextMenu: (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault(),
  });

  return (
    <Box sx={{ p: 2, maxWidth: 1000, margin: '0 auto' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Stroll
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Take a walk with your navitar — through the woods, or down the city streets.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <ButtonGroup aria-label="Stroll environment">
            <Button
              variant={environment === 'forest' ? 'contained' : 'outlined'}
              aria-pressed={environment === 'forest'}
              onClick={() => setEnvironment('forest')}
            >
              🌲 Forest
            </Button>
            <Button
              variant={environment === 'city' ? 'contained' : 'outlined'}
              aria-pressed={environment === 'city'}
              onClick={() => setEnvironment('city')}
            >
              🌆 City
            </Button>
          </ButtonGroup>
          <Typography variant="body1">
            {companion ? `Strolling with ${companion.name}` : 'Strolling solo — no navitar yet'}
          </Typography>
          <Button component={RouterLink} to="/realm" variant="outlined" sx={{ ml: 'auto' }}>
            Back to map
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          WASD or arrow keys to walk — W forward, A / D to turn, S to step back. On touch, use the
          on-screen buttons. Drag to look around; the camera follows behind you. Trees and buildings
          are scenery for now — you can walk straight through them.
        </Typography>
        {/* Outfit picker: the avatar is a character you dress up, not a
            likeness of anyone. New outfits only need an entry in
            src/utils/avatarOutfit.ts to appear here — shop and earned
            looks plug into this same picker later. */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Outfit:
          </Typography>
          {AVATAR_OUTFITS.map(o => (
            <Button
              key={o.id}
              size="small"
              variant={outfit.id === o.id ? 'contained' : 'outlined'}
              aria-label={`Wear ${o.name} outfit`}
              aria-pressed={outfit.id === o.id}
              onClick={() => {
                saveAvatarOutfit(o.id);
                setOutfit(o);
              }}
            >
              {o.name} · {o.tag}
            </Button>
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Your avatar is a character you can dress up — outfits are swappable, and more looks (shop
          or earned) can plug in here later.
        </Typography>
      </Paper>

      {!userNavitar && (
        <Paper sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'primary.main' }}>
          <Typography variant="h6" gutterBottom>
            Create a navitar first
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            You can stroll on your own right now, but your navitar will walk beside you once you
            have one.
          </Typography>
          <Button component={RouterLink} to="/battle" variant="contained">
            Create a navitar
          </Button>
        </Paper>
      )}

      {canRender3d ? (
        <Box
          sx={{
            width: '100%',
            height: 560,
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            bgcolor: '#121212',
          }}
        >
          <Suspense
            fallback={
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <CircularProgress size={20} />
                <Typography variant="body2">Loading the stroll…</Typography>
              </Box>
            }
          >
            <StrollScene
              environment={environment}
              companion={companion}
              outfit={outfit}
              touchKeys={touchKeys}
            />
          </Suspense>
          {/* On-screen walk controls for touch. They sit above the canvas
              so they never fight the drag-to-look gesture. */}
          <Box
            sx={{
              position: 'absolute',
              right: 16,
              bottom: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 52px)',
              gridTemplateRows: 'repeat(2, 52px)',
              gap: 1,
            }}
          >
            <Box />
            <Button
              variant="contained"
              aria-label="Walk forward"
              sx={{ minWidth: 0, touchAction: 'none', fontSize: '1.2rem' }}
              {...holdProps('forward')}
            >
              ▲
            </Button>
            <Box />
            <Button
              variant="contained"
              aria-label="Turn left"
              sx={{ minWidth: 0, touchAction: 'none', fontSize: '1.2rem' }}
              {...holdProps('left')}
            >
              ◀
            </Button>
            <Button
              variant="contained"
              aria-label="Walk back"
              sx={{ minWidth: 0, touchAction: 'none', fontSize: '1.2rem' }}
              {...holdProps('back')}
            >
              ▼
            </Button>
            <Button
              variant="contained"
              aria-label="Turn right"
              sx={{ minWidth: 0, touchAction: 'none', fontSize: '1.2rem' }}
              {...holdProps('right')}
            >
              ▶
            </Button>
          </Box>
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            The 3D stroll needs WebGL
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This browser can&apos;t run WebGL, so the stroll can&apos;t load here. Your navitar is
            safe — you can still see it on the map and in your collection.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Stroll;
