// Wild navitars — free-roaming opponents on the Realm Map, not tied to
// a venue or a person. They spawn at random map positions and reshuffle
// every couple of minutes (session-only, never persisted).
//
// Names are NEW — none of them collide with the venue fighters in
// src/data/venues.ts (Frostpup, Ashwing, Tidecaller, Stonehorn, Voltkit,
// Wavefang, Coralight, Leafpaw, Starborn) or the demo opponents, so a
// wild navitar's `wild-<slug>` id can never be mistaken for a venue
// opponent. Art is REUSED, not generated: every imageUrl points at an
// existing file in public/navitars/ (see src/utils/navitarArt.ts).
// Skills reuse the existing move pool from venues.ts — same names, no
// new damage math. The first skill is the fast move (see
// addWildOpponent in NavitarFightClub).
//
// Element spread: 8 of the 9 types. Spiritual has no wild navitar yet —
// the roster is 8, so one type is uncovered by design; add a ninth
// entry here to cover it.

import { Element } from './venues';

export interface WildNavitar {
  name: string;
  element: Element;
  level: number;
  // First skill is the fast move.
  skills: string[];
  imageUrl: string;
}

export const WILD_NAVITARS: WildNavitar[] = [
  {
    name: 'Brisk',
    element: 'ice',
    level: 1,
    skills: ['Frost Nip', 'Snow Step'],
    imageUrl: `${process.env.PUBLIC_URL}/navitars/frostbite.jpg`,
  },
  {
    name: 'Cinderpaw',
    element: 'fire',
    level: 1,
    skills: ['Ember Flick', 'Tail Flame'],
    imageUrl: `${process.env.PUBLIC_URL}/navitars/emberwing.jpg`,
  },
  {
    name: 'Bramble',
    element: 'nature',
    level: 2,
    skills: ['Vine Whip', 'Leaf Shield'],
    imageUrl: `${process.env.PUBLIC_URL}/navitars/leafblade.webp`,
  },
  {
    name: 'Duskmoth',
    element: 'shadow',
    level: 1,
    skills: ['Wing Gust', 'Moon Guard'],
    imageUrl: `${process.env.PUBLIC_URL}/navitars/shadowmaw.jpg`,
  },
  {
    name: 'Glowfin',
    element: 'light',
    level: 1,
    skills: ['Prism Gleam', 'Reef Glow'],
    imageUrl: `${process.env.PUBLIC_URL}/navitars/luminara.jpg`,
  },
  {
    name: 'Quibble',
    element: 'quantum',
    level: 3,
    skills: ['Star Flare', 'Moon Guard'],
    imageUrl: `${process.env.PUBLIC_URL}/navitars/quantix.webp`,
  },
  {
    name: 'Zappit',
    element: 'electric',
    level: 2,
    skills: ['Static Pounce', 'Spark Dash'],
    imageUrl: `${process.env.PUBLIC_URL}/navitars/voltwing.webp`,
  },
  {
    name: 'Ripple',
    element: 'water',
    level: 3,
    skills: ['Salt Spray', 'Tidal Bite'],
    imageUrl: `${process.env.PUBLIC_URL}/navitars/tidefang.webp`,
  },
];
