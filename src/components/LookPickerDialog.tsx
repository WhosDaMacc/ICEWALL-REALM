// The look-picker, shared by the create dialog and the "Change look"
// flow. The 9 showcase navitars and the 9 demo fighters, all with real
// art — the grid is the same everywhere, only the caller differs.
import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { ALL_NAVITAR_LOOKS } from '../utils/navitarArt';
import { NavitarArtImg } from './NavitarArtImg';

// The grid only: 18 thumbs in a wrap, a blue ring on the selected one,
// the selected look's name underneath. No dialog chrome — callers put
// it inside their own dialog (create) or use LookPickerDialog below.
export const LookGrid: React.FC<{
  selected: string;
  onSelect: (src: string) => void;
}> = ({ selected, onSelect }) => (
  <>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {ALL_NAVITAR_LOOKS.map(look => {
        const isSelected = selected === look.src;
        return (
          <Box
            key={look.name}
            component="button"
            type="button"
            aria-label={`Look: ${look.name}`}
            title={look.name}
            onClick={() => onSelect(look.src)}
            sx={{
              p: 0,
              border: isSelected ? '3px solid #2196f3' : '3px solid transparent',
              borderRadius: '50%',
              cursor: 'pointer',
              background: 'transparent',
            }}
          >
            <NavitarArtImg
              src={look.src}
              alt={look.name}
              element={look.element}
              style={{ width: 56, height: 56, borderRadius: '50%' }}
            />
          </Box>
        );
      })}
    </Box>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      {ALL_NAVITAR_LOOKS.find(l => l.src === selected)?.name ?? 'Frostbite'} — this is how your
      Navitar looks in battle.
    </Typography>
  </>
);

// Standalone change-look dialog: tap a thumb and it applies immediately
// (the caller saves it and closes). Used by Profile and Battle for a
// navitar that already exists — the look-picker used to live only in
// the create dialog, so a player who already had a navitar could never
// reach it and stayed an emoji on the stage and Profile.
export const LookPickerDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (src: string) => void;
  title?: string;
}> = ({ open, onClose, selected, onSelect, title = 'Change look' }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
        Look
      </Typography>
      <LookGrid selected={selected} onSelect={onSelect} />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Done</Button>
    </DialogActions>
  </Dialog>
);
