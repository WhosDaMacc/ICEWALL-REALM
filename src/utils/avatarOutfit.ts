// The player's avatar is a customizable character — not a likeness of
// anyone. Outfits are swappable pieces (top colour, pants colour, hat /
// accessory slot) so the system can grow later: shop outfits people buy,
// earned styles, event looks. The avatar's current outfit is one small
// id in localStorage; the Stroll scene reads it and the Stroll page lets
// the player switch it. A new outfit only needs an entry in
// AVATAR_OUTFITS to become pickable.

export type AvatarHat = 'none' | 'beanie' | 'crown';

export interface AvatarOutfit {
  id: string;
  name: string;
  // Short tag shown in the picker: Default, Earned style, etc.
  tag: string;
  topColor: string;
  pantsColor: string;
  hat: AvatarHat;
  hatColor: string;
}

// Built-in looks. 'street' is the default; the others are earned-style
// variants that show off the slots the system supports.
export const AVATAR_OUTFITS: AvatarOutfit[] = [
  {
    id: 'street',
    name: 'Street',
    tag: 'Default',
    topColor: '#2196f3',
    pantsColor: '#37474f',
    hat: 'none',
    hatColor: '#ffffff',
  },
  {
    id: 'glacier',
    name: 'Glacier',
    tag: 'Earned style',
    topColor: '#81D4FA',
    pantsColor: '#ECEFF1',
    hat: 'beanie',
    hatColor: '#ffffff',
  },
  {
    id: 'royal',
    name: 'Royal',
    tag: 'Earned style',
    topColor: '#9C27B0',
    pantsColor: '#212121',
    hat: 'crown',
    hatColor: '#FFD700',
  },
];

export const DEFAULT_AVATAR_OUTFIT = AVATAR_OUTFITS[0];

const OUTFIT_KEY = 'icewall-avatar-outfit';

export function getAvatarOutfit(id: string): AvatarOutfit {
  return AVATAR_OUTFITS.find(o => o.id === id) ?? DEFAULT_AVATAR_OUTFIT;
}

export function loadAvatarOutfit(): AvatarOutfit {
  try {
    const raw = localStorage.getItem(OUTFIT_KEY);
    if (raw) return getAvatarOutfit(raw);
  } catch {
    // Private mode / quota: the default still works for this session.
  }
  return DEFAULT_AVATAR_OUTFIT;
}

export function saveAvatarOutfit(id: string): void {
  try {
    localStorage.setItem(OUTFIT_KEY, id);
  } catch {
    // Private mode / quota: the outfit still works for this session.
  }
}
