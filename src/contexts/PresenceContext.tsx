// Presence state — the player's networking status, visibility scope,
// and business-contact tags (see src/utils/presence.ts), plus the
// navitar icebreaker offers those settings drive.
//
// Mounted INSIDE VenueProvider + the Router (App.tsx): it reads the
// check-in state from VenueContext, the signed-in player from
// AuthContext (settings persist per player id, 'demo' scope when
// signed out), the active navitar from NavitarFightClub, and it
// navigates for the icebreaker card's "Say hi".
//
// Icebreaker offers (scripted — Live AI icebreakers are a separate,
// already-spec'd phase): when the player checks in somewhere an
// 'open', visible, not-yet-met person is standing — or flips their own
// status to 'open' while checked in — their navitar offers that
// person's scripted icebreaker as a notification card. 'battle' and
// 'quiet' statuses suppress the cards entirely, one card shows at a
// time, and a resolved offer ("Not now" / "Say hi") is never
// re-offered the same day (met people are excluded by their
// thread/friend state, resolved ones by the persisted per-day
// dismissal set below — fix wave 1.2).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useNavitarFightClub } from './NavitarFightClub';
import { useVenue } from './VenueContext';
import { DEMO_VENUES, type DemoVenue, type VenuePerson } from '../data/venues';
import { loadFriends } from '../utils/friends';
import { getThread, personThreadId } from '../utils/threads';
import {
  DEMO_PLAYER_SCOPE,
  loadBusinessContacts,
  loadOfferDismissals,
  loadPresenceSettings,
  localDateString,
  matchReasonFor,
  matchTier,
  openerFor,
  personVisibleToPlayer,
  saveBusinessContacts,
  saveOfferDismissals,
  savePresenceSettings,
  type MatchReason,
  type NetworkingStatus,
  type OfferDismissal,
  type VisibilityScope,
} from '../utils/presence';

export interface IcebreakerOffer {
  person: VenuePerson;
  venue: DemoVenue;
  // The strongest match context for this person (null = a plain
  // intro), and the opener line the card shows for it.
  reason: MatchReason | null;
  opener: string;
}

export interface MeetHandoff {
  venueId: string;
  personId: string;
  nonce: number;
}

interface PresenceContextType {
  networkingStatus: NetworkingStatus;
  visibility: VisibilityScope;
  setNetworkingStatus: (status: NetworkingStatus) => void;
  setVisibility: (visibility: VisibilityScope) => void;
  // "I'm here for" match settings (persisted with the rest).
  hereForBusiness: boolean;
  hereForNetworking: boolean;
  hereForDating: boolean;
  setHereForBusiness: (on: boolean) => void;
  setHereForNetworking: (on: boolean) => void;
  setHereForDating: (on: boolean) => void;
  businessName: string;
  businessIndustry: string;
  setBusinessName: (name: string) => void;
  setBusinessIndustry: (industry: string) => void;
  interests: string[];
  toggleInterest: (tag: string) => void;
  getMatchReason: (person: VenuePerson) => MatchReason | null;
  businessContactIds: string[];
  isBusinessContact: (personId: string) => boolean;
  toggleBusinessContact: (personId: string) => void;
  icebreakerOffer: IcebreakerOffer | null;
  sayHiIcebreaker: () => void;
  dismissIcebreaker: () => void;
  meetHandoff: MeetHandoff | null;
  clearMeetHandoff: () => void;
}

const PresenceContext = createContext<PresenceContextType>({
  networkingStatus: 'open',
  visibility: 'venue',
  setNetworkingStatus: () => {},
  setVisibility: () => {},
  hereForBusiness: true,
  hereForNetworking: true,
  hereForDating: false,
  setHereForBusiness: () => {},
  setHereForNetworking: () => {},
  setHereForDating: () => {},
  businessName: '',
  businessIndustry: '',
  setBusinessName: () => {},
  setBusinessIndustry: () => {},
  interests: [],
  toggleInterest: () => {},
  getMatchReason: () => null,
  businessContactIds: [],
  isBusinessContact: () => false,
  toggleBusinessContact: () => {},
  icebreakerOffer: null,
  sayHiIcebreaker: () => {},
  dismissIcebreaker: () => {},
  meetHandoff: null,
  clearMeetHandoff: () => {},
});

export const usePresence = () => useContext(PresenceContext);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { checkedInVenueId } = useVenue();
  const { userNavitar } = useNavitarFightClub();
  const navigate = useNavigate();

  // Settings persist per player: the signed-in id when there is one,
  // the shared demo scope when signed out. When the scope changes
  // (sign-in/out), that scope's stored settings load.
  const scope = user?.id ?? DEMO_PLAYER_SCOPE;
  const [settings, setSettings] = useState(() => loadPresenceSettings(DEMO_PLAYER_SCOPE));
  const [businessContactIds, setBusinessContactIds] = useState<string[]>(() =>
    loadBusinessContacts(DEMO_PLAYER_SCOPE)
  );

  // ---- Navitar icebreaker offer state --------------------------------
  // Declared before the scope-swap effect below: a scope change must be
  // able to retire a live offer (it was computed from the old scope's
  // settings, so it is stale by definition).
  const [icebreakerOffer, setIcebreakerOffer] = useState<IcebreakerOffer | null>(null);
  const offerRef = useRef<IcebreakerOffer | null>(null);
  // People whose card was resolved today (dismissed via Not now, or
  // accepted via Say hi) are not offered again today — persisted per
  // player scope and stamped with the local date, so a reload cannot
  // resurrect a dismissed card (fix wave 1.2) and the navitar may
  // politely re-offer tomorrow. Met people need no entry here — their
  // thread/friend state already excludes them.
  const [dismissedToday, setDismissedToday] = useState<OfferDismissal[]>(() =>
    loadOfferDismissals(DEMO_PLAYER_SCOPE)
  );
  const prevVenueRef = useRef<string | null>(null);
  const prevStatusRef = useRef<NetworkingStatus>(settings.networkingStatus);
  const prevHydratedRef = useRef(false);
  const [meetHandoff, setMeetHandoff] = useState<MeetHandoff | null>(null);

  const clearOffer = useCallback(() => {
    offerRef.current = null;
    setIcebreakerOffer(null);
  }, []);

  const loadedScopeRef = useRef(DEMO_PLAYER_SCOPE);
  // The scope the settings/contacts state on screen was loaded from.
  // It starts at the demo scope (the initial states above load
  // synchronously from it) and follows the swap effect.
  const [settingsScope, setSettingsScope] = useState(DEMO_PLAYER_SCOPE);
  useEffect(() => {
    if (loadedScopeRef.current === scope) return;
    loadedScopeRef.current = scope;
    setSettings(loadPresenceSettings(scope));
    setBusinessContactIds(loadBusinessContacts(scope));
    setDismissedToday(loadOfferDismissals(scope));
    setSettingsScope(scope);
    clearOffer();
  }, [scope, clearOffer]);

  // Stamp a resolved offer with today's local date and persist it
  // (also prunes any expired entries the load filter already dropped).
  const recordDismissal = useCallback(
    (personId: string) => {
      setDismissedToday(prev => {
        const today = localDateString();
        const next = [
          ...prev.filter(d => d.date === today && d.personId !== personId),
          { personId, date: today },
        ];
        saveOfferDismissals(scope, next);
        return next;
      });
    },
    [scope]
  );

  // Hydration: AuthContext restores the Supabase session
  // ASYNCHRONOUSLY, so on first paint the scope still reads 'demo'
  // while a persisted check-in is already back. An offer computed in
  // that window uses the wrong scope's industry/contacts — live bug
  // 2026-11-13: a stale plain-intro card (wrong person, generic copy)
  // fired at load, the scope swap that followed could not retrigger
  // the gated offer effect, and the business match was never offered.
  // Offers therefore wait until auth has settled AND the state on
  // screen belongs to the live scope.
  const hydrated = !authLoading && settingsScope === scope;

  const updateSettings = useCallback(
    (patch: Partial<typeof settings>) => {
      setSettings(prev => {
        const next = { ...prev, ...patch };
        savePresenceSettings(scope, next);
        return next;
      });
    },
    [scope]
  );

  const setNetworkingStatus = useCallback(
    (networkingStatus: NetworkingStatus) => updateSettings({ networkingStatus }),
    [updateSettings]
  );

  const setVisibility = useCallback(
    (visibility: VisibilityScope) => updateSettings({ visibility }),
    [updateSettings]
  );

  const setHereForBusiness = useCallback(
    (hereForBusiness: boolean) => updateSettings({ hereForBusiness }),
    [updateSettings]
  );
  const setHereForNetworking = useCallback(
    (hereForNetworking: boolean) => updateSettings({ hereForNetworking }),
    [updateSettings]
  );
  const setHereForDating = useCallback(
    (hereForDating: boolean) => updateSettings({ hereForDating }),
    [updateSettings]
  );
  const setBusinessName = useCallback(
    (businessName: string) => updateSettings({ businessName }),
    [updateSettings]
  );
  const setBusinessIndustry = useCallback(
    (businessIndustry: string) => updateSettings({ businessIndustry }),
    [updateSettings]
  );
  const toggleInterest = useCallback(
    (tag: string) => {
      setSettings(prev => {
        const next = {
          ...prev,
          interests: prev.interests.includes(tag)
            ? prev.interests.filter(t => t !== tag)
            : [...prev.interests, tag],
        };
        savePresenceSettings(scope, next);
        return next;
      });
    },
    [scope]
  );

  const getMatchReason = useCallback(
    (person: VenuePerson) => matchReasonFor(person, settings),
    [settings]
  );

  const isBusinessContact = useCallback(
    (personId: string) => businessContactIds.includes(personId),
    [businessContactIds]
  );

  const toggleBusinessContact = useCallback(
    (personId: string) => {
      setBusinessContactIds(prev => {
        const next = prev.includes(personId)
          ? prev.filter(id => id !== personId)
          : [...prev, personId];
        saveBusinessContacts(scope, next);
        return next;
      });
    },
    [scope]
  );

  const findCandidate = useCallback((): IcebreakerOffer | null => {
    if (!checkedInVenueId || !userNavitar) return null;
    const venue = DEMO_VENUES.find(v => v.id === checkedInVenueId);
    if (!venue) return null;
    const friendIds = loadFriends();
    const eligible = venue.people.filter(
      p =>
        p.networkingStatus === 'open' &&
        personVisibleToPlayer(p, { businessContactIds, friendIds }) &&
        !friendIds.includes(p.id) &&
        !getThread(personThreadId(p.id)) &&
        !dismissedToday.some(d => d.personId === p.id)
    );
    // Strongest match first (business > shared interest > dating >
    // plain intro); venue order breaks ties, so with no matches at
    // all this is exactly the first eligible person, as before.
    let best: IcebreakerOffer | null = null;
    for (const person of eligible) {
      const reason = matchReasonFor(person, settings);
      const offer: IcebreakerOffer = { person, venue, reason, opener: openerFor(person, reason) };
      if (!best || matchTier(reason) < matchTier(best.reason)) best = offer;
      if (best && matchTier(best.reason) === 0) break;
    }
    return best;
  }, [checkedInVenueId, userNavitar, businessContactIds, settings, dismissedToday]);

  useEffect(() => {
    // Not hydrated yet (see `hydrated` above): do not fire, and do
    // NOT consume the arrival signals — prevVenueRef / prevStatusRef
    // keep their pre-hydration values, so the check-in already on
    // screen still reads as an arrival once the real settings land.
    if (!hydrated) {
      prevHydratedRef.current = false;
      return;
    }
    const venueChanged = checkedInVenueId !== prevVenueRef.current;
    const becameOpen = settings.networkingStatus === 'open' && prevStatusRef.current !== 'open';
    // Hydration completing while checked in is itself an arrival:
    // the first computation with the player's real settings.
    const justHydrated = !prevHydratedRef.current;
    prevHydratedRef.current = true;
    prevVenueRef.current = checkedInVenueId;
    prevStatusRef.current = settings.networkingStatus;

    // Offer-validity guard (fix wave 1.2): a live offer is only valid
    // while the player is checked in at the venue it was computed
    // for. Retire a stale offer here — continuously on every effect
    // run (venue change, status change, hydration landing), not just
    // at fire time — so switching check-in to another venue never
    // leaves the old venue's card on screen; the fresh computation
    // below then offers the new venue's candidate (honoring today's
    // persisted dismissals).
    if (offerRef.current && offerRef.current.venue.id !== checkedInVenueId) {
      clearOffer();
    }

    // Leaving the venue, or going battle/quiet, ends any live offer —
    // battle and quiet suppress the cards entirely.
    if (!checkedInVenueId || settings.networkingStatus !== 'open') {
      if (offerRef.current) clearOffer();
      return;
    }
    // Offers fire on arrival (check-in), on opening up while here,
    // and on hydration landing while here — not on unrelated
    // re-renders. Repeat check-ins re-fire from scratch: dismissal
    // is per person per day (dismissedToday), so the next eligible
    // person at the venue is offered.
    if (!venueChanged && !becameOpen && !justHydrated) return;
    if (offerRef.current) return; // one card at a time, no stacking
    const candidate = findCandidate();
    if (candidate) {
      offerRef.current = candidate;
      setIcebreakerOffer(candidate);
    }
  }, [checkedInVenueId, settings.networkingStatus, findCandidate, clearOffer, hydrated]);

  const dismissIcebreaker = useCallback(() => {
    if (offerRef.current) recordDismissal(offerRef.current.person.id);
    clearOffer();
  }, [clearOffer, recordDismissal]);

  // Say hi hands off to the Realm Map, which opens the person's meet
  // card — from there the intro runs exactly like the existing flow
  // (pick an icebreaker answer → friend + seeded thread).
  const sayHiIcebreaker = useCallback(() => {
    const current = offerRef.current;
    if (!current) return;
    recordDismissal(current.person.id);
    clearOffer();
    setMeetHandoff({
      venueId: current.venue.id,
      personId: current.person.id,
      nonce: Date.now(),
    });
    navigate('/realm');
  }, [clearOffer, navigate, recordDismissal]);

  const clearMeetHandoff = useCallback(() => setMeetHandoff(null), []);

  return (
    <PresenceContext.Provider
      value={{
        networkingStatus: settings.networkingStatus,
        visibility: settings.visibility,
        setNetworkingStatus,
        setVisibility,
        hereForBusiness: settings.hereForBusiness,
        hereForNetworking: settings.hereForNetworking,
        hereForDating: settings.hereForDating,
        setHereForBusiness,
        setHereForNetworking,
        setHereForDating,
        businessName: settings.businessName,
        businessIndustry: settings.businessIndustry,
        setBusinessName,
        setBusinessIndustry,
        interests: settings.interests,
        toggleInterest,
        getMatchReason,
        businessContactIds,
        isBusinessContact,
        toggleBusinessContact,
        icebreakerOffer,
        sayHiIcebreaker,
        dismissIcebreaker,
        meetHandoff,
        clearMeetHandoff,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
};
