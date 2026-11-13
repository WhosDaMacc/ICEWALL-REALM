// Landing page — the onboarding funnel. First-time visitors land here
// and go profile -> navitar -> enter, all on this page; returning
// players (saved display name + a navitar) get a compact "Welcome back"
// instead and are never forced through the steps again. Nothing here
// requires a sign-in: signed out, profile + navitar persist in
// localStorage exactly as before; signed in, the profile row is also
// upserted to Supabase (your navitars still live in localStorage —
// Phase 2 moves the collection to Supabase, not this build; the
// profile snapshot already tracks the ACTIVE navitar only). The old "Start Your
// Journey" button went to /collection, whose cards are not clickable,
// so it was a dead end; the front door into the loop is now /realm.
import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Grid, Paper, TextField, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';
import { useAuth } from '../contexts/AuthContext';
import { featuredNavitars, sampleNavitars } from '../components/NavitarShowcase';
import { NavitarDesign, type NavitarDesignProps } from '../components/NavitarDesign';
import AttackEditor from '../components/AttackEditor';
import { defaultAttacksFor, isValidAttacks, type NavitarAttack } from '../utils/attacks';
import { LookGrid } from '../components/LookPickerDialog';
import { NavitarArtImg } from '../components/NavitarArtImg';
import { GuidedDemo } from '../components/GuidedDemo';
import { ExplainerSection, PartnerSection } from '../components/DemoExplainer';
import { navitarSnapshot, upsertProfile } from '../utils/onlineFriends';
import { supabase, type NavitarElement } from '../utils/supabaseClient';
import {
  ALL_NAVITAR_LOOKS,
  elementColor,
  elementEmoji,
  resolveNavitarArt,
} from '../utils/navitarArt';

// Display name for signed-out play — the local store the funnel adds.
// Signed-in players also get this name upserted to Supabase profiles.
const DISPLAY_NAME_KEY = 'icewall-display-name';

// All 9 element types, for the create-your-own element picker.
const ELEMENTS: NavitarElement[] = [
  'ice',
  'fire',
  'nature',
  'shadow',
  'light',
  'quantum',
  'electric',
  'spiritual',
  'water',
];

// Starter skills for an adopted roster navitar. The roster entries
// carry no skills, so adopting wears the look with these signature
// moves — the four that match demo opponents use their real skills
// (Quantix, Voltwing, Spiritmaw, Tidefang); the rest are the obvious
// elemental defaults. Adopting is always a fresh Lv 1 start: the
// roster's Lv 12–25 is flavour only, never granted.
const ROSTER_SKILLS: Record<string, string[]> = {
  Frostbite: ['Ice Blast', 'Frost Shield'],
  Emberwing: ['Ember Strike', 'Flame Wing'],
  Leafblade: ['Leaf Slash', 'Thorn Guard'],
  Shadowmaw: ['Shadow Bite', 'Dark Veil'],
  Luminara: ['Light Beam', 'Radiant Shield'],
  Quantix: ['Quantum Leap', 'Phase Shift'],
  Voltwing: ['Thunder Dive', 'Static Shock'],
  Spiritmaw: ['Soul Roar', 'Spirit Guard'],
  Tidefang: ['Tidal Wave', 'Aqua Fang'],
};

// What is actually live in the game today — the only feature list on
// this page. The old "Latest Features" / "Battle System Updates"
// sections listed things that do not exist (Tag Team Battle System,
// Special Move Storage, Power Generation, Tag Team Combos) and are gone.
const LIVE_FEATURES = [
  'Venues with check-in — bars, parks and beaches on the Realm Map',
  'Meet a real person and break the ice',
  'Battles are opt-in — only if you choose to fight',
  'Wild opponents roaming the map',
  'Refill stations and potions',
  'Messages with the people you meet',
  'Levels, XP and training for your navitar',
  'Joe — announcer, judge, and the near-impossible boss to beat',
  'AR camera view — see your navitar in the real world',
  'Pirates leaderboard',
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { userNavitar, navitars, activeNavitarId, setActiveNavitar, createUserNavitar } =
    useNavitarFightClub();
  const { user } = useAuth();

  // ---- Step 1: profile ----
  // The saved name (localStorage for signed-out play); the input is
  // kept separate so editing never clobbers the saved value.
  const [savedName, setSavedName] = useState<string | null>(() => {
    try {
      return localStorage.getItem(DISPLAY_NAME_KEY);
    } catch {
      return null;
    }
  });
  const [nameInput, setNameInput] = useState(savedName ?? '');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Signed in: pick up the display name already on the account, so a
  // returning signed-in player is not asked for a name they already
  // saved. A missing table / network failure just leaves the local
  // name — never a crash, never a wall.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        const name = (data as { display_name: string | null } | null)?.display_name;
        if (name) {
          setSavedName(name);
          setNameInput(name);
          try {
            localStorage.setItem(DISPLAY_NAME_KEY, name);
          } catch {
            // Private mode / quota: the name still works this session.
          }
        }
      } catch {
        // Offline or table missing — the local name stands.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSaveProfile = async () => {
    const name = nameInput.trim();
    if (!name) return;
    setProfileError(null);
    setProfileStatus(null);
    try {
      localStorage.setItem(DISPLAY_NAME_KEY, name);
    } catch {
      // Private mode / quota: the name still works this session.
    }
    setSavedName(name);
    setEditingProfile(false);
    if (!user) {
      setProfileStatus('Saved on this device — no sign-in needed.');
      return;
    }
    // Signed in: the same name goes to the Supabase profiles row, with
    // the current navitar snapshot if one exists. A failure here never
    // loses the local save — it is reported as an inline line.
    setSavingProfile(true);
    try {
      await upsertProfile(user.id, name, userNavitar ? navitarSnapshot(userNavitar) : null);
      setProfileStatus('Saved to your account.');
    } catch (err) {
      setProfileError(
        `Saved on this device, but could not save to your account (${
          err instanceof Error ? err.message : 'network error'
        }).`
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // After a navitar is picked or created, keep the signed-in profile
  // row's snapshot current — best effort, inline error, never blocking.
  const syncNavitarToProfile = async (snapshot: {
    name: string;
    element: NavitarElement;
    level: number;
    skills: string[];
    imageUrl?: string;
  }) => {
    if (!user || !savedName) return;
    try {
      await upsertProfile(user.id, savedName, navitarSnapshot(snapshot));
    } catch (err) {
      setProfileError(
        `Could not save your navitar to your account (${
          err instanceof Error ? err.message : 'network error'
        }). It is still saved on this device.`
      );
    }
  };

  // Switch the active navitar from the collection — instant, no cost,
  // nothing is lost — and keep the signed-in profile snapshot on the
  // active one, the same as after a create/adopt.
  const handleSetActive = (navitar: {
    id: string;
    name: string;
    element: NavitarElement;
    level: number;
    skills: string[];
    imageUrl?: string;
  }) => {
    setActiveNavitar(navitar.id);
    void syncNavitarToProfile({
      name: navitar.name,
      element: navitar.element,
      level: navitar.level,
      skills: navitar.skills,
      imageUrl: navitar.imageUrl,
    });
  };

  // The owned collection, with the active one highlighted and a switch
  // option on the rest. Used in the returning welcome, in the Step 2
  // summary, and at the top of the chooser — the player picks one of
  // theirs OR creates/adopts a new one below. `onPick` closes the
  // chooser when the list is shown inside it; elsewhere it is a no-op.
  const renderCollection = (onPick?: () => void) => (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {navitars.map(navitar => {
        const art = resolveNavitarArt(navitar.imageUrl, navitar.name);
        const isActive = navitar.id === activeNavitarId;
        return (
          <Grid item xs={6} sm={4} key={navitar.id}>
            <Box
              sx={{
                p: 1,
                textAlign: 'center',
                border: '2px solid',
                borderColor: isActive ? elementColor(navitar.element) : 'transparent',
                borderRadius: 2,
              }}
            >
              {art ? (
                <NavitarArtImg
                  src={art}
                  alt={navitar.name}
                  element={navitar.element}
                  style={{ width: '100%', height: 96, borderRadius: 8 }}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: 96,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    background: elementColor(navitar.element),
                  }}
                >
                  {elementEmoji(navitar.element)}
                </Box>
              )}
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                {navitar.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {elementEmoji(navitar.element)} {navitar.element} · Lv {navitar.level}
              </Typography>
              <Box sx={{ mt: 1 }}>
                {isActive ? (
                  <Chip label="Active" color="primary" size="small" />
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      handleSetActive(navitar);
                      onPick?.();
                    }}
                  >
                    Set active
                  </Button>
                )}
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );

  // ---- Step 2: navitar ----
  // The chooser is open until a navitar exists; "Change" re-opens it.
  const [chooserOpen, setChooserOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSkills, setCreateSkills] = useState('');
  const [createElement, setCreateElement] = useState<NavitarElement>('ice');
  const [createLook, setCreateLook] = useState<string>(ALL_NAVITAR_LOOKS[0].src);
  const [createError, setCreateError] = useState<string | null>(null);

  // The comma-separated skills field, parsed the same way everywhere
  // the create flow reads it.
  const parseSkills = (value: string) =>
    value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

  // The create-your-own attacks editor: seeded from the element +
  // typed skills (the trainer's own skills first, then the element's
  // presets — defaultAttacksFor), and re-seeded when the element or
  // the skills change. Slots the trainer already edited in the editor
  // stay exactly as they typed them; untouched slots follow the new
  // seed. The editor is the source of truth — create always passes
  // this list explicitly, never undefined, so what the trainer saw is
  // what gets saved.
  const [createAttacks, setCreateAttacks] = useState<NavitarAttack[]>(() =>
    defaultAttacksFor('ice', [])
  );
  const [createTouched, setCreateTouched] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const reseedCreateAttacks = (
    element: NavitarElement,
    skills: string[],
    touched: boolean[],
    current: NavitarAttack[]
  ) => {
    const seed = defaultAttacksFor(element, skills);
    setCreateAttacks(seed.map((slot, i) => (touched[i] ? current[i] : slot)));
  };
  const handleCreateElement = (element: NavitarElement) => {
    setCreateElement(element);
    reseedCreateAttacks(element, parseSkills(createSkills), createTouched, createAttacks);
  };
  const handleCreateSkillsChange = (value: string) => {
    setCreateSkills(value);
    reseedCreateAttacks(createElement, parseSkills(value), createTouched, createAttacks);
  };
  const handleCreateAttacksChange = (next: NavitarAttack[]) => {
    setCreateTouched(prev =>
      next.map(
        (attack, i) =>
          prev[i] ||
          attack.name !== createAttacks[i].name ||
          attack.power !== createAttacks[i].power ||
          attack.preset !== createAttacks[i].preset
      )
    );
    setCreateAttacks(next);
  };

  // Adopt a showcase navitar: picking a card no longer adopts at
  // once — it opens the attacks editor below the grid, prefilled with
  // that navitar's defaults, and the Adopt button confirms.
  const [adoptTarget, setAdoptTarget] = useState<NavitarDesignProps | null>(null);
  const [adoptAttacks, setAdoptAttacks] = useState<NavitarAttack[]>([]);
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const handleSelectAdopt = (roster: NavitarDesignProps) => {
    const skills = ROSTER_SKILLS[roster.name] ?? ['Quick Attack'];
    setAdoptTarget(roster);
    setAdoptAttacks(defaultAttacksFor(roster.type, skills));
    setAdoptError(null);
  };

  // Adopt a showcase navitar: fresh Lv 1, its look and element, its
  // starter skills — never the roster's level or stats.
  const handleAdopt = () => {
    if (!adoptTarget) return;
    if (!isValidAttacks(adoptAttacks)) {
      setAdoptError('Give each attack a unique name (up to 40 characters).');
      return;
    }
    const roster = adoptTarget;
    const skills = ROSTER_SKILLS[roster.name] ?? ['Quick Attack'];
    createUserNavitar(roster.name, skills, roster.imageUrl, roster.type, adoptAttacks);
    setChooserOpen(false);
    setCreateError(null);
    setAdoptTarget(null);
    setAdoptError(null);
    void syncNavitarToProfile({
      name: roster.name,
      element: roster.type,
      level: 1,
      skills,
      imageUrl: roster.imageUrl,
    });
  };

  // Create your own: same shape as the Battle-page create dialog
  // (comma-separated skills, look picker), plus the element picker
  // the Battle dialog never had.
  const handleCreateOwn = () => {
    const name = createName.trim();
    const skills = parseSkills(createSkills);
    if (!name || skills.length === 0) {
      setCreateError('Give your navitar a name and at least one skill.');
      return;
    }
    if (!isValidAttacks(createAttacks)) {
      setCreateError('Give each attack a unique name (up to 40 characters).');
      return;
    }
    createUserNavitar(name, skills, createLook, createElement, createAttacks);
    setChooserOpen(false);
    setCreateError(null);
    setCreateName('');
    setCreateSkills('');
    void syncNavitarToProfile({
      name,
      element: createElement,
      level: 1,
      skills,
      imageUrl: createLook,
    });
  };

  const userArt = userNavitar ? resolveNavitarArt(userNavitar.imageUrl, userNavitar.name) : null;
  const hasProfile = savedName !== null && savedName !== '';
  // Returning player: name + navitar both exist — collapse the funnel
  // to a compact welcome. Either editor re-opens the full steps.
  const isReturning = hasProfile && userNavitar !== null && !editingProfile && !chooserOpen;

  return (
    <Box sx={{ py: 4 }}>
      {/* Headline — what the game actually is, in one line: the real
          loop is check in at a real place, meet a real person, battle
          with your navitar if you choose. No feature fiction. */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          background: 'linear-gradient(45deg, #1a237e 30%, #0d47a1 90%)',
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom>
          Icewall Realm
        </Typography>
        <Typography variant="h6" paragraph>
          Check in at a real place. Meet a real person. Battle with your navitar — only if you
          choose to.
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No sign-in needed to start — your profile and navitar live on this device until you sign
          in.
        </Typography>
      </Paper>

      {isReturning && userNavitar ? (
        // Returning player — compact welcome, never the full steps again.
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Welcome back, {savedName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {userArt && (
              <NavitarArtImg
                src={userArt}
                alt={`${userNavitar.name} art`}
                element={userNavitar.element}
                style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0 }}
              />
            )}
            <Typography variant="body1">
              Your navitar: {userNavitar.name}, Lv {userNavitar.level} {userNavitar.element}
            </Typography>
          </Box>
          {navitars.length > 1 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Your navitars — pick the active one
              </Typography>
              {renderCollection()}
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" size="small" onClick={() => setEditingProfile(true)}>
              Change profile
            </Button>
            <Button variant="outlined" size="small" onClick={() => setChooserOpen(true)}>
              Change navitar
            </Button>
          </Box>
        </Paper>
      ) : (
        <>
          {/* Step 1 — Your profile */}
          <Paper id="start-funnel" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Step 1 — Your profile
            </Typography>
            {hasProfile && !editingProfile ? (
              <>
                <Typography variant="body1" gutterBottom>
                  Playing as {savedName}
                </Typography>
                <Button variant="outlined" size="small" onClick={() => setEditingProfile(true)}>
                  Edit
                </Button>
              </>
            ) : (
              <>
                <TextField
                  fullWidth
                  margin="dense"
                  label="Display name"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void handleSaveProfile();
                  }}
                  helperText={
                    user
                      ? 'Other players find you by this name. Saved to your account.'
                      : 'Other players find you by this name. No sign-in needed — saved on this device.'
                  }
                />
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="contained"
                    disabled={!nameInput.trim() || savingProfile}
                    onClick={() => void handleSaveProfile()}
                  >
                    Save profile
                  </Button>
                </Box>
              </>
            )}
            {profileStatus && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {profileStatus}
              </Typography>
            )}
            {profileError && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {profileError}
              </Typography>
            )}
          </Paper>

          {/* Step 2 — Choose your navitar */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Step 2 — Choose your navitar
            </Typography>
            {userNavitar && !chooserOpen ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {userArt && (
                    <NavitarArtImg
                      src={userArt}
                      alt={`${userNavitar.name} art`}
                      element={userNavitar.element}
                      style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0 }}
                    />
                  )}
                  <Typography variant="body1">
                    Your navitar: {userNavitar.name}, Lv {userNavitar.level} {userNavitar.element}
                  </Typography>
                </Box>
                {navitars.length > 1 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Your navitars — pick the active one
                    </Typography>
                    {renderCollection()}
                  </Box>
                )}
                <Button variant="outlined" size="small" onClick={() => setChooserOpen(true)}>
                  Change
                </Button>
              </>
            ) : (
              <Grid container spacing={3}>
                {/* Your navitars — pick one of yours to use, or
                    create/adopt a new one below (adopting/creating
                    adds to the collection and makes the new one
                    active; nothing you own is ever replaced). */}
                {navitars.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Your navitars
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Pick one to use — or create a new one below. Creating or adopting adds to your
                      collection; your other navitars stay right here.
                    </Typography>
                    {renderCollection(() => setChooserOpen(false))}
                  </Grid>
                )}
                {/* (a) Pick one — all 9 showcase navitars. Picking adopts
                    it as a fresh Lv 1 navitar wearing that look. */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Pick one
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Adopting starts fresh at Lv 1 — you keep the look, not the roster&apos;s level.
                  </Typography>
                  <Grid container spacing={2}>
                    {sampleNavitars.map(roster => (
                      <Grid item xs={6} sm={4} key={roster.name}>
                        <Box
                          component="button"
                          type="button"
                          aria-label={`Adopt ${roster.name}`}
                          onClick={() => handleSelectAdopt(roster)}
                          sx={{
                            p: 1,
                            width: '100%',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: 'transparent',
                            border: '2px solid transparent',
                            borderRadius: 2,
                            '&:hover': { borderColor: elementColor(roster.type) },
                          }}
                        >
                          {roster.imageUrl ? (
                            <NavitarArtImg
                              src={roster.imageUrl}
                              alt={roster.name}
                              element={roster.type}
                              style={{ width: '100%', height: 96, borderRadius: 8 }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: '100%',
                                height: 96,
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                background: elementColor(roster.type),
                              }}
                            >
                              {elementEmoji(roster.type)}
                            </Box>
                          )}
                          <Typography variant="subtitle2" sx={{ mt: 1 }}>
                            {roster.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {elementEmoji(roster.type)} {roster.type} · roster Lv {roster.level}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  {/* Adopt panel — the picked showcase navitar's attacks,
                      prefilled from its starter skills; Adopt confirms
                      with the edited list, Cancel drops back to the grid. */}
                  {adoptTarget && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="subtitle1" gutterBottom>
                        Adopt {adoptTarget.name} — attacks
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Fresh Lv 1 {adoptTarget.type} — tweak the five moves below, or adopt as-is.
                      </Typography>
                      <AttackEditor
                        attacks={adoptAttacks}
                        element={adoptTarget.type}
                        level={1}
                        onChange={setAdoptAttacks}
                      />
                      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button variant="contained" onClick={handleAdopt}>
                          Adopt {adoptTarget.name}
                        </Button>
                        <Button variant="outlined" onClick={() => setAdoptTarget(null)}>
                          Cancel
                        </Button>
                      </Box>
                      {adoptError && (
                        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                          {adoptError}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Grid>

                {/* (b) Create your own — name + element + skills + look. */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Create your own
                  </Typography>
                  <TextField
                    fullWidth
                    margin="dense"
                    label="Navitar name"
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                  />
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Element
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {ELEMENTS.map(element => (
                      <Chip
                        key={element}
                        label={`${elementEmoji(element)} ${element}`}
                        onClick={() => handleCreateElement(element)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: createElement === element ? elementColor(element) : undefined,
                          color: createElement === element ? 'white' : undefined,
                          border:
                            createElement === element
                              ? `2px solid ${elementColor(element)}`
                              : undefined,
                        }}
                      />
                    ))}
                  </Box>
                  <TextField
                    fullWidth
                    margin="dense"
                    label="Skills — comma separated"
                    value={createSkills}
                    onChange={e => handleCreateSkillsChange(e.target.value)}
                    helperText="e.g. Ice Blast, Frost Shield"
                  />
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Attacks
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Your five moves — the first is your fast move in duels. Your typed skills seed
                    the first slots; change the element and the untouched slots re-seed.
                  </Typography>
                  <AttackEditor
                    attacks={createAttacks}
                    element={createElement}
                    level={1}
                    onChange={handleCreateAttacksChange}
                  />
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Look
                  </Typography>
                  <LookGrid selected={createLook} onSelect={setCreateLook} />
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      disabled={!createName.trim() || !createSkills.trim()}
                      onClick={handleCreateOwn}
                    >
                      Create my navitar
                    </Button>
                    {/* The button stays disabled until name + skills
                        exist — say WHAT is missing instead of leaving
                        a dead button unexplained (live audit
                        2026-11-12). */}
                    {(!createName.trim() || !createSkills.trim()) && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                        data-testid="create-navitar-hint"
                      >
                        To create your navitar, add{' '}
                        {!createName.trim() && !createSkills.trim()
                          ? 'a name and at least one skill above'
                          : !createName.trim()
                            ? 'a name above'
                            : 'at least one skill above (comma separated)'}
                        .
                      </Typography>
                    )}
                  </Box>
                  {createError && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {createError}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            )}
          </Paper>
        </>
      )}

      {/* Step 3 — Enter the game. The map is the front door into the
          loop; the arena is the secondary door. Both stay locked until
          a navitar exists — entering without one was the old dead end. */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Step 3 — Enter the game
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            disabled={!userNavitar}
            onClick={() => navigate('/realm')}
          >
            🗺️ Enter the Realm Map
          </Button>
          <Button
            variant="outlined"
            size="large"
            disabled={!userNavitar}
            onClick={() => navigate('/battle')}
          >
            ⚔️ Battle Arena
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {userNavitar
            ? 'Your navitar is ready — the map is where the game happens: check in, meet people, battle if you choose.'
            : 'Choose or create a navitar above to enter.'}
        </Typography>
      </Paper>

      {/* In the game today — only features that are actually live. */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          In the game today
        </Typography>
        <Grid container spacing={1}>
          {LIVE_FEATURES.map(feature => (
            <Grid item xs={12} sm={6} key={feature}>
              <Typography variant="body1">• {feature}</Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* The demo explainer + guided walkthrough + IPX partner section
          — below the funnel and "In the game today", above the
          showcase. Static copy and a scripted demo;
          neither touches real game state. */}
      <ExplainerSection />
      <GuidedDemo />
      <PartnerSection />

      {/* Featured Navitars — display only, as before: the first three
          showcase navitars with their art. Choosing one happens in the
          funnel above, not here. */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Featured Navitars
          </Typography>
          <Grid container spacing={2}>
            {featuredNavitars.map(navitar => (
              <Grid item xs={12} sm={6} md={4} key={navitar.name}>
                <NavitarDesign {...navitar} />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/collection')}>
              See all Navitars
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Battles-only 3D (Eddie's standing rule, 2026-11-12): the
          Home 3D Gallery is GONE — Griffin, Ashwing, Luminara,
          Frostbite and Emberwing's GLBs now appear only on the
          battle stage, where a duel loads exactly two models. Home
          presents 2D art only (the Featured Navitars strip above). */}
    </Box>
  );
};

export default Home;
