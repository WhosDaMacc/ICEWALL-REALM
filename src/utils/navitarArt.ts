// Single source of truth for navitar art, element colours and emoji.
// Art files live in public/navitars/ and are referenced via PUBLIC_URL so
// paths stay relative under the /ICEWALL-REALM/ subpath (homepage ".").

export const ELEMENT_COLORS: Record<string, string> = {
  ice: '#81D4FA',
  fire: '#FF5722',
  nature: '#4CAF50',
  shadow: '#9C27B0',
  light: '#FFC107',
  quantum: '#B388FF',
  electric: '#FFEA00',
  spiritual: '#80DEEA',
  water: '#2196F3',
};

export const ELEMENT_EMOJI: Record<string, string> = {
  ice: '❄️',
  fire: '🔥',
  nature: '🌿',
  shadow: '🌑',
  light: '✨',
  quantum: '🌌',
  electric: '⚡',
  spiritual: '🕊️',
  water: '💧',
};

export function elementColor(element: string): string {
  return ELEMENT_COLORS[element] ?? '#2196F3';
}

export function elementEmoji(element: string): string {
  return ELEMENT_EMOJI[element] ?? '🌀';
}

// Art by navitar name (lowercase). All 9 showcase navitars have art, and
// all 9 demo venue fighters now have art too; a player-created navitar
// only matches by name unless it picked a look at creation (imageUrl).
export const NAVITAR_ART: Record<string, string> = {
  frostbite: `${process.env.PUBLIC_URL}/navitars/frostbite.jpg`,
  emberwing: `${process.env.PUBLIC_URL}/navitars/emberwing.jpg`,
  leafblade: `${process.env.PUBLIC_URL}/navitars/leafblade.webp`,
  shadowmaw: `${process.env.PUBLIC_URL}/navitars/shadowmaw.jpg`,
  luminara: `${process.env.PUBLIC_URL}/navitars/luminara.jpg`,
  quantix: `${process.env.PUBLIC_URL}/navitars/quantix.webp`,
  voltwing: `${process.env.PUBLIC_URL}/navitars/voltwing.webp`,
  spiritmaw: `${process.env.PUBLIC_URL}/navitars/spiritmaw.webp`,
  tidefang: `${process.env.PUBLIC_URL}/navitars/tidefang.webp`,
  // Demo venue fighters (src/data/venues.ts) — the stage used to show
  // them as the element emoji because they had no art. Darius's
  // navitar is the phoenix Ashwing (renamed from Emberfox, the fox).
  frostpup: `${process.env.PUBLIC_URL}/navitars/frostpup.webp`,
  ashwing: `${process.env.PUBLIC_URL}/navitars/ashwing.webp`,
  tidecaller: `${process.env.PUBLIC_URL}/navitars/tidecaller.webp`,
  stonehorn: `${process.env.PUBLIC_URL}/navitars/stonehorn.webp`,
  voltkit: `${process.env.PUBLIC_URL}/navitars/voltkit.webp`,
  wavefang: `${process.env.PUBLIC_URL}/navitars/wavefang.webp`,
  coralight: `${process.env.PUBLIC_URL}/navitars/coralight.webp`,
  leafpaw: `${process.env.PUBLIC_URL}/navitars/leafpaw.webp`,
  starborn: `${process.env.PUBLIC_URL}/navitars/starborn.webp`,
};

export function getNavitarArt(name: string): string | null {
  return NAVITAR_ART[name.trim().toLowerCase()] ?? null;
}

// The resolution order for any navitar's art, everywhere it is shown
// (stage, Profile, map companion): the navitar's own imageUrl first
// (picked at creation, or carried by a venue opponent), then the name
// map above, then the caller falls back to the element emoji. A
// navitar created before the look-picker keeps the old behaviour —
// no imageUrl, so it resolves by name, then emoji.
export function resolveNavitarArt(
  imageUrl: string | null | undefined,
  name: string
): string | null {
  if (imageUrl && imageUrl.trim()) return imageUrl;
  return getNavitarArt(name);
}

// Every look the create dialog offers: the 9 showcase navitars and the
// 9 demo fighters, all with real art. The first entry (Frostbite) is the
// default pick — the dialog has no type input, so the default is fixed.
export interface NavitarLook {
  name: string;
  element: string;
  src: string;
}

export const ALL_NAVITAR_LOOKS: NavitarLook[] = [
  { name: 'Frostbite', element: 'ice', src: NAVITAR_ART.frostbite },
  { name: 'Emberwing', element: 'fire', src: NAVITAR_ART.emberwing },
  { name: 'Leafblade', element: 'nature', src: NAVITAR_ART.leafblade },
  { name: 'Shadowmaw', element: 'shadow', src: NAVITAR_ART.shadowmaw },
  { name: 'Luminara', element: 'light', src: NAVITAR_ART.luminara },
  { name: 'Quantix', element: 'quantum', src: NAVITAR_ART.quantix },
  { name: 'Voltwing', element: 'electric', src: NAVITAR_ART.voltwing },
  { name: 'Spiritmaw', element: 'spiritual', src: NAVITAR_ART.spiritmaw },
  { name: 'Tidefang', element: 'water', src: NAVITAR_ART.tidefang },
  { name: 'Frostpup', element: 'ice', src: NAVITAR_ART.frostpup },
  { name: 'Ashwing', element: 'fire', src: NAVITAR_ART.ashwing },
  { name: 'Tidecaller', element: 'water', src: NAVITAR_ART.tidecaller },
  { name: 'Stonehorn', element: 'nature', src: NAVITAR_ART.stonehorn },
  { name: 'Voltkit', element: 'electric', src: NAVITAR_ART.voltkit },
  { name: 'Wavefang', element: 'water', src: NAVITAR_ART.wavefang },
  { name: 'Coralight', element: 'light', src: NAVITAR_ART.coralight },
  { name: 'Leafpaw', element: 'nature', src: NAVITAR_ART.leafpaw },
  { name: 'Starborn', element: 'light', src: NAVITAR_ART.starborn },
];
