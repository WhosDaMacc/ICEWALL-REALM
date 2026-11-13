import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';
import { useVenue } from '../contexts/VenueContext';
import { resolveNavitarArt } from '../utils/navitarArt';
import { WILD_NAVITARS, type WildNavitar } from '../data/wild';
import { ARNavitar } from '../components/ARNavitar';

// AR camera view — the player's navitar standing in the live rear-camera
// feed. Local-only: no backend, no video recording or upload.
//
// HONEST SCOPE, stated on the page itself: this is a camera-feed +
// 3D overlay view, NOT true world-anchored AR. There is no ARCore/ARKit
// world tracking and no WebXR anchor, so the navitar is a fixed
// on-screen anchor — it stays framed in the centre of the screen as
// the phone moves, rather than being pinned to a real-world point.
//
// Camera permission is only requested on user action (the "Open camera"
// button), never on page load, so the page never blocks on a permission
// dialog. The stream is stopped when the view is left (unmount cleanup)
// and when "Stop camera" is tapped. If the camera is denied,
// unavailable, or the browser has none (headless/desktop), the page
// shows a clear explanation plus the navitar in a still scene — never
// a blank or black screen, never a crash.
type CameraState = 'idle' | 'requesting' | 'live' | 'error';

function cameraErrorMessage(error: unknown): string {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return (
      'This browser can’t open the camera here — camera access needs a secure (https) page ' +
      'and a device camera. Your navitar is shown in the still scene below instead.'
    );
  }
  const name = (error as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return (
      'Camera access was denied — the browser didn’t get permission to use the camera. ' +
      'Allow camera access for this site in your browser settings and try again, or see ' +
      'your navitar in the still scene below.'
    );
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return (
      'No camera was found on this device, or it doesn’t support a rear camera. ' +
      'Your navitar is shown in the still scene below instead.'
    );
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return (
      'The camera is busy or couldn’t be started — another app may be using it. ' +
      'Close other apps using the camera and try again, or see your navitar in the ' +
      'still scene below.'
    );
  }
  return (
    'The camera couldn’t be started. Your navitar is shown in the still scene below ' +
    'instead — try the camera again when you’re ready.'
  );
}

const ARView: React.FC = () => {
  const navigate = useNavigate();
  const { userNavitar, addWildOpponent } = useNavitarFightClub();
  const { setPendingChallenge } = useVenue();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  // AR encounter — one wild navitar standing in the same view, picked
  // at random from the map's wild roster (src/data/wild.ts) when the
  // page loads. Session-only, like the map spawns; "Find another"
  // re-rolls it. It only renders when the player has a navitar — the
  // "Create a navitar first" panel covers the rest.
  const [encounter, setEncounter] = useState<WildNavitar | null>(
    () => WILD_NAVITARS[Math.floor(Math.random() * WILD_NAVITARS.length)] ?? null
  );
  const [showWildAccept, setShowWildAccept] = useState(false);

  // Stop every track on the stream and detach it from the video element.
  // Safe to call when no stream is running.
  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState('idle');
  }, []);

  // Leaving the view must release the camera — a stream left running
  // keeps the camera light on after navigating away.
  useEffect(() => {
    const stopOnUnmount = () => {
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
    return stopOnUnmount;
  }, []);

  // Rear camera first: facingMode "environment" is an ideal, not an
  // exact requirement, so a desktop with only a front camera still gets
  // a stream instead of an OverconstrainedError.
  const openCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(cameraErrorMessage(null));
      setCameraState('error');
      return;
    }
    setCameraState('requesting');
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // autoPlay covers playback once the source is set; this is
        // belt-and-braces, and a rejection here (e.g. autoplay policy)
        // must not turn a working stream into an error state.
        const playing = video.play() as unknown as Promise<void> | undefined;
        if (playing && typeof playing.catch === 'function') playing.catch(() => {});
      }
      setCameraState('live');
    } catch (error) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setCameraError(cameraErrorMessage(error));
      setCameraState('error');
    }
  }, []);

  // Re-roll the encounter — never the same wild twice in a row.
  const findAnother = useCallback(() => {
    setEncounter(prev => {
      if (WILD_NAVITARS.length < 2) return WILD_NAVITARS[0] ?? null;
      let next = prev;
      while (next === prev) {
        next = WILD_NAVITARS[Math.floor(Math.random() * WILD_NAVITARS.length)];
      }
      return next ?? null;
    });
    setShowWildAccept(false);
  }, []);

  // Same challenge path as the map's wild spawns: addWildOpponent, then
  // setPendingChallenge with the '' venue id (no venue win), then the
  // Battle page. Only the dialog's confirm button runs this.
  const challengeEncounter = useCallback(() => {
    if (!encounter) return;
    const opponentId = addWildOpponent({
      name: encounter.name,
      element: encounter.element,
      level: encounter.level,
      skills: encounter.skills,
      imageUrl: encounter.imageUrl,
    });
    setPendingChallenge(opponentId, '');
    setShowWildAccept(false);
    navigate('/battle');
  }, [encounter, addWildOpponent, setPendingChallenge, navigate]);

  const art = userNavitar ? resolveNavitarArt(userNavitar.imageUrl, userNavitar.name) : null;

  return (
    <Box sx={{ p: 2, maxWidth: 1000, margin: '0 auto' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          AR View
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          See your navitar standing in the world through your phone&apos;s camera.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Camera view — your navitar stands in front of you. This is a camera overlay, not true
          world-anchored AR: the navitar stays framed in the centre of the screen as you move the
          phone, instead of being pinned to a real-world spot.
        </Typography>
        {userNavitar && encounter && (
          <Typography variant="body2" color="text.secondary" paragraph>
            A wild {encounter.name} (Lv. {encounter.level}, {encounter.element}) is standing nearby
            in the same view — tap it, or Challenge below, to battle it.
          </Typography>
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Button component={RouterLink} to="/realm" variant="outlined">
            Back to map
          </Button>
          {userNavitar && (
            <Chip
              label={`${userNavitar.name} · Lv. ${userNavitar.level} · ${userNavitar.element}`}
              size="small"
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          The camera is only asked for when you tap “Open camera” — the page never requests
          permission on its own. Nothing is recorded or uploaded; the video stays on your device.
        </Typography>
      </Paper>

      {!userNavitar && (
        <Paper sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'primary.main' }}>
          <Typography variant="h6" gutterBottom>
            Create a navitar first
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            You need a navitar before it can stand in front of your camera.
          </Typography>
          <Button component={RouterLink} to="/battle" variant="contained">
            Create a navitar
          </Button>
        </Paper>
      )}

      {userNavitar && (
        <>
          {cameraState === 'error' && cameraError && (
            <Paper sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'warning.main' }}>
              <Typography variant="h6" gutterBottom>
                Camera unavailable
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {cameraError}
              </Typography>
              <Button variant="contained" onClick={openCamera}>
                Try camera again
              </Button>
            </Paper>
          )}

          {/* The stage: the live camera feed fills it, and two figures
              share it like a Pokémon Go encounter — the player's navitar
              on the left, the wild one on the right, a step smaller and
              further back, each grounded by its shadow. When there is no
              live feed the stage is a still dusk scene instead — both
              navitars are always visible, never a black box. */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: 560,
              borderRadius: '16px',
              overflow: 'hidden',
              bgcolor: '#121212',
              background:
                cameraState === 'live'
                  ? '#000'
                  : 'linear-gradient(180deg, #2b3a55 0%, #1a2233 55%, #121212 100%)',
            }}
          >
            {/* The video element is always mounted so openCamera can
                attach the stream through its ref before the state
                flips to live; it is hidden until the camera is live,
                so it never reads as a black rectangle. */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Live camera feed"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: cameraState === 'live' ? 'block' : 'none',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                left: '3%',
                bottom: 20,
                width: '46%',
                height: '62%',
              }}
            >
              <ARNavitar
                name={userNavitar.name}
                element={userNavitar.element}
                modelUrl={userNavitar.modelUrl}
                modelZoom={userNavitar.modelZoom}
                imageUrl={art}
              />
            </Box>
            {encounter && (
              <Box
                role="button"
                aria-label={`Challenge wild ${encounter.name}`}
                onClick={() => setShowWildAccept(true)}
                sx={{
                  position: 'absolute',
                  right: '3%',
                  bottom: 20,
                  width: '40%',
                  height: '52%',
                  cursor: 'pointer',
                }}
              >
                <ARNavitar
                  name={encounter.name}
                  element={encounter.element}
                  imageUrl={encounter.imageUrl}
                />
                <Chip
                  label={`WILD · ${encounter.name} · Lv. ${encounter.level}`}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'rgba(18,18,18,0.85)',
                    whiteSpace: 'nowrap',
                  }}
                />
              </Box>
            )}
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Chip
                label={
                  cameraState === 'live'
                    ? '● Live camera'
                    : cameraState === 'requesting'
                      ? 'Starting camera…'
                      : 'Still scene — camera off'
                }
                size="small"
                sx={{ bgcolor: 'rgba(18,18,18,0.85)' }}
              />
              <Chip
                label={`${userNavitar.name}`}
                size="small"
                sx={{ bgcolor: 'rgba(18,18,18,0.85)' }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            {cameraState === 'live' ? (
              <Button variant="outlined" onClick={stopCamera}>
                Stop camera
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={openCamera}
                disabled={cameraState === 'requesting'}
              >
                {cameraState === 'requesting' ? 'Starting camera…' : '📷 Open camera'}
              </Button>
            )}
            <Button component={RouterLink} to="/stroll" variant="outlined">
              Stroll with {userNavitar.name}
            </Button>
            {encounter && (
              <>
                <Button variant="contained" onClick={() => setShowWildAccept(true)}>
                  Challenge wild {encounter.name}
                </Button>
                <Button variant="outlined" onClick={findAnother}>
                  Find another
                </Button>
              </>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {cameraState === 'live'
              ? 'Your navitar stays framed as you move — point the rear camera at the ground in ' +
                'front of you and it reads as standing there.'
              : 'Tip: on a phone, hold it upright and point the rear camera at the ground a few ' +
                'steps ahead — the navitar stands where you’re looking.'}
          </Typography>
          {encounter && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              A wild {encounter.name} (Lv. {encounter.level}, {encounter.element}) is standing
              nearby — tap it or Challenge above to battle. A win banks Lv. × 10 points; a loss
              costs nothing.
            </Typography>
          )}
        </>
      )}

      {/* Wild accept dialog — mirrors the map's wild spawns: the wild
          navitar accepted the challenge, and only the confirm button
          runs challengeEncounter (same '' venue id = no venue win). */}
      <Dialog open={showWildAccept && encounter !== null} onClose={() => setShowWildAccept(false)}>
        {encounter && (
          <>
            <DialogTitle>It accepted!</DialogTitle>
            <DialogContent>
              <Typography variant="body1">
                {encounter.name} accepted your challenge — the wild navitar is ready to battle. A
                loss costs nothing.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowWildAccept(false)}>Not yet</Button>
              <Button variant="contained" onClick={challengeEncounter}>
                To the Battle Arena
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ARView;
