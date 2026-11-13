// Potion inventory — the player's potion stash, persisted in
// localStorage. Potions are collected at refill stations on the Realm
// Map (see src/pages/RealmMap.tsx) and spent in duels by the second
// builder (NavitarBattle imports this module — the interface below is
// its contract, do not change the signatures).

export type PotionId = 'health' | 'recharge' | 'power';

export interface PotionCounts {
  health: number;
  recharge: number;
  power: number;
}

export const POTIONS: Record<PotionId, { name: string; emoji: string; blurb: string }> = {
  health: { name: 'Health Potion', emoji: '🧪', blurb: 'Restores 30 HP in a duel' },
  recharge: { name: 'Recharge', emoji: '⚡', blurb: 'Restores 50 energy in a duel' },
  power: { name: 'Power Draught', emoji: '🔥', blurb: '+5 damage for your next duel (one fight)' },
};

const POTIONS_KEY = 'icewall-potions';
const POWER_BOOST_KEY = 'icewall-power-boost';

function emptyCounts(): PotionCounts {
  return { health: 0, recharge: 0, power: 0 };
}

function sanitizeCounts(raw: unknown): PotionCounts {
  const counts = emptyCounts();
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    (Object.keys(counts) as PotionId[]).forEach(id => {
      const v = obj[id];
      counts[id] = typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
    });
  }
  return counts;
}

export function getPotions(): PotionCounts {
  try {
    const raw = localStorage.getItem(POTIONS_KEY);
    if (!raw) return emptyCounts();
    return sanitizeCounts(JSON.parse(raw));
  } catch {
    // Missing or corrupt — never throws, just an empty stash.
    return emptyCounts();
  }
}

function persist(counts: PotionCounts): void {
  try {
    localStorage.setItem(POTIONS_KEY, JSON.stringify(counts));
  } catch {
    // Private mode / quota: the counts still hold for this session.
  }
}

export function grantPotions(g: Partial<PotionCounts>): PotionCounts {
  const counts = getPotions();
  (Object.keys(counts) as PotionId[]).forEach(id => {
    const add = g[id];
    if (typeof add === 'number' && Number.isFinite(add) && add > 0) {
      counts[id] += Math.floor(add);
    }
  });
  persist(counts);
  return counts;
}

export function usePotion(id: PotionId): boolean {
  const counts = getPotions();
  if (counts[id] <= 0) return false;
  counts[id] -= 1;
  persist(counts);
  return true;
}

// Power-boost arming: a Power Draught is spent ("armed") before a duel
// and consumed by the duel exactly once. The flag is a boolean in
// localStorage so it survives a reload between arming and fighting.
export function armPowerBoost(): boolean {
  const counts = getPotions();
  if (counts.power <= 0) return false;
  counts.power -= 1;
  persist(counts);
  try {
    localStorage.setItem(POWER_BOOST_KEY, 'true');
  } catch {
    // Private mode / quota: the flag still holds for this session.
  }
  return true;
}

export function consumePowerBoost(): boolean {
  let armed = false;
  try {
    armed = localStorage.getItem(POWER_BOOST_KEY) === 'true';
  } catch {
    armed = false;
  }
  if (!armed) return false;
  try {
    localStorage.removeItem(POWER_BOOST_KEY);
  } catch {
    // Flag already read; treat as consumed.
  }
  return true;
}

export function isPowerBoostArmed(): boolean {
  try {
    return localStorage.getItem(POWER_BOOST_KEY) === 'true';
  } catch {
    return false;
  }
}
