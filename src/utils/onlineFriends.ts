// Real-friends helpers for the multiplayer (Phase 1) features: profile
// lookup, friend requests, challenges, and starting a duel against a
// remote friend's navitar. Everything here fails gracefully — callers
// show a short inline error line, never a crash — when a table is
// missing or the network is down.
import {
  supabase,
  type ChallengeRow,
  type FriendRow,
  type NavitarElement,
  type NavitarSnapshot,
  type ProfileRow,
} from './supabaseClient';

export type { ChallengeRow, FriendRow, NavitarSnapshot, ProfileRow };

// Build the stored snapshot from a local navitar (the fight-club user
// navitar shape). Only the display fields — hp / fastMove are derived
// from level at duel time, never stored.
export function navitarSnapshot(navitar: {
  name: string;
  element: NavitarElement;
  level: number;
  skills: string[];
  imageUrl?: string;
  modelUrl?: string;
  modelZoom?: number;
}): NavitarSnapshot {
  return {
    name: navitar.name,
    element: navitar.element,
    level: navitar.level,
    skills: navitar.skills,
    imageUrl: navitar.imageUrl,
    modelUrl: navitar.modelUrl,
    modelZoom: navitar.modelZoom,
  };
}

// Save (insert or update) a player's profile row: display name plus the
// current navitar snapshot, or null when they have no navitar yet. The
// landing funnel calls this when a signed-in player saves their profile
// or picks a navitar; Profile.tsx keeps its own inline upsert. Throws
// on error — callers show a short inline line, never a crash — so a
// missing profiles table fails gracefully.
export async function upsertProfile(
  userId: string,
  displayName: string,
  snapshot: NavitarSnapshot | null
): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: displayName.trim() || null,
    navitar_name: snapshot?.name ?? null,
    navitar: snapshot,
  });
  if (error) throw error;
}

// Look up profiles by display name (case-insensitive substring), for the
// add-by-name flow. Never returns the caller themselves.
export async function searchProfilesByName(
  query: string,
  excludeUserId: string
): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, navitar_name, navitar, created_at')
    .ilike('display_name', `%${query}%`)
    .neq('id', excludeUserId)
    .limit(5);
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

// Fetch profile rows for a list of user ids (one round trip). Empty in,
// empty out — no query is sent for an empty list.
export async function fetchProfilesByIds(ids: string[]): Promise<ProfileRow[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, navitar_name, navitar, created_at')
    .in('id', unique);
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

// A friend row plus the OTHER side's profile (the person this row is
// about, from the caller's point of view).
export interface FriendEntry {
  row: FriendRow;
  otherId: string;
  profile: ProfileRow | null;
}

// A challenge row plus the OTHER side's profile.
export interface ChallengeEntry {
  row: ChallengeRow;
  otherId: string;
  profile: ProfileRow | null;
}

function attachProfiles<T>(
  rows: T[],
  profiles: ProfileRow[],
  otherOf: (row: T) => string
): { row: T; otherId: string; profile: ProfileRow | null }[] {
  const byId = new Map(profiles.map(p => [p.id, p]));
  return rows.map(row => {
    const otherId = otherOf(row);
    return { row, otherId, profile: byId.get(otherId) ?? null };
  });
}

// Incoming friend requests: rows where I am the friend and the request
// is still pending.
export async function fetchIncomingRequests(me: string): Promise<FriendEntry[]> {
  const { data, error } = await supabase
    .from('friends')
    .select('id, user_id, friend_id, status, created_at')
    .eq('friend_id', me)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as FriendRow[];
  const profiles = await fetchProfilesByIds(rows.map(r => r.user_id));
  return attachProfiles(rows, profiles, r => r.user_id);
}

// Accepted friends: rows where I am either side and the status is
// accepted.
export async function fetchAcceptedFriends(me: string): Promise<FriendEntry[]> {
  const { data, error } = await supabase
    .from('friends')
    .select('id, user_id, friend_id, status, created_at')
    .eq('status', 'accepted')
    .or(`user_id.eq.${me},friend_id.eq.${me}`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as FriendRow[];
  const profiles = await fetchProfilesByIds(
    rows.map(r => (r.user_id === me ? r.friend_id : r.user_id))
  );
  return attachProfiles(rows, profiles, r => (r.user_id === me ? r.friend_id : r.user_id));
}

// Incoming challenges: rows where I am the challenged player and the
// challenge is still pending.
export async function fetchIncomingChallenges(me: string): Promise<ChallengeEntry[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('id, from_user, to_user, from_navitar, status, created_at')
    .eq('to_user', me)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as ChallengeRow[];
  const profiles = await fetchProfilesByIds(rows.map(r => r.from_user));
  return attachProfiles(rows, profiles, r => r.from_user);
}

// Challenges I sent that are still awaiting a reply — pending ones, plus
// ones the other side just accepted (the poll surface for "X accepted
// your challenge!").
export async function fetchSentChallenges(me: string): Promise<ChallengeEntry[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('id, from_user, to_user, from_navitar, status, created_at')
    .eq('from_user', me)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as ChallengeRow[];
  const profiles = await fetchProfilesByIds(rows.map(r => r.to_user));
  return attachProfiles(rows, profiles, r => r.to_user);
}

// Send a friend request. A duplicate pair (same two users, either
// direction is not enforced by the unique pair — only this direction)
// throws a unique-violation the caller turns into "request already sent".
export async function sendFriendRequest(me: string, them: string): Promise<void> {
  const { error } = await supabase
    .from('friends')
    .insert({ user_id: me, friend_id: them, status: 'pending' });
  if (error) throw error;
}

// Accept an incoming friend request.
export async function acceptFriendRequest(rowId: string): Promise<void> {
  const { error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', rowId);
  if (error) throw error;
}

// Decline an incoming friend request — the row is deleted.
export async function declineFriendRequest(rowId: string): Promise<void> {
  const { error } = await supabase.from('friends').delete().eq('id', rowId);
  if (error) throw error;
}

// Start a duel against a real friend's navitar. The remote navitar
// becomes a fight-club opponent (explicit id `friend-<userId>`, so two
// friends' navitars can never collide the way name-slug ids could),
// the pending challenge hands the Battle page its pre-selected
// opponent, and the duel then plays exactly like a demo duel —
// AI-driven opponent, points/XP banked locally as today.
//
// The caller supplies the fight-club + venue + navigation functions;
// this helper stays a plain function so both accept flows (incoming
// challenge, sent challenge accepted) share the one path.
export interface FriendDuelDeps {
  addRemoteOpponent: (
    input: {
      name: string;
      element: NavitarElement;
      level: number;
      skills: string[];
      imageUrl?: string;
      modelUrl?: string;
      modelZoom?: number;
    },
    id: string
  ) => string;
  setPendingChallenge: (opponentId: string, venueId: string) => void;
  navigate: (path: string) => void;
}

export async function startFriendDuel(
  deps: FriendDuelDeps,
  friendUserId: string,
  snapshot: NavitarSnapshot,
  challengeId?: string
): Promise<void> {
  const opponentId = deps.addRemoteOpponent(
    {
      name: snapshot.name,
      element: snapshot.element,
      level: snapshot.level,
      skills: snapshot.skills,
      imageUrl: snapshot.imageUrl,
      modelUrl: snapshot.modelUrl,
      modelZoom: snapshot.modelZoom,
    },
    `friend-${friendUserId}`
  );
  // After a duel starts from an accepted challenge, mark that challenge
  // completed — best effort only. A failure here must never block the
  // duel, so it is swallowed.
  if (challengeId) {
    try {
      await supabase.from('challenges').update({ status: 'completed' }).eq('id', challengeId);
    } catch {
      // Best effort: the duel still starts.
    }
  }
  // '' venue id = no venue win, same as a wild duel.
  deps.setPendingChallenge(opponentId, '');
  deps.navigate('/battle');
}
