// Demo venues for the bar loop: walk into a place that has perks, meet a
// person there, battle them if you choose.
//
// Geogaphy is Eddie's territory — known, recognizable LA places: Hollywood,
// the San Fernando Valley, and local beaches — bars AND parks.
//
// Naming rule (do not break it):
// - BARS get invented, fictional names labelled DEMO. Never attach invented
//   perks to a real bar's name — a real business with a fake offer is the
//   one thing to avoid.
// - PARKS and BEACHES are public places, so recognizable names are fine as
//   demo arenas: Griffith Park and Santa Monica Beach are already used as
//   demo hunt locations in Treasure Quest, so they are consistent with the
//   ecosystem. Their perks are in-game/demo perks, not business offers.
//
// ALL of this is demo data. No real people, no real perk terms. A real
// venue replaces a demo entry (real name, real coords, real perks agreed
// with the bar) when Eddie signs a venue partnership.
//
// LEVEL RULE: the first person at every venue is Lv1, the second is Lv2.
// A fresh Lv1 navitar (105 HP, 9 dmg/round) can only beat a Lv1 opponent
// (105 HP, 9 dmg) — it wins on first strike. A Lv2 opponent (110 HP,
// 11 dmg) is mathematically unwinnable for it, so keep the first person
// Lv1 or the very first duel a player fights is a guaranteed loss. There
// is no levelling mechanism yet, so Lv2 people are harder fights for
// later — a real difficulty curve needs the level-up loop.

export type Element =
  'ice' | 'fire' | 'nature' | 'shadow' | 'light' | 'quantum' | 'electric' | 'spiritual' | 'water';

export type VenueKind = 'bar' | 'park' | 'beach';

export interface VenuePerk {
  text: string;
  // 'checkin' unlocks when the player checks in; 'win' unlocks when the
  // player wins a battle at this venue.
  unlocksOn: 'checkin' | 'win';
}

export interface IcebreakerAnswer {
  label: string;
  reply: string;
}

export interface VenuePerson {
  id: string;
  name: string;
  // One-line vibe/interest, shown on the venue card.
  vibe: string;
  navitarName: string;
  navitarElement: Element;
  navitarLevel: number;
  navitarSkills: string[];
  // The navitar's art, served from public/navitars/ — shown on the
  // venue card, the meet card, and the battle stage when this person
  // is challenged. The stage used to show the element emoji for all
  // of these because they had no art. Optional: the Griffin has no 2D
  // art — its only visual is the 3D model (navitarModelUrl) — so the
  // map cards show the element emoji for it instead.
  navitarImage?: string;
  // The navitar's 3D model GLB, served from public/models/ — shown on
  // the battle stage when this person is challenged. The Griffin and
  // Ashwing have models; the other 8 fighters are 2D art only.
  navitarModelUrl?: string;
  // Closer framing for the 3D model on the stage (1 = default; the
  // phoenix's wide wingspan needs 1.5 to read at a good size).
  navitarModelZoom?: number;
  // Scripted icebreaker — one exchange only, no AI, no chat app.
  icebreakerQuestion: string;
  icebreakerAnswers: IcebreakerAnswer[];
}

export interface DemoVenue {
  id: string;
  name: string;
  kind: VenueKind;
  area: 'Hollywood' | 'San Fernando Valley' | 'Santa Monica';
  tagline: string;
  element: Element;
  lat: number;
  lng: number;
  hours: string;
  perks: VenuePerk[];
  people: VenuePerson[];
}

export const DEMO_VENUES: DemoVenue[] = [
  {
    id: 'venue-marquee',
    name: 'The Neon Marquee',
    kind: 'bar',
    area: 'Hollywood',
    tagline: 'Live music, late nights, cold drinks.',
    element: 'ice',
    lat: 34.101,
    lng: -118.34,
    hours: 'Open 4pm – 2am, live music Fri–Sat',
    perks: [
      { text: '10% off your tab when you check in', unlocksOn: 'checkin' },
      { text: 'Free cover on live-music nights', unlocksOn: 'checkin' },
      { text: 'Free appetizer if you win a battle here', unlocksOn: 'win' },
    ],
    people: [
      {
        id: 'person-maya',
        name: 'Maya',
        vibe: 'Live-music regular — knows every band on the bill',
        navitarName: 'Frostpup',
        navitarElement: 'ice',
        navitarLevel: 1,
        navitarSkills: ['Frost Nip', 'Snow Step'],
        navitarImage: `${process.env.PUBLIC_URL}/navitars/frostpup.webp`,
        icebreakerQuestion: 'First time here, or are you a regular?',
        icebreakerAnswers: [
          {
            label: 'Regular — I never miss a Friday set.',
            reply: 'Then you already know the good seats. Stick around, the second set is better.',
          },
          {
            label: 'First time — show me around?',
            reply: 'Deal. But fair warning, I will absolutely challenge you after the first song.',
          },
          {
            label: 'Just passing through.',
            reply:
              'Passing through Hollywood? Sure. The bar is better than the sidewalk — stay a while.',
          },
        ],
      },
      {
        id: 'person-darius',
        name: 'Darius',
        vibe: 'Trivia-night champ, undefeated two weeks running',
        navitarName: 'Ashwing',
        navitarElement: 'fire',
        navitarLevel: 2,
        navitarSkills: ['Ember Flick', 'Tail Flame'],
        navitarImage: `${process.env.PUBLIC_URL}/navitars/ashwing.webp`,
        navitarModelUrl: `${process.env.PUBLIC_URL}/models/fire-phoenix.glb`,
        navitarModelZoom: 1.5,
        icebreakerQuestion: 'Quick — best trivia category?',
        icebreakerAnswers: [
          {
            label: 'Music',
            reply: 'Correct answer. I once won a whole round on one-hit wonders alone.',
          },
          {
            label: 'Sports',
            reply: 'Bold. I respect it — but I am taking that round from you next Tuesday.',
          },
          {
            label: 'Fighting games',
            reply: 'Now we are talking. Trivia is just the warm-up — the real contest is a battle.',
          },
        ],
      },
      {
        id: 'person-priya',
        name: 'Priya',
        vibe: 'Here for the patio and the people-watching',
        navitarName: 'Tidecaller',
        navitarElement: 'water',
        navitarLevel: 1,
        navitarSkills: ['Salt Spray', 'Calm Current'],
        navitarImage: `${process.env.PUBLIC_URL}/navitars/tidecaller.webp`,
        icebreakerQuestion: 'Patio or inside?',
        icebreakerAnswers: [
          {
            label: 'Patio, every time.',
            reply: 'Same. Best seat in the house is the one with the sunset and the street.',
          },
          {
            label: 'Inside, near the music.',
            reply: 'Fair — the patio is for talkers, inside is for dancers. I do both.',
          },
          {
            label: 'Wherever the battle is.',
            reply: 'Ha! Then the patio it is — more room to dodge. You fight?',
          },
        ],
      },
      {
        // Kai owns the Griffin — the white-blue winged lion from
        // Eddie's art, now a 3D model. Lv2 on purpose: it matches
        // Ashwing, so Griffin-vs-Ashwing fights are on equal footing.
        // Lv2 is still unwinnable for a fresh Lv1 player until a
        // level-up loop exists (known standing gap, not fixed here) —
        // Maya stays the Marquee's first, Lv1 person for that reason.
        // "Kai" is a placeholder demo name, like the other 9 people.
        id: 'person-kai',
        name: 'Kai',
        vibe: 'Cold-brew regular, sketches winged things in a notebook',
        navitarName: 'Griffin',
        navitarElement: 'ice',
        navitarLevel: 2,
        navitarSkills: ['Glacier Rush', 'Wing Gust'],
        // No 2D art for the Griffin — the battle stage shows its 3D
        // model, and the map cards show the ice emoji instead.
        navitarModelUrl: `${process.env.PUBLIC_URL}/models/ice-griffin.glb`,
        icebreakerQuestion: 'What brings you to the cold end of the bar?',
        icebreakerAnswers: [
          {
            label: 'The music — you can hear it best from back here.',
            reply: 'Exactly. The bass hits different when the room is cold. Stay and listen.',
          },
          {
            label: 'I heard a griffin lives here.',
            reply:
              'Ha — then you found the right corner. My Griffin nests behind the bar most nights.',
          },
          {
            label: 'Just the coldest seat in the house.',
            reply:
              'Then you picked wisely. Cold seats, cold drinks — and a battle if you want one.',
          },
        ],
      },
    ],
  },
  {
    id: 'venue-ember',
    name: 'Valley Ember Lounge',
    kind: 'bar',
    area: 'San Fernando Valley',
    tagline: 'Low-key booths, big screens, hot wings.',
    element: 'fire',
    lat: 34.183,
    lng: -118.456,
    hours: 'Open 11am – 1am, game nights Tue + Thu',
    perks: [
      { text: 'Free basket of fries with check-in', unlocksOn: 'checkin' },
      { text: 'Happy-hour prices until 7pm', unlocksOn: 'checkin' },
      { text: "Winner's round — show your win screen", unlocksOn: 'win' },
    ],
    people: [
      {
        id: 'person-marcus',
        name: 'Marcus',
        vibe: 'Wings connoisseur, argues about hot sauce',
        navitarName: 'Stonehorn',
        navitarElement: 'nature',
        navitarLevel: 1,
        navitarSkills: ['Thorn Guard', 'Root Slam'],
        navitarImage: `${process.env.PUBLIC_URL}/navitars/stonehorn.webp`,
        icebreakerQuestion: 'How hot is too hot?',
        icebreakerAnswers: [
          {
            label: 'There is no such thing.',
            reply: 'Finally, someone with sense. The ghost-pepper wings are calling our names.',
          },
          {
            label: 'Medium is my ceiling.',
            reply: 'Respectable. I will order the mild ones and pretend they are hot.',
          },
          {
            label: 'I am here for the fries.',
            reply: 'A person of culture. The fries are the real reason this place exists.',
          },
        ],
      },
      {
        id: 'person-lena',
        name: 'Lena',
        vibe: 'Pool-table shark, plays for bragging rights',
        navitarName: 'Voltkit',
        navitarElement: 'electric',
        navitarLevel: 2,
        navitarSkills: ['Static Pounce', 'Spark Dash'],
        navitarImage: `${process.env.PUBLIC_URL}/navitars/voltkit.webp`,
        icebreakerQuestion: 'Winner stays on the table?',
        icebreakerAnswers: [
          {
            label: 'Winner stays. Loser re-racks.',
            reply: 'House rules, I like it. I have been on this table for three games straight.',
          },
          {
            label: 'I am terrible at pool.',
            reply: 'Even better — I will teach you, and then beat you at a navitar battle instead.',
          },
          {
            label: 'Only if we bet a battle on it.',
            reply: 'Now that is a wager. Pool first, navitars after. Loser buys the fries.',
          },
        ],
      },
    ],
  },
  {
    id: 'venue-santa-monica-beach',
    name: 'Santa Monica Beach',
    kind: 'beach',
    area: 'Santa Monica',
    tagline: 'Ocean air, the pier, open sand — the beach is an arena.',
    element: 'water',
    lat: 34.0105,
    lng: -118.496,
    hours: 'Open all day, sunset hour 5–7pm',
    perks: [
      { text: 'Sunset-hour check-in badge', unlocksOn: 'checkin' },
      { text: 'Free entry to the weekend beach battle meetup', unlocksOn: 'checkin' },
      { text: 'Beach Champion title for the day', unlocksOn: 'win' },
    ],
    people: [
      {
        id: 'person-sam',
        name: 'Sam',
        vibe: 'Surfer, here after the last wave of the day',
        navitarName: 'Wavefang',
        navitarElement: 'water',
        navitarLevel: 1,
        navitarSkills: ['Tidal Bite', 'Salt Surge'],
        navitarImage: `${process.env.PUBLIC_URL}/navitars/wavefang.webp`,
        icebreakerQuestion: 'Sunset session or sunrise?',
        icebreakerAnswers: [
          {
            label: 'Sunset — the light is unreal.',
            reply: 'Exactly. Sunrise is for the keen; sunset is for the ones who stayed.',
          },
          {
            label: 'Sunrise, before the crowds.',
            reply: 'Respect. The water is empty and the air is cold — best waves of the day.',
          },
          {
            label: 'I have never surfed.',
            reply: 'Then your first lesson is a navitar battle. Same balance, less salt water.',
          },
        ],
      },
      {
        id: 'person-jules',
        name: 'Jules',
        vibe: 'Collects beach glass, judges sandcastle contests',
        navitarName: 'Coralight',
        navitarElement: 'light',
        navitarLevel: 2,
        navitarSkills: ['Prism Gleam', 'Reef Glow'],
        navitarImage: `${process.env.PUBLIC_URL}/navitars/coralight.webp`,
        icebreakerQuestion: 'Best thing about the beach at night?',
        icebreakerAnswers: [
          {
            label: 'The quiet, after everyone leaves.',
            reply:
              'Yes — just the waves and the lights on the pier. That is when the good glass turns up.',
          },
          {
            label: 'The pier lights on the water.',
            reply: 'Poetic and correct. I have a jar of glass that proves it.',
          },
          {
            label: 'A battle under the stars?',
            reply: 'You read my mind. The sand is basically an arena with a better view.',
          },
        ],
      },
    ],
  },
  {
    id: 'venue-griffith-park',
    name: 'Griffith Park',
    kind: 'park',
    area: 'Hollywood',
    tagline: 'Trails, the Observatory, and the best view in the city.',
    element: 'nature',
    lat: 34.1184,
    lng: -118.3004,
    hours: 'Open sunrise – 10pm, Observatory shows Fri–Sun',
    perks: [
      { text: 'Trail-head check-in badge', unlocksOn: 'checkin' },
      { text: 'Join the Saturday morning hike crew', unlocksOn: 'checkin' },
      { text: 'Park Champion title for the day', unlocksOn: 'win' },
    ],
    people: [
      {
        id: 'person-ana',
        name: 'Ana',
        vibe: 'Trail runner, knows every path in the park',
        navitarName: 'Leafpaw',
        navitarElement: 'nature',
        navitarLevel: 1,
        navitarSkills: ['Vine Whip', 'Leaf Shield'],
        navitarImage: `${process.env.PUBLIC_URL}/navitars/leafpaw.webp`,
        icebreakerQuestion: 'Best trail for a sunset run?',
        icebreakerAnswers: [
          {
            label: 'The Observatory trail — the view pays for the climb.',
            reply:
              'Exactly. The stairs are brutal but the sunset over the city is worth every step.',
          },
          {
            label: 'Anything flat. My knees have opinions.',
            reply: 'Fair — the fire-road loop is flat and still gorgeous. I will run it with you.',
          },
          {
            label: 'I am more of a bench person.',
            reply:
              'The benches by the Observatory are the best seats in LA. Bring snacks next time.',
          },
        ],
      },
      {
        id: 'person-theo',
        name: 'Theo',
        vibe: 'Astronomer, here for the Observatory nights',
        navitarName: 'Starborn',
        navitarElement: 'light',
        navitarLevel: 2,
        navitarSkills: ['Star Flare', 'Moon Guard'],
        navitarImage: `${process.env.PUBLIC_URL}/navitars/starborn.webp`,
        icebreakerQuestion: 'Have you ever seen the Observatory show?',
        icebreakerAnswers: [
          {
            label: 'Every time I can. The stars are unreal up here.',
            reply: 'Then you know — the city lights below, the stars above. Best free show in LA.',
          },
          {
            label: 'Not yet — take me?',
            reply: 'Deal. Friday night, bring a jacket. After the show we settle it with a battle.',
          },
          {
            label: 'I am more into the view than the stars.',
            reply: 'The view IS the show. Stand right here at dusk and the whole city turns gold.',
          },
        ],
      },
    ],
  },
];
