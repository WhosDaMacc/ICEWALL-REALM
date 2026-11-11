import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { elementColor, elementEmoji } from '../utils/navitarArt';

// Art image with a loading treatment: the image sits on an
// element-coloured gradient, so while it loads (or if it fails) the
// slot never reads as an empty circle or a flat-colour block — and it
// fades in on load instead of popping in. CSS only, no spinner.
// Used by the battle stage, the map's person thumbs, Profile, and the
// showcase cards.
//
// Two failure modes this guards against (both observed in the wild):
// 1. Cached-image race: an image already in the browser's cache can
//    finish loading before React attaches the onLoad handler, so
//    `loaded` stays false and the image sits invisible (opacity 0)
//    over the gradient forever — exactly the "flat colour blob, no art"
//    the browser check saw on Home while the identical art rendered
//    fine on Collection. The `complete` check on mount closes it: an
//    already-loaded image shows immediately.
// 2. A genuinely failed load: instead of an invisible box, the slot
//    shows the element emoji — always something visible.
export const NavitarArtImg: React.FC<{
  src: string;
  alt: string;
  element: string;
  style?: React.CSSProperties;
}> = ({ src, alt, element, style }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const color = elementColor(element);

  useEffect(() => {
    const img = imgRef.current;
    // A new src starts unloaded (unless it is already complete — the
    // cached-image case above). `complete` is also true for a broken
    // image, so naturalWidth has to be > 0 as well.
    setFailed(false);
    setLoaded(!!(img && img.complete && img.naturalWidth > 0));
  }, [src]);

  if (failed) {
    return (
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          background: `radial-gradient(circle at 35% 30%, ${color}66, #121212 75%)`,
          ...style,
        }}
        role="img"
        aria-label={alt}
      >
        {elementEmoji(element)}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: `radial-gradient(circle at 35% 30%, ${color}66, #121212 75%)`,
        ...style,
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.45s ease-in',
        }}
      />
    </Box>
  );
};
