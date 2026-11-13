// Friends — the people the player has actually met on the Realm Map.
// A person becomes a friend the first time the player picks one of
// their icebreaker answers (see src/pages/RealmMap.tsx). Persisted in
// localStorage as an array of person ids; the second builder
// (Profile) imports this module — the interface below is its contract,
// do not change the signatures.

export const FRIENDS_KEY = 'icewall-friends';

export function loadFriends(): string[] {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    // Missing or corrupt — never throws, just no friends yet.
    return [];
  }
}

export function recordMetFriend(personId: string): void {
  const friends = loadFriends();
  if (friends.includes(personId)) return;
  friends.push(personId);
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  } catch {
    // Private mode / quota: the friend still holds for this session.
  }
}

export function isFriend(personId: string): boolean {
  return loadFriends().includes(personId);
}
