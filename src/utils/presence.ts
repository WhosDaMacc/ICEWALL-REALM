// Presence — the player's networking status + visibility scope, and
// the rules that decide who appears in a venue's Who's Here list.
//
// Two settings (Eddie, 2026-11-12/13; spec §§1–5 of
// app-requirements-presence-and-venue-promotions.md):
// - networkingStatus: how open the player is to meeting people.
// - visibility: who can see the player at a venue.
//
// The same two axes exist on every demo person (see VenuePerson in
// src/data/venues.ts), so the player's settings and the people's
// settings share one vocabulary: personVisibleToPlayer applies a
// person's visibility from the player's point of view.
//
// Persistence: localStorage, keyed to the signed-in player's id when
// there is one (PresenceContext passes the Supabase user id), falling
// back to the shared 'demo' scope for signed-out play — the same
// local-first pattern as friends/threads.

import type { PersonNetworkingStatus, PersonVisibility, VenuePerson } from '../data/venues';

export type NetworkingStatus = PersonNetworkingStatus;
export type VisibilityScope = PersonVisibility;

export const DEMO_PLAYER_SCOPE = 'demo';

export const STATUS_ORDER: NetworkingStatus[] = ['open', 'battle', 'quiet'];
export const VISIBILITY_ORDER: VisibilityScope[] = ['venue', 'friends', 'business', 'invisible'];

export const STATUS_META: Record<
  NetworkingStatus,
  { label: string; description: string; dot: string }
> = {
  open: {
    label: 'Open to meet',
    description:
      'People here can break the ice with you — and your navitar may bring you an icebreaker when someone new is around.',
    dot: '#4caf50',
  },
  battle: {
    label: 'Battle only',
    description: 'No new intros — you are here to battle. Challenges work exactly as usual.',
    dot: '#ffb300',
  },
  quiet: {
    label: 'Quiet — no new intros',
    description:
      'Nobody can start an intro with you, and your navitar will not bring you icebreakers.',
    dot: '#9e9e9e',
  },
};

export const VISIBILITY_META: Record<VisibilityScope, { label: string; description: string }> = {
  venue: {
    label: 'Everyone here',
    description: 'Anyone checked in at the same venue can see you in Who’s Here.',
  },
  friends: {
    label: 'Friends only',
    description: 'Only your friends can see you at venues.',
  },
  business: {
    label: 'Business contacts only',
    description: 'Only people you have tagged as business contacts can see you at venues.',
  },
  invisible: {
    label: 'Invisible',
    description:
      'Nobody sees you here. You can still look around, message friends, and battle people you challenge.',
  },
};

// Match contexts (Eddie, 2026-11-13): people are matched on WHY they
// are here. The player's industry is picked from these categories
// (a demo person's industry matches on exact category), and interests
// from these tags.
export const INDUSTRY_OPTIONS: string[] = [
  'Food & Drink',
  'Music & Nightlife',
  'Media & Content',
  'Art & Design',
  'Retail & Fashion',
  'Fitness & Outdoors',
  'Tech & Startups',
  'Health & Wellness',
];

export const INTEREST_TAGS: string[] = [
  'Live music',
  'Photography',
  'Surfing',
  'Hiking',
  'Gaming',
  'Coffee',
  'Trivia',
  'Startups',
  'Fitness',
  'Art',
  'Fashion',
  'Foodie',
];

export interface PresenceSettings {
  networkingStatus: NetworkingStatus;
  visibility: VisibilityScope;
  // "I'm here for" — which match types the player gets at all.
  // Business + Networking default ON; Dating is opt-in only and
  // defaults OFF, never on.
  hereForBusiness: boolean;
  hereForNetworking: boolean;
  hereForDating: boolean;
  // The player's own business, for Business matches.
  businessName: string;
  businessIndustry: string;
  // The player's picked interest tags, for Shared-interest matches.
  interests: string[];
}

export const DEFAULT_PRESENCE_SETTINGS: PresenceSettings = {
  networkingStatus: 'open',
  visibility: 'venue',
  hereForBusiness: true,
  hereForNetworking: true,
  hereForDating: false,
  businessName: '',
  businessIndustry: '',
  interests: [],
};

// Darius is the demo's business-visibility person: he is pre-tagged as
// the player's business contact so his Who's Here row (with its
// "Business contact" chip) is visible out of the box, and untagging
// him on Profile demonstrates the rule by hiding him again.
export const DEFAULT_BUSINESS_CONTACT_IDS: string[] = ['person-darius'];

export const presenceSettingsKey = (scope: string): string => `icewall-presence:${scope}`;
export const businessContactsKey = (scope: string): string => `icewall-business-contacts:${scope}`;
export const presenceDismissalsKey = (scope: string): string =>
  `icewall-presence-dismissals:${scope}`;

// A navitar icebreaker offer the player resolved ("Not now", or
// "Say hi") is not offered again THAT DAY: dismissals persist per
// player, stamped with the local calendar date, and expire at local
// midnight — the navitar may politely re-offer tomorrow, never again
// today. (Fix wave 1.2: this used to be a session-only set, so a
// reload resurrected the dismissed card.)
export interface OfferDismissal {
  personId: string;
  // Local calendar date (YYYY-MM-DD) the offer was resolved.
  date: string;
}

// Local YYYY-MM-DD — built from local date parts (not UTC) so the
// expiry lines up with the player's own midnight.
export function localDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Only today's dismissals load — anything stamped with an earlier
// date has expired and is dropped (and overwritten on the next save).
export function loadOfferDismissals(
  scope: string,
  today: string = localDateString()
): OfferDismissal[] {
  try {
    const raw = localStorage.getItem(presenceDismissalsKey(scope));
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is OfferDismissal =>
        !!v &&
        typeof v === 'object' &&
        typeof (v as OfferDismissal).personId === 'string' &&
        (v as OfferDismissal).date === today
    );
  } catch {
    return [];
  }
}

export function saveOfferDismissals(scope: string, dismissals: OfferDismissal[]): void {
  try {
    localStorage.setItem(presenceDismissalsKey(scope), JSON.stringify(dismissals));
  } catch {
    // Private mode / quota: the dismissal still holds for this session.
  }
}

function isStatus(v: unknown): v is NetworkingStatus {
  return v === 'open' || v === 'battle' || v === 'quiet';
}

function isVisibility(v: unknown): v is VisibilityScope {
  return v === 'venue' || v === 'friends' || v === 'business' || v === 'invisible';
}

export function loadPresenceSettings(scope: string): PresenceSettings {
  try {
    const raw = localStorage.getItem(presenceSettingsKey(scope));
    if (!raw) return { ...DEFAULT_PRESENCE_SETTINGS, interests: [] };
    const parsed = JSON.parse(raw) as Partial<PresenceSettings>;
    return {
      networkingStatus: isStatus(parsed.networkingStatus)
        ? parsed.networkingStatus
        : DEFAULT_PRESENCE_SETTINGS.networkingStatus,
      visibility: isVisibility(parsed.visibility)
        ? parsed.visibility
        : DEFAULT_PRESENCE_SETTINGS.visibility,
      // Booleans load strictly: only a stored `true` turns a toggle
      // on, so a missing/corrupt dating flag can never read as opted
      // in. Business/networking default on when absent.
      hereForBusiness: parsed.hereForBusiness !== false,
      hereForNetworking: parsed.hereForNetworking !== false,
      hereForDating: parsed.hereForDating === true,
      businessName: typeof parsed.businessName === 'string' ? parsed.businessName : '',
      businessIndustry:
        typeof parsed.businessIndustry === 'string' &&
        INDUSTRY_OPTIONS.includes(parsed.businessIndustry)
          ? parsed.businessIndustry
          : '',
      interests: Array.isArray(parsed.interests)
        ? parsed.interests.filter(
            (v): v is string => typeof v === 'string' && INTEREST_TAGS.includes(v)
          )
        : [],
    };
  } catch {
    return { ...DEFAULT_PRESENCE_SETTINGS, interests: [] };
  }
}

export function savePresenceSettings(scope: string, settings: PresenceSettings): void {
  try {
    localStorage.setItem(presenceSettingsKey(scope), JSON.stringify(settings));
  } catch {
    // Private mode / quota: the settings still hold for this session.
  }
}

// A missing key means "never touched" — the demo pre-tag applies.
// Once the player toggles any tag, the stored list is the truth
// (an empty stored list hides every business-visibility person).
export function loadBusinessContacts(scope: string): string[] {
  try {
    const raw = localStorage.getItem(businessContactsKey(scope));
    if (raw === null) return [...DEFAULT_BUSINESS_CONTACT_IDS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [...DEFAULT_BUSINESS_CONTACT_IDS];
  }
}

export function saveBusinessContacts(scope: string, ids: string[]): void {
  try {
    localStorage.setItem(businessContactsKey(scope), JSON.stringify(ids));
  } catch {
    // Private mode / quota: the tags still hold for this session.
  }
}

// Who's Here filtering, from the player's perspective:
// - 'invisible' people never appear.
// - 'business' people appear only when the player tagged them as a
//   business contact.
// - 'friends' people appear only once they are the player's friend
//   (met) — no demo person ships with this scope, the rule is here so
//   the scope means the same thing on both sides.
// - 'venue' people appear for everyone checked in here.
export function personVisibleToPlayer(
  person: VenuePerson,
  opts: { businessContactIds: string[]; friendIds: string[] }
): boolean {
  switch (person.visibility) {
    case 'invisible':
      return false;
    case 'business':
      return opts.businessContactIds.includes(person.id);
    case 'friends':
      return opts.friendIds.includes(person.id);
    default:
      return true;
  }
}

// ---- Match contexts ---------------------------------------------------
// The strongest reason to prompt a conversation with a person, in
// Eddie's priority order: Business > Shared interest > Dating. One
// reason per person — the Who's Here chip and the navitar card both
// read it from here, so they can never disagree.
//
// Dating is MUTUAL-ONLY and quiet-proof: it exists only when the
// player opted in AND the person opted in, and never for a quiet
// person (a quiet person's business/interest chips may still show —
// their intro stays blocked — but their dating intent is never
// surfaced to anyone).
export type MatchKind = 'business' | 'interest' | 'dating';

export interface MatchReason {
  kind: MatchKind;
  // Chip label, e.g. "Business match — Food & Drink".
  label: string;
  // The card's reason line, e.g. "Darius (Ember Wing Sauce Co.) —
  // you're both in Food & Drink."
  detail: string;
}

const MATCH_TIER: Record<MatchKind, number> = { business: 0, interest: 1, dating: 2 };

export function matchReasonFor(
  person: VenuePerson,
  settings: PresenceSettings
): MatchReason | null {
  if (
    settings.hereForBusiness &&
    settings.businessIndustry !== '' &&
    person.industry === settings.businessIndustry
  ) {
    const industry = settings.businessIndustry;
    return {
      kind: 'business',
      label: `Business match — ${industry}`,
      detail: person.businessName
        ? `${person.name} (${person.businessName}) — you’re both in ${industry}.`
        : `${person.name} — you’re both in ${industry}.`,
    };
  }
  if (settings.hereForNetworking && settings.interests.length > 0) {
    const shared = person.interests.find(tag => settings.interests.includes(tag));
    if (shared) {
      return {
        kind: 'interest',
        label: `Shared interest — ${shared}`,
        detail: `You and ${person.name} both picked ${shared}.`,
      };
    }
  }
  if (
    settings.hereForDating &&
    person.openToDating === true &&
    person.networkingStatus !== 'quiet'
  ) {
    return {
      kind: 'dating',
      label: 'Also here for dating',
      detail: `${person.name} is also open to dating intros — you’re both opted in.`,
    };
  }
  return null;
}

// Lower tier = stronger card candidate (business matches are offered
// before shared interests, before dating, before a plain intro).
export function matchTier(reason: MatchReason | null): number {
  return reason ? MATCH_TIER[reason.kind] : 3;
}

// The card's opener line for a matched person: the person's scripted
// business opener for business matches (template fallback), a friendly
// neutral line for dating (nothing cheesy or presumptuous), and the
// person's regular icebreaker question otherwise.
export function openerFor(person: VenuePerson, reason: MatchReason | null): string {
  if (reason?.kind === 'business') {
    return (
      person.businessOpener ??
      `Ask ${person.name} about their work — you’re both in ${person.industry ?? 'the same industry'}.`
    );
  }
  if (reason?.kind === 'dating') {
    return `${person.name} is open to meeting someone here. Say hello like you would to anyone new — no pressure, just a conversation.`;
  }
  return person.icebreakerQuestion;
}
