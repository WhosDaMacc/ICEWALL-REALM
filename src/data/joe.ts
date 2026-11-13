/**
 * Joe in the game — the judge, fight announcer, commentator, and final boss.
 *
 * Joe is a character inspired by the assistant: warm, knowledgeable, a little
 * theatrical, and the one judge who knows every fighter. All of his lines are
 * scripted here — no AI generation at runtime.
 *
 * GROUNDING RULE: every type-effectiveness claim in this file must match the
 * chart in src/components/NavitarBattle.tsx. Anything not listed there is a
 * fair fight (x1). The double-damage pairs are: fire->ice, fire->nature,
 * nature->electric, shadow->spiritual, light->shadow, light->quantum,
 * water->fire, electric->water, quantum->shadow, spiritual->quantum.
 * The half-damage pairs are: fire->water, ice->fire, nature->fire,
 * shadow->light, light->quantum, water->electric, electric->nature,
 * quantum->light, spiritual->shadow. Never invent a matchup outside it.
 *
 * Callers replace the `{player}` and `{opponent}` placeholders in announcer
 * lines with the navitars' names before showing them.
 */

export type JoeElement =
  'ice' | 'fire' | 'nature' | 'shadow' | 'light' | 'quantum' | 'electric' | 'spiritual' | 'water';

export type JoeAnnounceEvent =
  | 'fightStart'
  | 'bigHit'
  | 'superEffective'
  | 'resisted'
  | 'lowHp'
  | 'comeback'
  | 'victory'
  | 'defeat'
  | 'ko'
  | 'powerDraught';

export const JOE_ANNOUNCER: Record<JoeAnnounceEvent, string[]> = {
  fightStart: [
    "And the fight is ON — I've seen this matchup before, and it never disappoints.",
    'Two navitars, one stage, and me with the best seat in the house. Let us begin.',
    'Welcome, welcome! {player} steps in against {opponent} — and I already know how this one turns.',
  ],
  bigHit: [
    'Oh, that one landed. The whole arena felt it.',
    'A clean, heavy hit — {player} is not here to play games.',
    'Did you see that? That is the kind of strike people talk about for weeks.',
  ],
  superEffective: [
    'Super effective! That is the type chart doing its work — beautiful to watch.',
    'There it is — the weakness found, and found hard. Textbook, {player}.',
    'That hit did double duty. Know your matchups, and the fight bends your way.',
    'A super-effective strike! I have called a thousand fights and that one still sings.',
  ],
  resisted: [
    'Resisted — that one barely scratched the surface. Wrong tool for the job.',
    'Half damage. {opponent} just shrugged that off like a spring breeze.',
    'Ouch, in the wrong direction. Whoever picked that matchup owes {player} an apology.',
  ],
  lowHp: [
    'Down to the last breath of health — but I have seen fights turn on less than this.',
    '{player} is running on fumes, and that is exactly when the great ones show up.',
    'Low health, high stakes. This is the moment the crowd will remember.',
  ],
  comeback: [
    'From the edge of defeat to the roar of the crowd — what a comeback!',
    'I told you. Never count a fighter out while they are still standing.',
    'That is why we watch. {player} was nearly done, and now look at them.',
  ],
  victory: [
    'And the winner is {player}! A fight worthy of the Ice Wall itself.',
    'Victory! {player} takes it — and I have the honour of saying I saw it happen.',
    'The crowd is on its feet, and so am I. {player}, you earned every bit of this.',
  ],
  defeat: [
    'Defeat for {player} — but a fighter is measured by what they learn from a loss.',
    '{opponent} takes the round, and I will be honest: the better matchup won today.',
    'It ends here for {player}. Hold your head up — the Ice Wall remembers the brave.',
  ],
  ko: [
    'Knockout! One final blow and the stage goes silent — then erupts.',
    'It is over. A clean knockout, and {player} leaves no doubt at all.',
  ],
  powerDraught: [
    'A power draught! {player} drinks deep — watch what happens next.',
    'The draught glows, the crowd gasps, and {player} just got a whole lot more dangerous.',
    'Power draught taken. I have seen this swing fights in a single heartbeat.',
  ],
};

/**
 * Pick a line for an event, avoiding an immediate repeat of `lastLine`
 * when the event has more than one line to choose from.
 */
export function pickJoeLine(event: JoeAnnounceEvent, lastLine?: string): string {
  const lines = JOE_ANNOUNCER[event];
  if (lines.length <= 1) return lines[0];
  const pool = lastLine ? lines.filter(line => line !== lastLine) : lines;
  const choices = pool.length > 0 ? pool : lines;
  return choices[Math.floor(Math.random() * choices.length)];
}

export interface DuelVerdictFacts {
  outcome: 'victory' | 'defeat';
  superEffectiveHit: boolean;
  opponentSuperEffectiveHit: boolean;
  wasLowHp: boolean;
  hpLeftFraction: number;
  rounds: number;
}

function pickVariant(variants: string[]): string {
  return variants[Math.floor(Math.random() * variants.length)];
}

/**
 * Joe's verdict on a duel of answers, naming the turning point the facts
 * support. Every teaching tip names a real pair from the type chart.
 */
export function joeVerdict(facts: DuelVerdictFacts): string {
  if (facts.outcome === 'victory') {
    if (facts.superEffectiveHit) {
      return pickVariant([
        'You found the weakness and you did not let go — that super-effective answer was the moment the duel turned, and from there it was yours.',
        'One super-effective strike decided this duel. You read the type chart like a veteran, and the scoreboard shows it.',
        'That super-effective hit was the turning point. Know your matchups and the fight bends your way — you proved it.',
      ]);
    }
    if (facts.wasLowHp) {
      return pickVariant([
        'You were on the ropes and you came back anyway. That is not luck — that is a fighter who refuses to fall.',
        'A comeback for the ages. You were nearly out, and you answered your way back to the win. I have seen a thousand duels; that one stays with me.',
        'Down low, never out. You clawed this one back round by round, and that is the mark of a true champion of the Ice Wall.',
      ]);
    }
    if (facts.hpLeftFraction >= 0.7) {
      return pickVariant([
        `A dominant win — ${facts.rounds} rounds and you barely took a scratch. That is what mastery looks like.`,
        'Total control from the first answer to the last. You did not just win, you made it look easy — and I do not say that lightly.',
        'A commanding victory with plenty left in the tank. The rest of the Ice Wall should be watching you closely.',
      ]);
    }
    return pickVariant([
      'A hard-fought win, earned answer by answer. You held your nerve when it mattered — that counts for everything.',
      'You took the duel the honest way: steady, sharp, and better when it counted. Well fought.',
    ]);
  }

  if (facts.opponentSuperEffectiveHit) {
    return pickVariant([
      'Your opponent found your weakness and pressed it — that super-effective hit was the duel. Remember: fire melts ice, so never send an ice navitar up against fire without a plan.',
      'The turning point was their super-effective strike. Study the chart: water drowns fire, and a fire navitar against water is a fight already lost.',
      'You lost to a matchup, not to a better fighter. Light burns shadow for double damage — learn the pairings, and that loss turns into your next win.',
    ]);
  }
  if (facts.wasLowHp) {
    return pickVariant([
      'A close loss — you were nearly gone and still nearly won it. One more right answer and this verdict reads the other way.',
      'You fought back from the edge and came within a breath of taking it. That is not defeat, that is a warning to everyone you face next.',
    ]);
  }
  return pickVariant([
    'A close one, and closer than the score makes it look. Keep your head up — the next duel is yours to take.',
    'It slipped away at the end, but you were in it the whole way. Learn the chart, trust your instincts, and come back for the rematch.',
  ]);
}

// The one title Joe awards — for WINNING the Joe fight (the boss duel
// against the demo opponent "Joe the Impossible Challenger"). The old
// quiz draw title went away with the quiz itself (Eddie, 2026-11-12:
// "There should be no quiz, scrap the quiz. I just wanted to fight.").
export const JOE_TITLES = {
  win: {
    id: 'joes-champion',
    name: "Joe's Champion",
    blurb:
      'You beat the Impossible Challenger in a real fight — and I do not hand this title out twice.',
  },
};

export const JOE_INTRO: string[] = [
  "I'm Joe — judge, announcer, and the last door in this arena. They call me the Impossible Challenger, and I have earned the name.",
  'No questions, no quiz — you want my title, you take it the honest way: in a fight. My navitar against yours, winner takes the crown.',
  "Bring your strongest and come hungry. Nobody has beaten me yet — be the first, and the title of Joe's Champion is yours.",
];
