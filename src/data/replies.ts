// Scripted reply banks for message threads (src/utils/threads.ts).
//
// Default replies while Live AI is OFF (the default) or whenever a live
// call fails — zero network involved. Each demo person answers in their
// own voice, drawn from their vibe and icebreaker content in
// src/data/venues.ts: Maya talks like Maya, Darius like Darius. The
// navitar banks are per element, so an ice navitar sounds cold and
// steady while a fire one burns bright. Live AI (DeepSeek) replaces
// these banks when the toggle is ON and a key is baked into the build;
// see src/utils/liveAi.ts.
//
// Line counts are deliberately small for v1 (3 per person, 3 per
// element) — enough that a short conversation doesn't repeat itself
// immediately. The picker avoids repeating the last reply in a row.

import type { Element } from './venues';

// One line per person, for the Live AI system prompt: who they are, in
// one breath. Keyed by person id from src/data/venues.ts.
export const PERSON_CHARACTER: Record<string, string> = {
  'person-maya':
    'a live-music regular at The Neon Marquee in Hollywood who knows every band on the bill',
  'person-darius': 'a trivia-night champion at The Neon Marquee, undefeated two weeks running',
  'person-priya': 'here for the patio and the people-watching at The Neon Marquee',
  'person-kai':
    'a cold-brew regular at The Neon Marquee who sketches winged things in a notebook; his navitar is the Griffin',
  'person-marcus': 'a wings connoisseur at Valley Ember Lounge who argues about hot sauce',
  'person-lena': 'a pool-table shark at Valley Ember Lounge who plays for bragging rights',
  'person-sam': 'a surfer at Santa Monica Beach, here after the last wave of the day',
  'person-jules':
    'someone who collects beach glass at Santa Monica Beach and judges sandcastle contests',
  'person-ana': 'a trail runner at Griffith Park who knows every path in the park',
  'person-theo': 'an astronomer at Griffith Park, here for the Observatory nights',
};

// Scripted follow-up lines, keyed by person id. These are what a person
// says after the icebreaker, when the player keeps messaging them.
export const PERSON_REPLIES: Record<string, string[]> = {
  'person-maya': [
    'The second set tonight is going to be unreal — you staying for it?',
    'I have a playlist for exactly this mood. Want it?',
    "If the band plays the old one I'm up front. Come find me.",
  ],
  'person-darius': [
    'Quick trivia: which band had a one-hit wonder called "Video Killed the Radio Star"? No googling.',
    'I never lose at trivia. You can try, but bring your A-game.',
    "Fighting games AND trivia — I'm unbeatable at both, just saying.",
  ],
  'person-priya': [
    "Patio's the best seat in the house — sunset and the street, all at once.",
    'I give every stranger a backstory. That guy over there? Definitely a retired magician.',
    "You fight? The patio's got more room to dodge, that's all I'm saying.",
  ],
  'person-kai': [
    'Griffin sketched something new today. Wings, obviously. Always wings.',
    "Cold brew, notebook, cold end of the bar. That's the whole routine.",
    'You ever sketch? The Griffin only sits still if I am drawing it.',
  ],
  'person-marcus': [
    'Ghost-pepper wings tonight. I will not be talked out of it.',
    'Medium is a fine ceiling. I respect a person who knows their limits.',
    'The fries here are the real reason this place exists. Fight me on that.',
  ],
  'person-lena': [
    "Winner stays on the table. I've been on it three games straight.",
    "I'll teach you pool, then beat you at a navitar battle instead. Fair trade.",
    'Loser buys the fries. House rules.',
  ],
  'person-sam': [
    'Sunset session was unreal today. The water was empty and the light was gold.',
    "First lesson's a navitar battle. Same balance, less salt water.",
    'Sunrise is for the keen; sunset is for the ones who stayed.',
  ],
  'person-jules': [
    'Found a piece of green glass tonight — the good stuff turns up after everyone leaves.',
    'The pier lights on the water. I have a jar that proves it is the best view in LA.',
    'Sandcastle judging is serious business. I do not take bribes. Much.',
  ],
  'person-ana': [
    'The Observatory trail at sunset — the stairs are brutal but the view pays for the climb.',
    'Fire-road loop tomorrow, flat and gorgeous. You in?',
    'Bring snacks next time. The benches by the Observatory are the best seats in LA.',
  ],
  'person-theo': [
    'Observatory show Friday night — bring a jacket, the stars are unreal up here.',
    'City lights below, stars above. Best free show in LA.',
    'After the show we settle it with a battle. The sand is basically an arena with a better view.',
  ],
};

// Navitar replies, per element. Each line is a function of the navitar's
// name, so the same bank serves any navitar of that element. 'generic'
// is the fallback for an unknown element — the old NavitarChat lines.
export const NAVITAR_REPLIES: Record<Element | 'generic', Array<(name: string) => string>> = {
  ice: [
    name => `${name} gives a cool nod. "Steady wins. We stay frosty."`,
    name => `"Cold and ready," ${name} says. "Point me at the next fight."`,
    name => `${name} shivers the air around it, just to show off.`,
  ],
  fire: [
    name => `"Burn bright or go home," ${name} says, embers drifting.`,
    name => `${name} flicks a flame into the air and catches it. "Again?"`,
    name => `"I am always warmed up," ${name} grins. "Say the word."`,
  ],
  nature: [
    name => `${name} rustles, pleased. "The trail is calling. Let's go."`,
    name => `"Roots deep, head high," ${name} says. "That's how we fight."`,
    name => `${name} sprouts a small leaf and offers it to you.`,
  ],
  shadow: [
    name => `${name} melts into the shade, then reappears beside you. "Still here."`,
    name => `"Quiet is a weapon," ${name} murmurs. "Use it."`,
    name => `${name} watches the dark corners, just in case.`,
  ],
  light: [
    name => `${name} glows a little brighter. "Onward. The arena is waiting."`,
    name => `"I shine brightest in a real fight," ${name} says.`,
    name => `${name} hums a bright little note, pleased with itself.`,
  ],
  quantum: [
    name => `${name} flickers — here, there, both at once. "I contain multitudes."`,
    name => `"Every outcome is a door," ${name} says. "Pick the winning one."`,
    name => `${name} tilts its head. "I already fought this conversation. We won."`,
  ],
  electric: [
    name => `${name} crackles with static. "Charged up. Let's move."`,
    name => `"Fast is a kind of strong," ${name} says, sparks dancing.`,
    name => `${name} zaps a pebble for fun. It explodes. ${name} looks innocent.`,
  ],
  spiritual: [
    name => `${name} closes its eyes, calm as still water. "I am with you."`,
    name => `"Every duel teaches something," ${name} says softly. "Listen for it."`,
    name => `${name} bows its head, then looks up, steady and ready.`,
  ],
  water: [
    name => `${name} ripples, pleased. "Go with the flow — then strike."`,
    name => `"Calm on the surface," ${name} says. "Current underneath."`,
    name => `${name} sends a little wave curling around your feet.`,
  ],
  generic: [
    name => `${name} nods, ready for whatever comes next.`,
    name => `${name} grins. "Say the word and we fight."`,
    name => `${name} stretches and looks toward the nearest arena.`,
    name => `"I remember every duel we've won," ${name} says. "Let's win another."`,
    name => `${name} tilts its head, listening.`,
  ],
};

// The navitar thread's opening line, per element — the greeting the
// player sees the first time they open their navitar's thread.
export function navitarGreeting(element: string, name: string): string {
  switch (element) {
    case 'ice':
      return `Hey — it's ${name}. Cold and ready. What are we doing today?`;
    case 'fire':
      return `Hey — it's ${name}. Fired up and ready. What's the plan?`;
    case 'nature':
      return `Hey — it's ${name}. Fresh air, open trails. What are we doing today?`;
    case 'shadow':
      return `Hey — it's ${name}. I was here all along. What's up?`;
    case 'light':
      return `Hey — it's ${name}. Bright and ready. What are we doing today?`;
    case 'quantum':
      return `Hey — it's ${name}. Every version of me says hi. What's the plan?`;
    case 'electric':
      return `Hey — it's ${name}. Charged up and buzzing. What's up?`;
    case 'spiritual':
      return `Hey — it's ${name}. Calm and with you. What do you need?`;
    case 'water':
      return `Hey — it's ${name}. Going with the flow. What's the plan?`;
    default:
      return `Hey — it's ${name}. Ready when you are.`;
  }
}
