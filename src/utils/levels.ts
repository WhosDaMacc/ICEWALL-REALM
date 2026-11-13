// Navitar levelling — pure XP / level math plus the localStorage
// helpers for the win streak and daily training. No React here, so the
// duel, Profile and the smoke harness can all share the same numbers.
//
// XP on wins: a win grants 10 x opponent level, multiplied by the win
// streak (see streakMultiplier). Training grants a flat +10 XP per
// session, at most 5 sessions a day. Both count toward the same
// thresholds: total XP needed to BE level n is 100 x 2^(n-2) for n>=2
// (Lv2 = 100, Lv3 = 200, Lv4 = 400, Lv5 = 800); level 1 at 0 XP.

export const STREAK_KEY = 'icewall-win-streak';
export const TRAINING_KEY = 'icewall-training';
export const TRAIN_XP = 10;
export const TRAIN_DAILY_CAP = 5;

// Total XP a navitar needs to BE this level. Level 1 starts at 0 XP.
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 100 * 2 ** (level - 2);
}

// The level a navitar with this much total XP is at.
export function levelForXp(xp: number): number {
  const total = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  let level = 1;
  while (total >= xpForLevel(level + 1)) level += 1;
  return level;
}

export interface XpProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  fraction: number;
}

// Where this much total XP sits inside its current level: how far into
// the level, how much the level spans, and the 0-1 fraction for a bar.
export function xpProgress(xp: number): XpProgress {
  const total = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  const level = levelForXp(total);
  const xpIntoLevel = total - xpForLevel(level);
  const xpForNextLevel = xpForLevel(level + 1) - xpForLevel(level);
  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    fraction: xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 1,
  };
}

// Win-streak multiplier, from the streak AFTER this win: 1st
// consecutive win x1, 2nd x1.25, 3rd x1.5, 4th x1.75, 5th+ x2.
export function streakMultiplier(streak: number): number {
  const s = Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0;
  return Math.min(2, 1 + 0.25 * (s - 1));
}

// XP a win over an opponent of this level grants at this streak
// (streak AFTER the win). Floored, so the banked number is exact.
export function winXp(opponentLevel: number, streak: number): number {
  const level = Number.isFinite(opponentLevel) && opponentLevel > 0 ? opponentLevel : 1;
  return Math.floor(10 * level * streakMultiplier(streak));
}

// --- Win streak (localStorage) ---

export function loadStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

export function saveStreak(streak: number): void {
  try {
    localStorage.setItem(STREAK_KEY, String(Math.max(0, Math.floor(streak) || 0)));
  } catch {
    // Private mode / quota: the streak still holds for this session.
  }
}

// --- Training (localStorage) ---

export interface TrainingState {
  date: string;
  count: number;
}

function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Today's training state. A stored count from another day reads as 0 —
// a new day resets the count without touching the stored record until
// the next session is recorded.
export function loadTraining(): TrainingState {
  const today = localDateString();
  try {
    const raw = localStorage.getItem(TRAINING_KEY);
    if (!raw) return { date: today, count: 0 };
    const parsed = JSON.parse(raw) as Partial<TrainingState>;
    if (parsed.date !== today) return { date: today, count: 0 };
    const count =
      typeof parsed.count === 'number' && Number.isFinite(parsed.count) ? parsed.count : 0;
    return { date: today, count: Math.max(0, Math.floor(count)) };
  } catch {
    return { date: today, count: 0 };
  }
}

export function trainingRemaining(): number {
  return Math.max(0, TRAIN_DAILY_CAP - loadTraining().count);
}

// Records one training session for today. Returns false when the daily
// cap is already reached (nothing is recorded); true when recorded.
export function recordTraining(): boolean {
  const state = loadTraining();
  if (state.count >= TRAIN_DAILY_CAP) return false;
  try {
    localStorage.setItem(
      TRAINING_KEY,
      JSON.stringify({ date: state.date, count: state.count + 1 })
    );
  } catch {
    // Private mode / quota: the session still counts for this session
    // in the caller's state, but the count won't survive a reload.
  }
  return true;
}
