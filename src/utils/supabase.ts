// Supabase client for ICEWALL-REALM.
// The publishable key below is designed for client-side use (it is the
// anon key, gated by Row Level Security on the tables). NEVER put a
// database password or a service_role / secret key in this file or in any
// client code — there is none here and none to invent.
const SUPABASE_URL = 'https://tfoxlkxdsxpqnnmqbaob.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7rF6rzVF5vyEcCxQfkqZ5Q_3OILDalA';

export type PlayerType = 'hunter' | 'navitar';
export type Realm = 'treasure-quest' | 'icewall-realm' | 'pirates-realm';

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  player_type: PlayerType;
  realm: Realm;
  score: number;
  navitar_name: string | null;
  created_at: string;
}

// Human-readable label for each realm value, as shown on the leaderboard.
export const REALM_LABELS: Record<Realm, string> = {
  'treasure-quest': 'Treasure Quest',
  'icewall-realm': 'ICEWALL-REALM',
  'pirates-realm': 'Pirates Realm',
};

// Fetch every leaderboard entry, highest score first. Hunters and
// navitars share the one table, so one call returns the combined board.
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard_entries?select=*&order=score.desc`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Leaderboard request failed (${res.status})`);
  }
  const rows = (await res.json()) as LeaderboardEntry[];
  // Sort client-side too, so the order holds even if the server ever
  // stops honouring the order parameter.
  return [...rows].sort((a, b) => b.score - a.score);
}
