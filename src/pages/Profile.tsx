import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Switch,
  FormControlLabel,
  LinearProgress,
  TextField,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useNavitar } from '../contexts/NavitarContext';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';
import { useVenue } from '../contexts/VenueContext';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchAcceptedFriends,
  fetchIncomingChallenges,
  fetchIncomingRequests,
  fetchSentChallenges,
  navitarSnapshot,
  searchProfilesByName,
  sendFriendRequest,
  startFriendDuel,
  type ChallengeEntry,
  type FriendEntry,
  type ProfileRow,
} from '../utils/onlineFriends';
import {
  ALL_NAVITAR_LOOKS,
  elementColor,
  elementEmoji,
  resolveNavitarArt,
} from '../utils/navitarArt';
import { NavitarArtImg } from '../components/NavitarArtImg';
import { DEMO_VENUES, type VenuePerson } from '../data/venues';
import { POTIONS, getPotions, type PotionId } from '../utils/potions';
import { TRAIN_XP, streakMultiplier, xpProgress } from '../utils/levels';
import { loadFriends } from '../utils/friends';
import { loadTitles } from '../utils/titles';
import { personThreadId } from '../utils/threads';
import { LookPickerDialog } from '../components/LookPickerDialog';
import AttackEditor from '../components/AttackEditor';
import { defaultAttacksFor, isValidAttacks, type NavitarAttack } from '../utils/attacks';
import { NavitarChat } from '../components/NavitarChat';
import { isLiveAiEnabled, setLiveAiEnabled, liveAiStatus } from '../utils/liveAi';

// Profile page — shows the signed-in player's profile (when a wallet is
// connected and a profile loads) and the player's Navitar.
// The navitar created in Battle lives in NavitarFightClubContext, so this
// page reads THAT store — not NavitarContext, whose `navitars` list is
// never populated by any flow and always read as 0 ("Your Navitars (0)"
// even right after creating one in Battle). That was the bug.
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { selectedNavitar } = useNavitar();
  const {
    userNavitar,
    navitars,
    activeNavitarId,
    setActiveNavitar,
    points,
    winStreak,
    winLoss,
    trainingToday,
    trainNavitar,
    updateUserNavitarLook,
    updateUserNavitarAttacks,
    addVenueOpponent,
    addRemoteOpponent,
  } = useNavitarFightClub();
  const { checkedInVenueId, setPendingChallenge } = useVenue();
  const { profile, isLoading } = useUser();
  // Change look for the existing navitar — the picker used to live
  // only in the create dialog, so a player who already had a navitar
  // could never reach it. A tap applies the look immediately.
  const [isChangeLookOpen, setIsChangeLookOpen] = useState(false);
  // Live AI (DeepSeek) — OFF by default until go-live. While off, the
  // navitar answers from its scripted lines and no AI service is called,
  // so there are no charges. Persists in localStorage (icewall-live-ai).
  const [liveAi, setLiveAi] = useState<boolean>(() => isLiveAiEnabled());
  const handleLiveAiToggle = (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setLiveAiEnabled(checked);
    setLiveAi(checked);
  };
  // The navitar's art: its own picked look first, then the name map,
  // then nothing (the emoji fallback only lives on the stage/map).
  const userArt = userNavitar ? resolveNavitarArt(userNavitar.imageUrl, userNavitar.name) : null;
  // The attacks editor, bound to the stored list — the load migration
  // should have filled it, but a navitar with no (or a broken) list
  // falls back to the element + skills defaults instead of rendering
  // a broken editor. Edits are pre-validated: an invalid list shows
  // an inline error and never reaches the context, so the saved
  // attacks are never wiped by a half-typed name.
  const profileAttacks =
    userNavitar && userNavitar.attacks && userNavitar.attacks.length === 5
      ? userNavitar.attacks
      : userNavitar
        ? defaultAttacksFor(userNavitar.element, userNavitar.skills)
        : [];
  const [attackError, setAttackError] = useState<string | null>(null);
  const handleAttacksChange = (attacks: NavitarAttack[]) => {
    if (!isValidAttacks(attacks)) {
      setAttackError('Each attack needs a unique name (up to 40 characters).');
      return;
    }
    setAttackError(null);
    updateUserNavitarAttacks(attacks);
  };
  // Potions the player is carrying (localStorage; see src/utils/potions.ts).
  const potionCounts = getPotions();
  // Titles the player has earned (localStorage; see src/utils/titles.ts).
  const titles = loadTitles();
  // XP progress for the Selected Navitar card, and training sessions
  // left today (out of the daily cap).
  const xp = userNavitar ? xpProgress(userNavitar.xp ?? 0) : null;
  const trainingLeft = Math.max(0, trainingToday.cap - trainingToday.count);
  // The last training result, as a status line under the Train button.
  const [trainStatus, setTrainStatus] = useState<string | null>(null);
  const handleTrain = () => {
    const result = trainNavitar();
    if (!result.granted) {
      setTrainStatus(
        result.capped
          ? 'Daily training cap reached — come back tomorrow for more sessions.'
          : 'No navitar to train yet.'
      );
      return;
    }
    if (result.leveledUp) {
      const l = result.leveledUp;
      setTrainStatus(
        `🎉 LEVEL UP! Lv ${l.from} → Lv ${l.to} — damage ${l.oldDamage}→${l.newDamage}, HP ${l.oldMaxHp}→${l.newMaxHp}`
      );
      return;
    }
    const p = xpProgress(result.xp);
    setTrainStatus(`+${TRAIN_XP} XP — ${p.xpIntoLevel}/${p.xpForNextLevel} to Lv ${p.level + 1}`);
  };
  // People met at venues, resolved against DEMO_VENUES — the venue id
  // is the venue that contains the person, and it is what a remote
  // challenge records as the duel's venue.
  const friends = loadFriends()
    .map((personId): { person: VenuePerson; venueId: string } | null => {
      for (const venue of DEMO_VENUES) {
        const person = venue.people.find(p => p.id === personId);
        if (person) return { person, venueId: venue.id };
      }
      return null;
    })
    .filter((f): f is { person: VenuePerson; venueId: string } => f !== null);

  // Challenge a friend remotely — no check-in needed. Their navitar
  // becomes an opponent (same path as the venue meet card) and the
  // Battle page gets it pre-selected.
  const handleChallengeFriend = (person: VenuePerson, venueId: string) => {
    const opponentId = addVenueOpponent({
      name: person.navitarName,
      element: person.navitarElement,
      level: person.navitarLevel,
      skills: person.navitarSkills,
      imageUrl: person.navitarImage,
      modelUrl: person.navitarModelUrl,
      modelZoom: person.navitarModelZoom,
    });
    setPendingChallenge(opponentId, venueId);
    navigate('/battle');
  };

  // ---- Account (Supabase auth) + Real friends (Phase 1 multiplayer) ----
  // All additive: signed out, the page works exactly as before — the
  // demo sections below never ask for a sign-in, and nothing here
  // redirects. Every network failure renders as a short inline error
  // line, never a crash (the tables may not exist yet when this ships).
  const {
    user,
    loading: authLoading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    authError,
    authNotice,
  } = useAuth();
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');

  // When signed in, keep the profiles row in sync so friends can find
  // this player (and their navitar) by display name. The row is
  // fetched first so the stored display name is never clobbered by an
  // empty input, then the current navitar snapshot is upserted.
  // Re-runs when the navitar changes (win / train / level-up), so a
  // friend always sees the current navitar.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setAccountError(`Could not load your account profile: ${error.message}`);
          return;
        }
        const name = (data as { display_name: string | null } | null)?.display_name ?? '';
        setDisplayName(name);
        if (userNavitar) {
          const { error: upsertError } = await supabase.from('profiles').upsert({
            id: user.id,
            display_name: name,
            navitar_name: userNavitar.name,
            navitar: navitarSnapshot(userNavitar),
          });
          if (upsertError && !cancelled) {
            setAccountError(`Could not save your profile: ${upsertError.message}`);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setAccountError(
            `Could not load your account profile (${
              err instanceof Error ? err.message : 'network error'
            }).`
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, userNavitar]);

  const handleSaveDisplayName = async () => {
    if (!user) return;
    setAccountError(null);
    setAccountStatus(null);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName.trim() || null,
      navitar_name: userNavitar?.name ?? null,
      navitar: userNavitar ? navitarSnapshot(userNavitar) : null,
    });
    if (error) {
      setAccountError(`Could not save your display name: ${error.message}`);
      return;
    }
    setAccountStatus('Display name saved.');
  };

  // ---- Real friends data (refetched on mount + every 30s) ----
  const [incomingRequests, setIncomingRequests] = useState<FriendEntry[]>([]);
  const [acceptedFriends, setAcceptedFriends] = useState<FriendEntry[]>([]);
  const [incomingChallenges, setIncomingChallenges] = useState<ChallengeEntry[]>([]);
  const [sentChallenges, setSentChallenges] = useState<ChallengeEntry[]>([]);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileRow[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [friendActionBusy, setFriendActionBusy] = useState(false);

  const refreshOnline = useCallback(async () => {
    if (!user) return;
    try {
      const [incoming, accepted, incomingCh, sentCh] = await Promise.all([
        fetchIncomingRequests(user.id),
        fetchAcceptedFriends(user.id),
        fetchIncomingChallenges(user.id),
        fetchSentChallenges(user.id),
      ]);
      setIncomingRequests(incoming);
      setAcceptedFriends(accepted);
      setIncomingChallenges(incomingCh);
      setSentChallenges(sentCh);
      setFriendsError(null);
    } catch (err) {
      setFriendsError(
        `Could not load friends right now (${
          err instanceof Error ? err.message : 'network error'
        }).`
      );
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void refreshOnline();
    const timer = setInterval(() => {
      void refreshOnline();
    }, 30000);
    return () => clearInterval(timer);
  }, [user, refreshOnline]);

  const handleSearchPeople = async () => {
    if (!user) return;
    const query = searchQuery.trim();
    if (!query) return;
    setSearchError(null);
    setSearchStatus(null);
    try {
      const results = await searchProfilesByName(query, user.id);
      setSearchResults(results);
      if (results.length === 0) setSearchStatus('No one by that name yet.');
    } catch (err) {
      setSearchError(`Search failed (${err instanceof Error ? err.message : 'network error'}).`);
    }
  };

  const handleSendFriendRequest = async (them: ProfileRow) => {
    if (!user) return;
    setSearchError(null);
    setSearchStatus(null);
    try {
      await sendFriendRequest(user.id, them.id);
      setSearchStatus(`Friend request sent to ${them.display_name ?? 'that player'}.`);
      setSearchResults(prev => prev.filter(p => p.id !== them.id));
      void refreshOnline();
    } catch (err) {
      // A duplicate pair (unique user_id/friend_id) means the request
      // is already out there — say so, don't surface a raw DB error.
      const message = err instanceof Error ? err.message : '';
      const code = (err as { code?: string })?.code;
      if (code === '23505' || /duplicate/i.test(message)) {
        setSearchStatus('Friend request already sent.');
        return;
      }
      setSearchError(`Could not send the request (${message || 'network error'}).`);
    }
  };

  const handleAcceptRequest = async (rowId: string) => {
    setFriendActionBusy(true);
    try {
      await acceptFriendRequest(rowId);
      await refreshOnline();
    } catch (err) {
      setFriendsError(
        `Could not accept the request (${err instanceof Error ? err.message : 'network error'}).`
      );
    } finally {
      setFriendActionBusy(false);
    }
  };

  const handleDeclineRequest = async (rowId: string) => {
    setFriendActionBusy(true);
    try {
      await declineFriendRequest(rowId);
      await refreshOnline();
    } catch (err) {
      setFriendsError(
        `Could not decline the request (${err instanceof Error ? err.message : 'network error'}).`
      );
    } finally {
      setFriendActionBusy(false);
    }
  };

  // The one duel-start path for every real-friend flow: the friend's
  // navitar becomes a fight-club opponent and the Battle page gets it
  // pre-selected. The duel then plays exactly like a demo duel.
  const duelDeps = { addRemoteOpponent, setPendingChallenge, navigate };

  const handleChallengeRealFriend = (entry: FriendEntry) => {
    const snapshot = entry.profile?.navitar;
    if (!snapshot) {
      setFriendsError(`${entry.profile?.display_name ?? 'That friend'} has no navitar yet.`);
      return;
    }
    if (!userNavitar) {
      setFriendsError('Create your navitar first — you need one to duel.');
      return;
    }
    void startFriendDuel(duelDeps, entry.otherId, snapshot);
  };

  const handleAcceptChallenge = async (entry: ChallengeEntry) => {
    if (!userNavitar) {
      setFriendsError('Create your navitar first — you need one to duel.');
      return;
    }
    setFriendActionBusy(true);
    try {
      const { error } = await supabase
        .from('challenges')
        .update({ status: 'accepted' })
        .eq('id', entry.row.id);
      if (error) throw error;
      await startFriendDuel(duelDeps, entry.row.from_user, entry.row.from_navitar, entry.row.id);
      await refreshOnline();
    } catch (err) {
      setFriendsError(
        `Could not accept the challenge (${err instanceof Error ? err.message : 'network error'}).`
      );
    } finally {
      setFriendActionBusy(false);
    }
  };

  const handleDeclineChallenge = async (rowId: string) => {
    setFriendActionBusy(true);
    try {
      const { error } = await supabase
        .from('challenges')
        .update({ status: 'declined' })
        .eq('id', rowId);
      if (error) throw error;
      await refreshOnline();
    } catch (err) {
      setFriendsError(
        `Could not decline the challenge (${err instanceof Error ? err.message : 'network error'}).`
      );
    } finally {
      setFriendActionBusy(false);
    }
  };

  // A sent challenge the other side just accepted (the poll noticed):
  // battle their current navitar from their profile row.
  const handleBattleAcceptedChallenge = (entry: ChallengeEntry) => {
    const snapshot = entry.profile?.navitar;
    if (!snapshot) {
      setFriendsError(`${entry.profile?.display_name ?? 'That friend'} has no navitar yet.`);
      return;
    }
    if (!userNavitar) {
      setFriendsError('Create your navitar first — you need one to duel.');
      return;
    }
    void startFriendDuel(duelDeps, entry.otherId, snapshot, entry.row.id);
  };

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Your Profile
      </Typography>

      {/* Account — Supabase auth for real friends and challenges.
          Additive only: signed out, everything below works exactly as
          today and nothing here asks you to sign in to play. */}
      <Typography variant="h5" gutterBottom>
        Account
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        {authLoading ? (
          <Typography>Loading account…</Typography>
        ) : user ? (
          <>
            <Typography variant="body1" gutterBottom>
              Signed in as {user.email}
            </Typography>
            <TextField
              fullWidth
              margin="dense"
              label="Display name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              helperText="Other players find you by this name."
            />
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="contained" size="small" onClick={() => void handleSaveDisplayName()}>
                Save display name
              </Button>
              <Button variant="outlined" size="small" onClick={() => void signOut()}>
                Sign out
              </Button>
            </Box>
            {accountStatus && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {accountStatus}
              </Typography>
            )}
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" paragraph>
              Sign in to add real friends and challenge them — or keep playing signed out, exactly
              as today. Nothing here is required to play.
            </Typography>
            <TextField
              fullWidth
              margin="dense"
              label="Email"
              type="email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
            />
            <TextField
              fullWidth
              margin="dense"
              label="Password"
              type="password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
            />
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                disabled={!authEmail.trim() || !authPassword}
                onClick={() => void signUp(authEmail.trim(), authPassword)}
              >
                Sign up
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={!authEmail.trim() || !authPassword}
                onClick={() => void signIn(authEmail.trim(), authPassword)}
              >
                Sign in
              </Button>
              <Button variant="outlined" size="small" onClick={() => void signInWithGoogle()}>
                Continue with Google
              </Button>
            </Box>
          </>
        )}
        {authError && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {authError}
          </Typography>
        )}
        {authNotice && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {authNotice}
          </Typography>
        )}
        {accountError && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {accountError}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        {isLoading ? (
          <Typography>Loading profile…</Typography>
        ) : profile ? (
          <>
            <Typography variant="h6">{profile.username}</Typography>
            <Typography variant="body2" color="text.secondary">
              {profile.email} · Reputation {profile.reputation}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Wallet: {profile.walletAddress}
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6">No profile loaded</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Connect your wallet to load your Ice Wall profile. Until then, your Navitars are
              stored in this browser.
            </Typography>
          </>
        )}
      </Paper>

      <Typography variant="h5" gutterBottom>
        Battle points: {points}
      </Typography>
      <Typography variant="h6" gutterBottom>
        Duel record: {winLoss.wins} win{winLoss.wins === 1 ? '' : 's'} · {winLoss.losses} loss
        {winLoss.losses === 1 ? '' : 'es'}
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Points won in duels — a win banks its points, a loss costs nothing.
          {checkedInVenueId
            ? ' You are checked in at a venue; your companion is there with you.'
            : ' Check in at a bar, park or beach on the Realm Map to meet people and battle.'}
        </Typography>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Selected Navitar
      </Typography>
      {userNavitar ? (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            {userArt && (
              <NavitarArtImg
                src={userArt}
                alt={`${userNavitar.name} art`}
                element={userNavitar.element}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  border: '3px solid #2196f3',
                  flexShrink: 0,
                }}
              />
            )}
            <Box>
              <Typography variant="h6">
                {userNavitar.name} <Chip label={userNavitar.element} color="primary" size="small" />
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Level {userNavitar.level} · HP {userNavitar.hp}/{userNavitar.maxHp}
              </Typography>
              {xp && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    XP {xp.xpIntoLevel} / {xp.xpForNextLevel} to Lv {xp.level + 1}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={xp.fraction * 100}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}
              {winStreak >= 1 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {winStreak >= 2
                    ? `🔥 Win streak: ${winStreak} — ×${streakMultiplier(winStreak)} XP`
                    : `🔥 Win streak: ${winStreak}`}
                </Typography>
              )}
            </Box>
          </Box>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Skills
          </Typography>
          {userNavitar.skills.map(skill => (
            <Chip key={skill} label={skill} sx={{ mr: 1, mb: 1 }} />
          ))}
          <Typography variant="body2" color="text.secondary">
            Fast move: {userNavitar.fastMove.name} — {userNavitar.fastMove.damage} dmg
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Attacks
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Your five moves — the first is your fast move in duels. Pick a preset or type a custom
              name (power 5–25); changes save as you edit.
            </Typography>
            <AttackEditor
              attacks={profileAttacks}
              element={userNavitar.element}
              level={userNavitar.level}
              onChange={handleAttacksChange}
            />
            {attackError && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {attackError}
              </Typography>
            )}
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Training
            </Typography>
            <Button
              variant="contained"
              size="small"
              disabled={trainingLeft <= 0}
              onClick={handleTrain}
            >
              Train +{TRAIN_XP} XP
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {trainingLeft} of {trainingToday.cap} sessions left today — training XP counts toward
              your next level, just like win XP. Potions are for duels; training is the steady grind
              between fights.
            </Typography>
            {trainStatus && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {trainStatus}
              </Typography>
            )}
          </Box>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" size="small" onClick={() => setIsChangeLookOpen(true)}>
              Change look
            </Button>
            <Button variant="outlined" size="small" onClick={() => navigate('/ar')}>
              📷 See in AR
            </Button>
          </Box>
        </Paper>
      ) : selectedNavitar ? (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6">
            {selectedNavitar.name}{' '}
            <Chip label={selectedNavitar.type} color="primary" size="small" />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Level {selectedNavitar.level} · Health {selectedNavitar.health} · Energy{' '}
            {selectedNavitar.energy}
          </Typography>
          <Typography variant="body2" paragraph>
            {selectedNavitar.personality}
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Moves
          </Typography>
          {selectedNavitar.moves.map(move => (
            <Chip
              key={move.name}
              label={`${move.name} — ${move.damage} dmg`}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Paper>
      ) : (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography paragraph>No Navitar selected yet.</Typography>
          <Button variant="contained" onClick={() => navigate('/collection')}>
            Choose from your collection
          </Button>
        </Paper>
      )}

      {/* Your Navitars — the whole owned collection. Exactly one is
          ACTIVE at a time (the Selected Navitar card above, the one
          that battles, trains and shows up for friends); the rest are
          kept here, not lost. Switching active is instant and costs
          nothing — the Supabase snapshot follows automatically, since
          the sync effect above re-runs when the active navitar
          changes. */}
      <Typography variant="h5" gutterBottom>
        Your Navitars ({navitars.length})
      </Typography>
      {navitars.length > 0 ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {navitars.map(navitar => {
            const art = resolveNavitarArt(navitar.imageUrl, navitar.name);
            const isActive = navitar.id === activeNavitarId;
            const progress = xpProgress(navitar.xp ?? 0);
            return (
              <Grid item xs={12} sm={6} md={4} key={navitar.id}>
                <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {art && (
                    <NavitarArtImg
                      src={art}
                      alt={`${navitar.name} art`}
                      element={navitar.element}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        border: '2px solid #2196f3',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="subtitle1">
                      {navitar.name} <Chip label={navitar.element} size="small" />
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Level {navitar.level} · HP {navitar.hp}/{navitar.maxHp}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      XP {progress.xpIntoLevel} / {progress.xpForNextLevel} to Lv{' '}
                      {progress.level + 1}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={progress.fraction * 100}
                      sx={{ mt: 0.5 }}
                    />
                    <Box sx={{ mt: 1 }}>
                      {isActive ? (
                        <Chip label="Active" color="primary" size="small" />
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setActiveNavitar(navitar.id)}
                        >
                          Set active
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          You have no Navitars yet. Create one in a battle or from your collection.
        </Typography>
      )}

      <Typography variant="h5" gutterBottom>
        Potions
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        {(Object.keys(POTIONS) as PotionId[]).map(id => (
          <Typography key={id} variant="body1">
            {POTIONS[id].emoji} {POTIONS[id].name} ×{potionCounts[id]} — {POTIONS[id].blurb}
          </Typography>
        ))}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Collect them at refill stations on the Realm Map.
        </Typography>
      </Paper>

      {/* Titles earned in duels — local-only (see src/utils/titles.ts).
          Winning the Joe boss fight is the only way to earn one so far. */}
      <Typography variant="h5" gutterBottom>
        Titles
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        {titles.length > 0 ? (
          titles.map(title => (
            <Box key={title.id} sx={{ mb: 1 }}>
              <Typography variant="body1">
                🏆 <strong>{title.name}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {title.blurb} · Earned{' '}
                {new Date(title.earnedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Typography>
            </Box>
          ))
        ) : (
          <Typography color="text.secondary">
            No titles yet — challenge Joe on the Battle page or at his arena on the Realm Map.
          </Typography>
        )}
      </Paper>

      <Typography variant="h5" gutterBottom>
        Friends ({friends.length})
      </Typography>
      {friends.length > 0 ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {friends.map(({ person, venueId }) => {
            const art = resolveNavitarArt(person.navitarImage, person.navitarName);
            return (
              <Grid item xs={12} sm={6} md={4} key={person.id}>
                <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {art ? (
                    <NavitarArtImg
                      src={art}
                      alt={`${person.navitarName} art`}
                      element={person.navitarElement}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        border: `2px solid ${elementColor(person.navitarElement)}`,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        border: `2px solid ${elementColor(person.navitarElement)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        flexShrink: 0,
                      }}
                    >
                      {elementEmoji(person.navitarElement)}
                    </Box>
                  )}
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="subtitle1">
                      {person.name} · {person.navitarName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lv. {person.navitarLevel} · {person.navitarElement}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleChallengeFriend(person, venueId)}
                  >
                    Challenge
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/messages?thread=${personThreadId(person.id)}`)}
                  >
                    Message
                  </Button>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography color="text.secondary">
            No friends yet — meet someone at a venue (answer an icebreaker on the Realm Map) and
            they&apos;ll show up here.
          </Typography>
        </Paper>
      )}

      {/* Real friends — signed-in players only. Friends, requests and
          challenges refresh on mount and every 30s while signed in.
          Duels play exactly like demo duels (AI opponent, local
          points/XP). The demo Friends section above is untouched. */}
      {user && (
        <>
          <Typography variant="h5" gutterBottom>
            Real friends
          </Typography>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Add a friend
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Display name"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleSearchPeople();
                }}
              />
              <Button
                variant="contained"
                size="small"
                disabled={!searchQuery.trim()}
                onClick={() => void handleSearchPeople()}
              >
                Search
              </Button>
            </Box>
            {searchResults.map(result => (
              <Box key={result.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {result.display_name ?? 'Player'}
                  {result.navitar_name ? ` · ${result.navitar_name}` : ''}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => void handleSendFriendRequest(result)}
                >
                  Add
                </Button>
              </Box>
            ))}
            {searchStatus && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {searchStatus}
              </Typography>
            )}
            {searchError && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {searchError}
              </Typography>
            )}

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
              Friend requests
            </Typography>
            {incomingRequests.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No pending friend requests.
              </Typography>
            ) : (
              incomingRequests.map(entry => (
                <Box
                  key={entry.row.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
                >
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {entry.profile?.display_name ?? 'A player'} wants to be your friend.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={friendActionBusy}
                    onClick={() => void handleAcceptRequest(entry.row.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={friendActionBusy}
                    onClick={() => void handleDeclineRequest(entry.row.id)}
                  >
                    Decline
                  </Button>
                </Box>
              ))
            )}

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
              Friends ({acceptedFriends.length})
            </Typography>
            {acceptedFriends.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No real friends yet — search a display name above to add one.
              </Typography>
            ) : (
              acceptedFriends.map(entry => (
                <Box
                  key={entry.row.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
                >
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {entry.profile?.display_name ?? 'Player'}
                    {entry.profile?.navitar
                      ? ` · ${entry.profile.navitar.name} — Lv ${entry.profile.navitar.level} ${entry.profile.navitar.element}`
                      : ' · no navitar yet'}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!entry.profile?.navitar || !userNavitar}
                    onClick={() => handleChallengeRealFriend(entry)}
                  >
                    Challenge
                  </Button>
                </Box>
              ))
            )}

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
              Challenges
            </Typography>
            {incomingChallenges.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No one has challenged you.
              </Typography>
            ) : (
              incomingChallenges.map(entry => (
                <Box
                  key={entry.row.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
                >
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {entry.profile?.display_name ?? 'A player'} challenges you with{' '}
                    {entry.row.from_navitar.name} — Lv {entry.row.from_navitar.level}{' '}
                    {entry.row.from_navitar.element}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={friendActionBusy}
                    onClick={() => void handleAcceptChallenge(entry)}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={friendActionBusy}
                    onClick={() => void handleDeclineChallenge(entry.row.id)}
                  >
                    Decline
                  </Button>
                </Box>
              ))
            )}
            {sentChallenges.map(entry =>
              entry.row.status === 'accepted' ? (
                <Box
                  key={entry.row.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
                >
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    ⚔️ {entry.profile?.display_name ?? 'A player'} accepted your challenge!
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleBattleAcceptedChallenge(entry)}
                  >
                    Battle now
                  </Button>
                </Box>
              ) : (
                <Typography
                  key={entry.row.id}
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Waiting for {entry.profile?.display_name ?? 'a player'} to accept your challenge…
                </Typography>
              )
            )}

            {friendsError && (
              <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                {friendsError}
              </Typography>
            )}
          </Paper>
        </>
      )}

      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={liveAi}
              onChange={handleLiveAiToggle}
              inputProps={{ 'aria-label': 'Live AI (DeepSeek)' }}
            />
          }
          label="Live AI (DeepSeek) — off until go-live"
        />
        <Typography variant="body2" color="text.secondary">
          {liveAi
            ? liveAiStatus() === 'ready'
              ? 'On — your navitar answers through DeepSeek.'
              : 'On, but no DeepSeek key is configured in this build — your navitar still answers from its scripted lines.'
            : 'Off — your navitar answers from its scripted lines and no AI service is called, so there are no charges.'}
        </Typography>
      </Paper>

      <NavitarChat
        navitar={
          userNavitar
            ? { id: userNavitar.id, name: userNavitar.name, element: userNavitar.element }
            : null
        }
        liveAiEnabled={liveAi}
      />

      {/* Change look — same 18 looks as the create dialog. A tap
          applies it immediately; the context persists it, so the stage,
          this page and the companion use it at once. */}
      <LookPickerDialog
        open={isChangeLookOpen}
        onClose={() => setIsChangeLookOpen(false)}
        selected={
          (userNavitar && resolveNavitarArt(userNavitar.imageUrl, userNavitar.name)) ??
          ALL_NAVITAR_LOOKS[0].src
        }
        onSelect={src => {
          updateUserNavitarLook(src);
          setIsChangeLookOpen(false);
        }}
      />
    </Box>
  );
};

export default Profile;
