// Venue (bar) state for the walk-in loop: check in at a demo bar, meet a
// person there, optionally battle them. Local-only, no wallet, no backend.
// Check-in and venue wins persist in localStorage (same pattern as the
// user navitar in NavitarFightClub); the pending challenge persists too —
// it hands the Battle page its pre-selected opponent, and an in-memory
// handoff died on any remount/reload between the venue and the arena
// (the 2026-11-12 live check landed on /battle with "No battle yet").
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CHECKED_IN_KEY = 'icewall-checked-in-venue';
const VENUE_WINS_KEY = 'icewall-venue-wins';
const PENDING_CHALLENGE_KEY = 'icewall-pending-challenge';

interface VenueContextType {
  checkedInVenueId: string | null;
  checkIn: (venueId: string) => void;
  checkOut: () => void;
  venueWins: string[];
  recordVenueWin: (venueId: string) => void;
  // Set by the meet card when a demo person accepts a challenge; the
  // Battle page consumes pendingOpponentId to pre-select that opponent.
  // challengeVenueId records where that challenge was issued — it is
  // bookkeeping only. The duel's WORLD and its venue-win credit follow
  // the CHECK-IN state (checkedInVenueId): the field the player is
  // standing in governs every duel, so a stored handoff venue must
  // never outrank it (it kept /battle pinned to a stale venue through
  // check-ins and check-outs alike — live check 2026-11-12).
  pendingOpponentId: string | null;
  challengeVenueId: string | null;
  setPendingChallenge: (opponentId: string, venueId: string) => void;
  consumePendingOpponent: () => void;
  clearChallengeVenue: () => void;
}

const VenueContext = createContext<VenueContextType>({
  checkedInVenueId: null,
  checkIn: () => {},
  checkOut: () => {},
  venueWins: [],
  recordVenueWin: () => {},
  pendingOpponentId: null,
  challengeVenueId: null,
  setPendingChallenge: () => {},
  consumePendingOpponent: () => {},
  clearChallengeVenue: () => {},
});

export const useVenue = () => useContext(VenueContext);

// A pending challenge is a live handoff — the walk from a venue to
// the arena takes seconds, and even a mid-hop page reload is quick.
// Entries older than this are stale (the player wandered off), and a
// stale venue id must never leak into an unrelated later duel (it
// would credit a venue win/perk for a fight that happened elsewhere).
const PENDING_CHALLENGE_TTL_MS = 30 * 60 * 1000;

function loadPendingChallenge(): { opponentId: string | null; venueId: string | null } {
  try {
    const raw = localStorage.getItem(PENDING_CHALLENGE_KEY);
    if (!raw) return { opponentId: null, venueId: null };
    const parsed = JSON.parse(raw) as { opponentId?: unknown; venueId?: unknown; ts?: unknown };
    if (typeof parsed.ts !== 'number' || Date.now() - parsed.ts > PENDING_CHALLENGE_TTL_MS) {
      return { opponentId: null, venueId: null };
    }
    return {
      opponentId: typeof parsed.opponentId === 'string' ? parsed.opponentId : null,
      venueId: typeof parsed.venueId === 'string' ? parsed.venueId : null,
    };
  } catch {
    return { opponentId: null, venueId: null };
  }
}

function savePendingChallenge(opponentId: string | null, venueId: string | null): void {
  try {
    if (opponentId === null && venueId === null) {
      localStorage.removeItem(PENDING_CHALLENGE_KEY);
    } else {
      localStorage.setItem(
        PENDING_CHALLENGE_KEY,
        JSON.stringify({ opponentId, venueId, ts: Date.now() })
      );
    }
  } catch {
    // Private mode / quota: the in-memory handoff still works.
  }
}

function loadStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export const VenueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checkedInVenueId, setCheckedInVenueId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CHECKED_IN_KEY);
    } catch {
      return null;
    }
  });
  const [venueWins, setVenueWins] = useState<string[]>(() => loadStringArray(VENUE_WINS_KEY));
  const [pendingChallenge] = useState(loadPendingChallenge);
  const [pendingOpponentId, setPendingOpponentId] = useState<string | null>(
    pendingChallenge.opponentId
  );
  const [challengeVenueId, setChallengeVenueId] = useState<string | null>(pendingChallenge.venueId);

  useEffect(() => {
    try {
      if (checkedInVenueId) {
        localStorage.setItem(CHECKED_IN_KEY, checkedInVenueId);
      } else {
        localStorage.removeItem(CHECKED_IN_KEY);
      }
    } catch {
      // Private mode / quota: check-in still works for this session.
    }
  }, [checkedInVenueId]);

  useEffect(() => {
    try {
      localStorage.setItem(VENUE_WINS_KEY, JSON.stringify(venueWins));
    } catch {
      // Private mode / quota: wins still work for this session.
    }
  }, [venueWins]);

  const checkIn = useCallback((venueId: string) => {
    setCheckedInVenueId(venueId);
  }, []);

  const checkOut = useCallback(() => {
    setCheckedInVenueId(null);
    // Checking out must end the venue's say over the arena entirely:
    // the pending challenge's stored venue used to survive check-out
    // and keep pinning /battle's world (and venue-win credit) to a
    // place the player had already left (live check 2026-11-12: an old
    // Valley Ember handoff kept every later /battle duel in Fire World
    // after check-out). The opponent half of the handoff stays — it
    // only pre-selects WHO the player faces, never WHERE.
    setChallengeVenueId(null);
    savePendingChallenge(pendingOpponentId, null);
  }, [pendingOpponentId]);

  const recordVenueWin = useCallback((venueId: string) => {
    setVenueWins(prev => (prev.includes(venueId) ? prev : [...prev, venueId]));
  }, []);

  const setPendingChallenge = useCallback((opponentId: string, venueId: string) => {
    setPendingOpponentId(opponentId);
    setChallengeVenueId(venueId);
    savePendingChallenge(opponentId, venueId);
  }, []);

  const consumePendingOpponent = useCallback(() => {
    setPendingOpponentId(null);
    // The venue id survives consumption (it clears when the duel
    // settles), so it stays in storage alongside the spent opponent.
    savePendingChallenge(null, challengeVenueId);
  }, [challengeVenueId]);

  const clearChallengeVenue = useCallback(() => {
    setChallengeVenueId(null);
    savePendingChallenge(pendingOpponentId, null);
  }, [pendingOpponentId]);

  return (
    <VenueContext.Provider
      value={{
        checkedInVenueId,
        checkIn,
        checkOut,
        venueWins,
        recordVenueWin,
        pendingOpponentId,
        challengeVenueId,
        setPendingChallenge,
        consumePendingOpponent,
        clearChallengeVenue,
      }}
    >
      {children}
    </VenueContext.Provider>
  );
};
