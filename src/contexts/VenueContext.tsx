// Venue (bar) state for the walk-in loop: check in at a demo bar, meet a
// person there, optionally battle them. Local-only, no wallet, no backend.
// Check-in and venue wins persist in localStorage (same pattern as the
// user navitar in NavitarFightClub); the pending challenge is in-memory
// only — it just hands the Battle page its pre-selected opponent.
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CHECKED_IN_KEY = 'icewall-checked-in-venue';
const VENUE_WINS_KEY = 'icewall-venue-wins';

interface VenueContextType {
  checkedInVenueId: string | null;
  checkIn: (venueId: string) => void;
  checkOut: () => void;
  venueWins: string[];
  recordVenueWin: (venueId: string) => void;
  // Set by the meet card when a demo person accepts a challenge; the
  // Battle page consumes pendingOpponentId to pre-select that opponent.
  // challengeVenueId survives until the battle completes, so a win at
  // that venue unlocks its winner perk.
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
  const [pendingOpponentId, setPendingOpponentId] = useState<string | null>(null);
  const [challengeVenueId, setChallengeVenueId] = useState<string | null>(null);

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
  }, []);

  const recordVenueWin = useCallback((venueId: string) => {
    setVenueWins(prev => (prev.includes(venueId) ? prev : [...prev, venueId]));
  }, []);

  const setPendingChallenge = useCallback((opponentId: string, venueId: string) => {
    setPendingOpponentId(opponentId);
    setChallengeVenueId(venueId);
  }, []);

  const consumePendingOpponent = useCallback(() => {
    setPendingOpponentId(null);
  }, []);

  const clearChallengeVenue = useCallback(() => {
    setChallengeVenueId(null);
  }, []);

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
