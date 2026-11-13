// Supabase client for the multiplayer (Phase 1) features — auth, profiles,
// friends and challenges. Uses the SAME publishable key as
// src/utils/supabase.ts (safe for client-side use, gated by Row Level
// Security). NEVER put a service_role / secret key in this file or in any
// client code — there is none here and none to invent.
//
// Do not change src/utils/supabase.ts: its fetchLeaderboard() stays the
// leaderboard path. This file is the new supabase-js client for auth and
// the social tables.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tfoxlkxdsxpqnnmqbaob.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7rF6rzVF5vyEcCxQfkqZ5Q_3OILDalA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// The navitar element union, same as the fight-club Navitar type.
export type NavitarElement =
  'ice' | 'fire' | 'nature' | 'shadow' | 'light' | 'quantum' | 'electric' | 'spiritual' | 'water';

// A navitar as stored in a profile row / challenge row. Only the
// display fields — hp / fastMove are derived from level at duel time,
// never stored.
export interface NavitarSnapshot {
  name: string;
  element: NavitarElement;
  level: number;
  skills: string[];
  imageUrl?: string;
  modelUrl?: string;
  modelZoom?: number;
}

// Row of public.profiles (id references auth.users).
export interface ProfileRow {
  id: string;
  display_name: string | null;
  navitar_name: string | null;
  navitar: NavitarSnapshot | null;
  created_at: string;
}

// Row of public.friends.
export interface FriendRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

// Row of public.challenges. from_navitar is the challenger's navitar
// snapshot at challenge time, so the challenged player can see what
// they are up against before accepting.
export interface ChallengeRow {
  id: string;
  from_user: string;
  to_user: string;
  from_navitar: NavitarSnapshot;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  created_at: string;
}
