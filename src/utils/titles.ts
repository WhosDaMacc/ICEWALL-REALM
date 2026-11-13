// Titles — the player's earned titles, persisted in localStorage.
// Titles are local-only: they live in this browser, and winning the
// Joe boss fight in the Battle Arena is the only way to earn one so
// far. The interface below is the contract for Profile (which lists
// them) and NavitarBattle (which awards them) — do not change the
// signatures.

export interface EarnedTitle {
  id: string;
  name: string;
  blurb: string;
  earnedAt: string;
}

const TITLES_KEY = 'icewall-titles';

function sanitizeTitles(raw: unknown): EarnedTitle[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is EarnedTitle =>
        !!t &&
        typeof t === 'object' &&
        typeof (t as EarnedTitle).id === 'string' &&
        typeof (t as EarnedTitle).name === 'string' &&
        typeof (t as EarnedTitle).blurb === 'string' &&
        typeof (t as EarnedTitle).earnedAt === 'string'
    )
    .map(t => ({ id: t.id, name: t.name, blurb: t.blurb, earnedAt: t.earnedAt }));
}

export function loadTitles(): EarnedTitle[] {
  try {
    const raw = localStorage.getItem(TITLES_KEY);
    if (!raw) return [];
    return sanitizeTitles(JSON.parse(raw));
  } catch {
    // Missing or corrupt — never throws, just no titles yet.
    return [];
  }
}

function persist(titles: EarnedTitle[]): void {
  try {
    localStorage.setItem(TITLES_KEY, JSON.stringify(titles));
  } catch {
    // Private mode / quota: the titles still hold for this session.
  }
}

// Awards a title if the player does not already own it. Returns true
// when the title was newly earned, false when it was already owned.
export function earnTitle(t: { id: string; name: string; blurb: string }): boolean {
  const titles = loadTitles();
  if (titles.some(owned => owned.id === t.id)) return false;
  titles.push({ ...t, earnedAt: new Date().toISOString() });
  persist(titles);
  return true;
}

export function hasTitle(id: string): boolean {
  return loadTitles().some(t => t.id === id);
}
