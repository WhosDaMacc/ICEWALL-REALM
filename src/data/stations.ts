// Refill stations — where the player collects potions on the Realm Map.
// Collecting grants a random mix of potions, then the station goes on a
// 5-minute cooldown (see src/pages/RealmMap.tsx).
//
// Naming rule (same as venues.ts — do not break it): fictional DEMO
// names only. Never a real business, never invented perks at a real
// named place. These are a spring, a kiosk and a fountain — invented
// names, labelled DEMO in the UI. Positions are spread across the LA
// map area and kept clear of the 4 demo venues and the 2 portals:
// venues — Marquee 34.101,-118.34; Ember 34.183,-118.456; Santa Monica
// Beach 34.0105,-118.496; Griffith Park 34.1184,-118.3004; portals —
// Frost Gate 34.055,-118.295; Blaze Gate 34.235,-118.415.

export interface RefillStation {
  id: string;
  name: string;
  blurb: string;
  lat: number;
  lng: number;
  kind?: string;
}

export const REFILL_STATIONS: RefillStation[] = [
  {
    id: 'station-echo-spring',
    name: 'Echo Spring',
    blurb: 'A quiet spring tucked behind the boulevard. The water tastes like static and snowmelt.',
    lat: 34.045,
    lng: -118.38,
    kind: 'spring',
  },
  {
    id: 'station-neon-kiosk',
    name: 'Neon Kiosk',
    blurb:
      'A glowing kiosk on the Valley corner. The vendor stocks potions next to the phone chargers.',
    lat: 34.15,
    lng: -118.42,
    kind: 'kiosk',
  },
  {
    id: 'station-marble-fountain',
    name: 'Marble Fountain',
    blurb: 'An old marble fountain in the plaza. Toss in a coin, fish out a potion.',
    lat: 34.08,
    lng: -118.3,
    kind: 'fountain',
  },
  {
    id: 'station-tidepool-kiosk',
    name: 'Tidepool Kiosk',
    blurb: 'A beach kiosk by the tidepools. Salt air, cold drinks, and potions in the cooler.',
    lat: 34.03,
    lng: -118.47,
    kind: 'kiosk',
  },
];
