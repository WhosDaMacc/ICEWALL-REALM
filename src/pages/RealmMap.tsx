// Realm Map page — real interactive map built with Leaflet + OpenStreetMap.
// No API key, no billing. Tiles are (c) OpenStreetMap contributors.
//
// Portals come from RealmContext (useRealm). The demo portals live in Los
// Angeles (Hollywood + San Fernando Valley); give a portal a real lat/lng
// when it is created and it shows up here automatically. The old
// Google-Maps component (src/components/RealmMap.tsx) is kept untouched —
// it needs @react-google-maps/api and a Google API key that this repo does
// not have.
//
// The bar loop lives here too (Eddie's core loop: walk into a place that
// has perks, meet a person there, battle them if you choose). Demo venues
// come from src/data/venues.ts — 2 fictional demo bars plus 2 public
// arenas (Santa Monica Beach, Griffith Park). Check-in, wins and points
// are local-only; the meet is one scripted icebreaker exchange, no AI.

import React, { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box,
  Typography,
  Paper,
  Button,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { RealmProvider, useRealm, RealmPortal } from '../contexts/RealmContext';
import { JOE_OPPONENT_ID, useNavitarFightClub } from '../contexts/NavitarFightClub';
import { useVenue } from '../contexts/VenueContext';
import { usePresence } from '../contexts/PresenceContext';
import { DEMO_VENUES, DemoVenue, VenueKind, VenuePerson } from '../data/venues';
import { WILD_NAVITARS, WildNavitar } from '../data/wild';
import { JOE_INTRO } from '../data/joe';
import { REFILL_STATIONS, RefillStation } from '../data/stations';
import { POTIONS, PotionCounts, PotionId, getPotions, grantPotions } from '../utils/potions';
import { loadFriends, recordMetFriend } from '../utils/friends';
import { personThreadId, seedPersonThread } from '../utils/threads';
import { personVisibleToPlayer } from '../utils/presence';
import { PersonStatusChip, VenueNetworkingStrip } from '../components/NetworkingStatus';
import { elementColor, elementEmoji, resolveNavitarArt } from '../utils/navitarArt';
import { NavitarArtImg } from '../components/NavitarArtImg';

// A person's navitar thumb in the who's-here list and the meet card:
// the 2D art when it has some, otherwise the element emoji on the same
// gradient disc. The Griffin has no 2D art — its only visual is the 3D
// model, which appears on the battle stage when it is challenged — so
// its map cards show the ice emoji rather than a broken image.
function PersonThumb({
  person,
  size,
  borderWidth,
}: {
  person: VenuePerson;
  size: number;
  borderWidth: number;
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: `${borderWidth}px solid ${elementColor(person.navitarElement)}`,
    flexShrink: 0,
  };
  if (person.navitarImage) {
    return (
      <NavitarArtImg
        src={person.navitarImage}
        alt={`${person.navitarName} art`}
        element={person.navitarElement}
        style={style}
      />
    );
  }
  return (
    <Box
      sx={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.45,
        background: `radial-gradient(circle at 35% 30%, ${elementColor(person.navitarElement)}66, #121212 75%)`,
      }}
      role="img"
      aria-label={`${person.navitarName} art`}
    >
      {elementEmoji(person.navitarElement)}
    </Box>
  );
}

// Los Angeles — Hollywood, the San Fernando Valley and the beach in one
// viewport. Zoom 11 fits all four demo venues plus both portals.
const LA_CENTER: [number, number] = [34.1, -118.44];
const LA_ZOOM = 11;

// Wild spawns — ephemeral by design: 5 random wild navitars at random
// positions, reshuffled every WILD_RESHUFFLE_MS (session-only, never
// persisted). A spawn never lands exactly on a venue or portal: any
// pick within ~0.005° of one is rolled again (up to 20 tries).
const WILD_SPAWN_COUNT = 5;
const WILD_RESHUFFLE_MS = 120000;
const WILD_LAT_MIN = 34.0;
const WILD_LAT_MAX = 34.2;
const WILD_LNG_MIN = -118.55;
const WILD_LNG_MAX = -118.28;
// Demo venues + portals, from src/data/venues.ts and RealmContext —
// spawns keep ~0.005° clear of all of them.
const WILD_AVOID_SPOTS: [number, number][] = [
  [34.101, -118.34],
  [34.183, -118.456],
  [34.0105, -118.496],
  [34.1184, -118.3004],
  [34.1224, -118.2964],
  [34.055, -118.295],
  [34.235, -118.415],
];

// Joe's arena — the Impossible Challenger's stage, by the Observatory
// (Griffith Park). Fixed, not a wild spawn: the wild-spawn avoid list
// above keeps roaming navitars off it, and the venue marker it sits
// near is at (34.1184, -118.3004), far enough that the two never stack.
const JOE_ARENA: [number, number] = [34.1224, -118.2964];

interface WildSpawn {
  id: string;
  wild: WildNavitar;
  lat: number;
  lng: number;
}

let wildSpawnSeq = 0;

function pickWildSpawns(): WildSpawn[] {
  const spawns: WildSpawn[] = [];
  for (let i = 0; i < WILD_SPAWN_COUNT; i++) {
    const wild = WILD_NAVITARS[Math.floor(Math.random() * WILD_NAVITARS.length)];
    let lat = 0;
    let lng = 0;
    for (let attempt = 0; attempt < 20; attempt++) {
      lat = WILD_LAT_MIN + Math.random() * (WILD_LAT_MAX - WILD_LAT_MIN);
      lng = WILD_LNG_MIN + Math.random() * (WILD_LNG_MAX - WILD_LNG_MIN);
      const tooClose = WILD_AVOID_SPOTS.some(
        ([aLat, aLng]) => Math.abs(lat - aLat) < 0.005 && Math.abs(lng - aLng) < 0.005
      );
      if (!tooClose) break;
    }
    wildSpawnSeq += 1;
    spawns.push({ id: `wild-spawn-${wildSpawnSeq}`, wild, lat, lng });
  }
  return spawns;
}

// Refill stations — a station goes on a 5-minute cooldown after a
// collect, persisted per station in localStorage so a reload doesn't
// reset it.
const STATION_COOLDOWN_MS = 5 * 60 * 1000;
const STATION_COOLDOWNS_KEY = 'icewall-station-cooldowns';

function loadStationCooldowns(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STATION_COOLDOWNS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    });
    return out;
  } catch {
    return {};
  }
}

function formatCooldownMs(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

const PORTAL_EMOJI: Record<string, string> = {
  ice: '❄️',
  fire: '🔥',
  nature: '🌿',
  shadow: '🌑',
  light: '✨',
  quantum: '🌌',
  electric: '⚡',
  spiritual: '🕊️',
  water: '💧',
};

const VENUE_EMOJI: Record<VenueKind, string> = {
  bar: '🍺',
  park: '🌳',
  beach: '🏖️',
};

function portalIcon(type: string) {
  return L.divIcon({
    className: 'icewall-portal-marker',
    html: `<div style="font-size:28px;line-height:1;text-shadow:0 2px 6px rgba(0,0,0,0.6);">${PORTAL_EMOJI[type] || '🌀'}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function venueIcon(venue: DemoVenue) {
  return L.divIcon({
    className: 'icewall-venue-marker',
    html:
      `<div style="width:40px;height:40px;border-radius:50%;background:${elementColor(venue.element)};` +
      `display:flex;align-items:center;justify-content:center;font-size:22px;` +
      `box-shadow:0 2px 8px rgba(0,0,0,0.6);border:2px solid #fff;">${VENUE_EMOJI[venue.kind]}</div>` +
      `<div style="text-align:center;font-size:11px;font-weight:bold;color:#fff;` +
      `text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-top:2px;white-space:nowrap;">${escapeHtml(venue.name)}</div>`,
    iconSize: [40, 58],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

// A wild navitar on the map: the same art-circle pattern as the
// companion marker, but smaller (56px vs 72px) with an amber/gold ring
// and a "WILD" label under the name, so a roaming wild navitar never
// reads as the player's companion.
function wildIcon(wild: WildNavitar) {
  const art = resolveNavitarArt(wild.imageUrl, wild.name);
  const inner = art
    ? `<img src="${art}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;">${elementEmoji(wild.element)}</div>`;
  return L.divIcon({
    className: 'icewall-wild-marker',
    html:
      `<div style="width:56px;height:56px;border-radius:50%;border:3px solid #FFC107;` +
      `overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.6);background:#121212;">${inner}</div>` +
      `<div style="text-align:center;font-size:11px;font-weight:bold;color:#fff;` +
      `text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-top:2px;white-space:nowrap;">${escapeHtml(wild.name)}</div>` +
      `<div style="text-align:center;font-size:10px;font-weight:bold;color:#FFC107;` +
      `text-shadow:0 1px 3px rgba(0,0,0,0.8);">WILD</div>`,
    iconSize: [56, 76],
    iconAnchor: [28, 28],
    popupAnchor: [0, -28],
  });
}

// A refill station on the map: a teal circle with a potion emoji and
// the station name — distinct from venues (element-coloured, kind
// emoji) and from the player/companion circles.
function stationIcon(station: RefillStation) {
  return L.divIcon({
    className: 'icewall-station-marker',
    html:
      '<div style="width:40px;height:40px;border-radius:50%;background:#009688;' +
      'display:flex;align-items:center;justify-content:center;font-size:22px;' +
      'box-shadow:0 2px 8px rgba(0,0,0,0.6);border:2px solid #fff;">🧪</div>' +
      `<div style="text-align:center;font-size:11px;font-weight:bold;color:#fff;` +
      `text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-top:2px;white-space:nowrap;">${escapeHtml(station.name)}</div>`,
    iconSize: [40, 58],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

// Joe's arena on the map: a gold circle with a mic emoji and a
// "JOE" label — distinct from venues (element-coloured, kind emoji),
// stations (teal, potion emoji) and wild spawns (amber ring, WILD
// label), so the Impossible Challenger reads as a person, not a place.
function joeIcon() {
  return L.divIcon({
    className: 'icewall-joe-marker',
    html:
      '<div style="width:40px;height:40px;border-radius:50%;background:#FFC107;' +
      'display:flex;align-items:center;justify-content:center;font-size:22px;' +
      'box-shadow:0 2px 8px rgba(0,0,0,0.6);border:2px solid #fff;">🎙️</div>' +
      '<div style="text-align:center;font-size:11px;font-weight:bold;color:#FFC107;' +
      'text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-top:2px;">JOE</div>',
    iconSize: [40, 58],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

// The player on the map: a blue "YOU" disc with a person, not a pin —
// the pair reads as player + navitar walking together, Pokémon-Go
// buddy style. The navitar (72px) is the bigger of the two; the
// player disc is 44px.
const youIcon = L.divIcon({
  className: 'icewall-you-marker',
  html:
    '<div style="width:44px;height:44px;border-radius:50%;background:#2196f3;' +
    'display:flex;align-items:center;justify-content:center;font-size:24px;' +
    'box-shadow:0 2px 8px rgba(0,0,0,0.6);border:2px solid #fff;">🧍</div>' +
    '<div style="text-align:center;font-size:11px;font-weight:bold;color:#fff;' +
    'text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-top:2px;">YOU</div>',
  iconSize: [44, 62],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});

// Names come from player input in the create-navitar dialog, so they are
// escaped before going into the marker's HTML.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Companion marker — the player's navitar travelling with them, Pokémon-Go
// buddy style: circular crop of its art with a ring in its element colour,
// falling back to the element emoji when the navitar has no art. Art
// resolution prefers the navitar's own imageUrl (picked at creation),
// then the name map. The circle is 72px — big enough to read as the
// character itself, not a dot or a pin.
function companionIcon(navitar: { name: string; element: string; imageUrl?: string }) {
  const art = resolveNavitarArt(navitar.imageUrl, navitar.name);
  const color = elementColor(navitar.element);
  const inner = art
    ? `<img src="${art}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;">${elementEmoji(navitar.element)}</div>`;
  return L.divIcon({
    className: 'icewall-companion-marker',
    html:
      `<div style="width:72px;height:72px;border-radius:50%;border:4px solid ${color};` +
      `overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.6);background:#121212;">${inner}</div>` +
      `<div style="text-align:center;font-size:11px;font-weight:bold;color:#fff;` +
      `text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-top:2px;">${escapeHtml(navitar.name)}</div>`,
    iconSize: [72, 90],
    iconAnchor: [36, 36],
    popupAnchor: [0, -36],
  });
}

// Companion marker, positioned by SCREEN distance — not by degrees.
// A degree offset is ~8px on screen at zoom 11 and ~64px at zoom 14,
// so no degree offset can look right at both zooms: the old 0.007°
// offset let the 72px navitar circle completely cover the 44px player
// disc at the zoom-11 overview (verified in a real browser). The
// companion instead sits a fixed COMPANION_GAP_PX from the player,
// southeast (down-right on screen), recomputed from the map's own
// projection whenever the zoom or the player's position changes. The
// gap is 64px centre-to-centre: the player disc is 44px (22px radius)
// and the navitar circle is 72px (36px radius), so the pair clears by
// 6px and still reads as walking together at every zoom. Must live
// inside <MapContainer> (useMap); Leaflet zoom/pan events do not
// re-render React on their own, so the position lives in state and is
// refreshed on zoomend/moveend.
const COMPANION_GAP_PX = 64;
// Southeast at 45°: each axis gets gap / √2 so the diagonal screen
// distance is exactly COMPANION_GAP_PX.
const COMPANION_OFFSET_PX = COMPANION_GAP_PX / Math.SQRT2;

function CompanionMarker({
  playerPos,
  navitar,
  checkedInVenue,
}: {
  playerPos: [number, number];
  navitar: {
    name: string;
    element: string;
    imageUrl?: string;
    level: number;
    hp: number;
    maxHp: number;
  };
  checkedInVenue: DemoVenue | null;
}) {
  const map = useMap();
  const toCompanionLatLng = useCallback(
    (pos: [number, number]): [number, number] => {
      const point = map.latLngToLayerPoint(L.latLng(pos));
      const shifted = point.add(L.point(COMPANION_OFFSET_PX, COMPANION_OFFSET_PX));
      const ll = map.layerPointToLatLng(shifted);
      return [ll.lat, ll.lng];
    },
    [map]
  );
  const [companionPos, setCompanionPos] = useState<[number, number]>(() =>
    toCompanionLatLng(playerPos)
  );
  useEffect(() => {
    const update = () => setCompanionPos(toCompanionLatLng(playerPos));
    update();
    map.on('zoomend', update);
    map.on('moveend', update);
    return () => {
      map.off('zoomend', update);
      map.off('moveend', update);
    };
  }, [map, toCompanionLatLng, playerPos]);
  return (
    <Marker position={companionPos} icon={companionIcon(navitar)} zIndexOffset={0}>
      <Popup>
        <div>
          <strong>
            {elementEmoji(navitar.element)} {navitar.name}
          </strong>
          <br />
          Your companion · Lv. {navitar.level} · {navitar.element}
          <br />
          HP {navitar.hp}/{navitar.maxHp}
          {checkedInVenue && (
            <>
              <br />
              Checked in at {checkedInVenue.name}
            </>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// Round art thumb for the companion panel (collapsed chip + expanded
// header): the navitar's art via the same resolution as the companion
// marker, falling back to the element emoji when it has no art. The
// panel used to show a 🧭 compass emoji even when the navitar had a
// picked look — the marker and the panel should agree.
function CompanionThumb({
  navitar,
  size,
}: {
  navitar: { name: string; element: string; imageUrl?: string };
  size: number;
}) {
  const art = resolveNavitarArt(navitar.imageUrl, navitar.name);
  if (art) {
    return (
      <NavitarArtImg
        src={art}
        alt={`${navitar.name} art`}
        element={navitar.element}
        style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }}
      />
    );
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size >= 40 ? '1.4rem' : '1rem',
        bgcolor: 'rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}
      role="img"
      aria-label={`${navitar.name} art`}
    >
      {elementEmoji(navitar.element)}
    </Box>
  );
}

// Repaints Leaflet when the page layout changes around the map. The
// venue card opening below the map grows the page (and can change whether
// a scrollbar is present, which changes the map's width); without this
// the tiles stay painted for the old size and scrolling back up finds a
// blank map until a reload. ResizeObserver covers container size changes;
// the layoutKey effect covers opens/closes that don't resize the
// container itself. Must live inside <MapContainer> (useMap).
function MapAutoResize({ layoutKey }: { layoutKey: string }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map, layoutKey]);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

// Flies the map to a tapped place (venue row/marker, portal row) at a
// close zoom (~14) — the old behaviour left the map at whatever zoom
// it had (a scroll over the map can wheel-zoom it out to a continent
// view, and the zoom buttons only zoom, they don't re-center). The
// nonce makes re-tapping the same place fly again. Must live inside
// <MapContainer> (useMap).
function MapFlyTo({ target }: { target: { lat: number; lng: number; nonce: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], 14, { duration: 0.8 });
  }, [map, target]);
  return null;
}

// Frames the WHOLE demo map — all four venues plus both portals — in
// the initial view, whatever the screen width (fix, live audit
// 2026-11-12: the fixed center/zoom framed everything on a desktop
// but cut places off on phone widths). Runs once on mount; "Reset
// view" bumps resetSignal and frames everything again. Must live
// inside <MapContainer> (useMap) and under the RealmProvider.
function MapFitBounds({ resetSignal }: { resetSignal: number }) {
  const map = useMap();
  const { portals } = useRealm();
  const fittedRef = React.useRef(false);
  useEffect(() => {
    if (resetSignal === 0 && fittedRef.current) return;
    fittedRef.current = true;
    const points: [number, number][] = [
      ...DEMO_VENUES.map(v => [v.lat, v.lng] as [number, number]),
      ...portals.map(portal => [portal.location.lat, portal.location.lng] as [number, number]),
    ];
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), {
      // Asymmetric padding (fix, live run-through 2026-11-12): the
      // venue markers hang BELOW their latlng point — the venue icon
      // is 58px tall with its anchor 20px down, so 38px of marker
      // (the name label) extends past the point. The old uniform 28px
      // padding framed the POINTS but left the southernmost venue
      // (Santa Monica Beach) with its label half-clipped at the
      // bottom edge. Bottom padding now clears the full overhang
      // plus a margin; the other sides only need the icon's reach
      // above/beside the point.
      paddingTopLeft: [36, 36],
      paddingBottomRight: [36, 56],
    });
  }, [map, portals, resetSignal]);
  return null;
}

// FIND ME (fix, live audit 2026-11-12: the button appeared to do
// nothing wherever GPS was unavailable or denied — an alert at best).
// With GPS it flies to the real position, as before. Without it, the
// button still visibly does its job: it centers the map on where the
// player stands in the game — the checked-in venue, or home base
// where the player marker waits — and the parent shows a note saying
// GPS was unavailable, so the tap never reads as dead.
function LocateButton({
  onLocated,
  fallback,
  onFallback,
}: {
  onLocated: (lat: number, lng: number) => void;
  fallback: { lat: number; lng: number; label: string };
  onFallback: (label: string) => void;
}) {
  const map = useMap();
  const useFallback = () => {
    map.flyTo([fallback.lat, fallback.lng], 13);
    onFallback(fallback.label);
  };
  return (
    <Button
      variant="contained"
      color="primary"
      onClick={() => {
        if (!navigator.geolocation) {
          useFallback();
          return;
        }
        navigator.geolocation.getCurrentPosition(pos => {
          const { latitude, longitude } = pos.coords;
          onLocated(latitude, longitude);
          map.flyTo([latitude, longitude], 13);
        }, useFallback);
      }}
    >
      📍 Find me
    </Button>
  );
}

const RealmMapInner: React.FC = () => {
  const { portals, activePortal, setActivePortal } = useRealm();
  const { userNavitar, points, addVenueOpponent, addWildOpponent } = useNavitarFightClub();
  const { checkedInVenueId, checkIn, checkOut, venueWins, setPendingChallenge } = useVenue();
  const { businessContactIds, meetHandoff, clearMeetHandoff, getMatchReason } = usePresence();
  const navigate = useNavigate();
  const [you, setYou] = useState<[number, number] | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [meetPersonId, setMeetPersonId] = useState<string | null>(null);
  const [meetAnswerIdx, setMeetAnswerIdx] = useState<number | null>(null);
  const [showAccept, setShowAccept] = useState(false);
  // Wild confirm: the wild card's Challenge button opens this dialog
  // first (same pattern as the venue accept dialog) — challengeWild
  // only runs from its confirm button.
  const [showWildAccept, setShowWildAccept] = useState(false);
  // Tiles are a network dependency and can take ~5s to paint on first
  // load — show a loading state on the map area instead of a gray box
  // that reads as broken. The TileLayer 'load' event clears it; the
  // timeout is the backstop so it can never stick if the tile network
  // is slow or blocked.
  const [tilesLoaded, setTilesLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTilesLoaded(true), 10000);
    return () => clearTimeout(t);
  }, []);
  // Bumps when "Reset view" is clicked; MapFitBounds re-frames the
  // whole map (all venues + both portals).
  const [resetSignal, setResetSignal] = useState(0);
  // Where MapFlyTo should fly: set by venue rows/markers and portal
  // rows alike (the nonce re-flies a repeat tap on the same place).
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; nonce: number } | null>(
    null
  );
  // Shown under the map buttons after FIND ME falls back (no GPS):
  // names where the map centered, so the tap visibly did something.
  const [locateNote, setLocateNote] = useState<string | null>(null);
  // Companion panel collapse: the expanded panel can sit over a marker
  // area, so it collapses to a compact chip (name + HP mini-bar) that
  // can be tucked out of the way. Default is expanded, as before.
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  // Wild spawns: 5 random wild navitars at random map positions,
  // session-only (NOT persisted — wild spawns are ephemeral by design).
  // Reshuffled every WILD_RESHUFFLE_MS by the interval below.
  const [wildSpawns, setWildSpawns] = useState<WildSpawn[]>(() => pickWildSpawns());
  const [selectedWild, setSelectedWild] = useState<WildSpawn | null>(null);
  useEffect(() => {
    const t = setInterval(() => setWildSpawns(pickWildSpawns()), WILD_RESHUFFLE_MS);
    return () => clearInterval(t);
  }, []);
  // Refill stations: potion inventory + per-station cooldowns (persisted
  // in localStorage, see STATION_COOLDOWNS_KEY).
  const [potionCounts, setPotionCounts] = useState<PotionCounts>(() => getPotions());
  const [selectedStation, setSelectedStation] = useState<RefillStation | null>(null);
  // Joe's arena card — tapping his gold marker opens it (same Dialog
  // pattern as the refill station card).
  const [showJoe, setShowJoe] = useState(false);
  const [stationCooldowns, setStationCooldowns] = useState<Record<string, number>>(() =>
    loadStationCooldowns()
  );
  // Ticks the "Refills in M:SS" countdown on the open station card.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // Cooldown left on the open station card (0 = ready to collect).
  const selectedStationRemainingMs = selectedStation
    ? Math.max(0, (stationCooldowns[selectedStation.id] ?? 0) - nowMs)
    : 0;

  const selectedVenue = DEMO_VENUES.find(v => v.id === selectedVenueId) ?? null;
  const meetPerson: VenuePerson | null =
    selectedVenue?.people.find(p => p.id === meetPersonId) ?? null;
  // Who's Here respects each person's visibility from the player's
  // side (src/utils/presence.ts): invisible people never render,
  // business-visibility people render only for their business
  // contacts. Status does NOT hide anyone — a quiet person is still
  // physically here; their row just offers no intro (see the meet
  // card below).
  const visiblePeople: VenuePerson[] = selectedVenue
    ? selectedVenue.people.filter(p =>
        personVisibleToPlayer(p, { businessContactIds, friendIds: loadFriends() })
      )
    : [];
  const checkedInVenue = DEMO_VENUES.find(v => v.id === checkedInVenueId) ?? null;
  // Layout changes that should repaint the map (venue card open/close,
  // check-in/out, meet open/close) — see MapAutoResize.
  const layoutKey = `${selectedVenueId ?? 'none'}|${checkedInVenueId ?? 'none'}|${meetPersonId ?? 'none'}`;

  const center: [number, number] = LA_CENTER;

  // The companion travels beside the player, Pokémon-Go buddy style,
  // always a small step southeast of the player's position, so the pair
  // reads as player + navitar walking together — never stacked under
  // the player marker, and never moved to a checked-in venue. Check-in
  // is a status on the venue card, not a place the companion moves to.
  // The player's position is the GPS position when known, otherwise
  // the map's default center (home base). The gap is a fixed number of
  // SCREEN pixels, not a fixed number of degrees: a degree offset is
  // ~8px on screen at zoom 11 and ~64px at zoom 14, so the old 0.007°
  // offset let the 72px navitar circle completely cover the 44px
  // player disc at the zoom-11 overview (verified in a real browser).
  // See CompanionMarker for the projection math.
  const playerPos: [number, number] = you ?? center;

  const selectVenue = (venue: DemoVenue) => {
    setSelectedVenueId(venue.id);
    setMeetPersonId(null);
    setMeetAnswerIdx(null);
    setFlyTarget({ lat: venue.lat, lng: venue.lng, nonce: Date.now() });
  };

  // Tapping a portal ROW behaves like tapping a venue row (fix, live
  // audit 2026-11-12: portal rows only highlighted — the map never
  // moved): select the portal, fly to it, and bring the map into view.
  const selectPortalFromList = (portal: RealmPortal) => {
    setActivePortal(portal);
    setFlyTarget({ lat: portal.location.lat, lng: portal.location.lng, nonce: Date.now() });
    const mapEl = document.getElementById('realm-map');
    if (mapEl && typeof mapEl.scrollIntoView === 'function') {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Tapping a venue row also brings the map into view, so the fly-to the
  // row triggers is actually seen (the row lives below the map).
  const selectVenueFromList = (venue: DemoVenue) => {
    selectVenue(venue);
    const mapEl = document.getElementById('realm-map');
    if (mapEl && typeof mapEl.scrollIntoView === 'function') {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const openMeet = (person: VenuePerson) => {
    setMeetPersonId(person.id);
    setMeetAnswerIdx(null);
  };

  // Navitar icebreaker "Say hi" lands here: PresenceContext sets the
  // handoff (and navigates to /realm when the player was elsewhere);
  // the map opens that person's meet card, and the intro continues
  // exactly like a tap on their Who's Here row.
  useEffect(() => {
    if (!meetHandoff) return;
    const venue = DEMO_VENUES.find(v => v.id === meetHandoff.venueId);
    const person = venue?.people.find(p => p.id === meetHandoff.personId);
    if (venue && person) {
      selectVenue(venue);
      openMeet(person);
    }
    clearMeetHandoff();
    // selectVenue/openMeet are stable component-local setters; the
    // handoff object is the trigger.
  }, [meetHandoff]);

  // The demo person accepts, their navitar becomes a challengeable
  // opponent, and the Battle page gets it pre-selected. The challenge is
  // opt-in — nothing here starts a battle on its own.
  const acceptChallenge = () => {
    if (!meetPerson || !selectedVenue) return;
    const opponentId = addVenueOpponent({
      name: meetPerson.navitarName,
      element: meetPerson.navitarElement,
      level: meetPerson.navitarLevel,
      skills: meetPerson.navitarSkills,
      // The person's art travels with their navitar, so the stage
      // renders the image instead of the element emoji.
      imageUrl: meetPerson.navitarImage,
      // The person's 3D model travels too, when they have one — the
      // stage renders the live model instead of the 2D art.
      modelUrl: meetPerson.navitarModelUrl,
      modelZoom: meetPerson.navitarModelZoom,
    });
    setPendingChallenge(opponentId, selectedVenue.id);
    setShowAccept(false);
    navigate('/battle');
  };

  // A wild spawn is challenged DIRECTLY — no icebreaker, no venue. The
  // '' venue id means no venue win is recorded: NavitarBattle treats an
  // empty challengeVenueId as "no venue" (duelVenue looks up nothing, so
  // the stage shows the plain Battle Arena backdrop, and settleDuel
  // skips recordVenueWin). A win still banks level × 10 points via
  // completeBattle, like any duel.
  const challengeWild = () => {
    if (!selectedWild) return;
    const wild = selectedWild.wild;
    const opponentId = addWildOpponent({
      name: wild.name,
      element: wild.element,
      level: wild.level,
      skills: wild.skills,
      imageUrl: wild.imageUrl,
    });
    setPendingChallenge(opponentId, '');
    setShowWildAccept(false);
    setSelectedWild(null);
    navigate('/battle');
  };

  // Collecting grants 2–3 potions as a random mix of the three types,
  // then the station goes on a 5-minute cooldown (persisted per station
  // in localStorage, so a reload doesn't reset it).
  const collectFromStation = (station: RefillStation) => {
    const total = 2 + Math.floor(Math.random() * 2);
    const grant: Partial<PotionCounts> = {};
    const ids: PotionId[] = ['health', 'recharge', 'power'];
    for (let i = 0; i < total; i++) {
      const id = ids[Math.floor(Math.random() * ids.length)];
      grant[id] = (grant[id] ?? 0) + 1;
    }
    setPotionCounts(grantPotions(grant));
    const until = Date.now() + STATION_COOLDOWN_MS;
    setStationCooldowns(prev => {
      const next = { ...prev, [station.id]: until };
      try {
        localStorage.setItem(STATION_COOLDOWNS_KEY, JSON.stringify(next));
      } catch {
        // Private mode / quota: the cooldown still holds for this session.
      }
      return next;
    });
  };

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Realm Map
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Portals are where Navitars gather and battles happen. Tap a portal to see it — demo portals
        are in Los Angeles until real ones are placed. The demo venues below are where you check in
        and meet people: the bars are fictional demo names, the park and beach are public places.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {portals.length} portal{portals.length === 1 ? '' : 's'} on this map ·{' '}
          {DEMO_VENUES.length} demo venues · {REFILL_STATIONS.length} refill stations
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        🌿 Wild navitars roam the map — new ones appear every couple of minutes. Tap one to
        challenge it. 🧪 Tap a refill station to collect potions. 🎙️ Joe&apos;s arena sits near the
        Observatory — tap his gold marker to challenge the Impossible Challenger.
      </Typography>

      <Paper id="realm-map" sx={{ height: 480, overflow: 'hidden', mb: 3 }}>
        <MapContainer
          center={center}
          zoom={LA_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <MapAutoResize layoutKey={layoutKey} />
          <MapFitBounds resetSignal={resetSignal} />
          <MapFlyTo target={flyTarget} />
          {/* LocateButton must live inside MapContainer: its useMap() hook
              throws ("useLeafletContext() can only be used in a descendant
              of <MapContainer>") when rendered outside it, and that throw
              unmounted the whole app — the /realm black screen. */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 500,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'flex-end',
            }}
          >
            <LocateButton
              onLocated={(lat, lng) => {
                setYou([lat, lng]);
                setLocateNote(null);
              }}
              fallback={
                checkedInVenue
                  ? {
                      lat: checkedInVenue.lat,
                      lng: checkedInVenue.lng,
                      label: checkedInVenue.name,
                    }
                  : { lat: playerPos[0], lng: playerPos[1], label: 'your home base' }
              }
              onFallback={label => setLocateNote(`📍 Centered on ${label} — GPS unavailable.`)}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => setResetSignal(s => s + 1)}
              sx={{ bgcolor: 'rgba(18,18,18,0.85)' }}
            >
              Reset view
            </Button>
            {locateNote && (
              <Paper sx={{ px: 1.5, py: 0.75, bgcolor: 'rgba(18,18,18,0.85)', maxWidth: 240 }}>
                <Typography variant="caption">{locateNote}</Typography>
              </Paper>
            )}
          </div>
          {/* Tile loading state — the map area shows this instead of a
              gray box while the OpenStreetMap tiles paint. */}
          {!tilesLoaded && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
                zIndex: 600,
                pointerEvents: 'none',
              }}
            >
              <Paper sx={{ px: 2, py: 1, bgcolor: 'rgba(18,18,18,0.85)' }}>
                <Typography variant="body2">Loading map…</Typography>
              </Paper>
            </div>
          )}
          {/* Companion panel — the player's navitar, or a prompt to create
              one. Plain overlay (no Leaflet hooks), same pattern as the
              LocateButton above. It sits bottom-left on purpose: the
              Leaflet zoom controls live top-left, Find me is top-right,
              attribution is bottom-right, and both portal markers sit at
              map center — bottom-left is the only corner that covers none
              of them. (It used to be top-left, where it clipped the zoom
              buttons and hid the Blaze Gate marker.) */}
          <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 500 }}>
            {userNavitar ? (
              panelCollapsed ? (
                <Paper
                  sx={{
                    p: 1,
                    bgcolor: 'rgba(18,18,18,0.88)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CompanionThumb navitar={userNavitar} size={28} />
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                    {userNavitar.name}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(userNavitar.hp / userNavitar.maxHp) * 100}
                    sx={{ width: 60, height: 8, borderRadius: 4 }}
                  />
                  <Button
                    component={RouterLink}
                    to="/ar"
                    size="small"
                    sx={{ minWidth: 0, px: 1 }}
                    aria-label="See your navitar in AR"
                  >
                    📷
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setPanelCollapsed(false)}
                    sx={{ minWidth: 0, px: 1 }}
                    aria-label="Expand companion panel"
                  >
                    +
                  </Button>
                </Paper>
              ) : (
                <Paper sx={{ p: 1.5, minWidth: 220, bgcolor: 'rgba(18,18,18,0.88)' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CompanionThumb navitar={userNavitar} size={40} />
                      <Typography variant="subtitle2">Companion — {userNavitar.name}</Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={() => setPanelCollapsed(true)}
                      sx={{ minWidth: 0, px: 1 }}
                      aria-label="Collapse companion panel"
                    >
                      −
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Lv. {userNavitar.level} · {userNavitar.element} · {points} pts
                  </Typography>
                  {checkedInVenue && (
                    <Typography variant="body2" color="text.secondary">
                      Checked in at {checkedInVenue.name}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                      HP {userNavitar.hp}/{userNavitar.maxHp}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(userNavitar.hp / userNavitar.maxHp) * 100}
                      sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  {/* AR entry point: the map is where the "your navitar
                      in the world" idea lives, so the companion panel
                      is the natural place to step into the camera view. */}
                  <Button
                    component={RouterLink}
                    to="/ar"
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    📷 See in AR
                  </Button>
                </Paper>
              )
            ) : (
              <Paper sx={{ p: 1.5, minWidth: 220, bgcolor: 'rgba(18,18,18,0.88)' }}>
                <Typography variant="subtitle2" gutterBottom>
                  🧭 No companion yet
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Create a Navitar and it will travel with you on the map.
                </Typography>
                <Button component={RouterLink} to="/battle" variant="contained" size="small">
                  Create your Navitar
                </Button>
                <Button
                  component={RouterLink}
                  to="/ar"
                  variant="outlined"
                  size="small"
                  sx={{ ml: 1 }}
                >
                  AR View
                </Button>
              </Paper>
            )}
          </div>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{ load: () => setTilesLoaded(true) }}
          />
          {portals.map((portal: RealmPortal) => (
            <Marker
              key={portal.id}
              position={[portal.location.lat, portal.location.lng]}
              icon={portalIcon(portal.type)}
              eventHandlers={{ click: () => setActivePortal(portal) }}
            >
              <Popup>
                <div>
                  <strong>
                    {PORTAL_EMOJI[portal.type] || '🌀'} {portal.name}
                  </strong>
                  <br />
                  Type: {portal.type} · Level {portal.level}
                  <br />
                  {portal.isActive ? 'Active' : 'Inactive'}
                  {portal.specialFusion && (
                    <>
                      <br />
                      Fusion: {portal.specialFusion.fusionName} ({portal.specialFusion.energyCost}{' '}
                      energy)
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          {DEMO_VENUES.map(venue => (
            <Marker
              key={venue.id}
              position={[venue.lat, venue.lng]}
              icon={venueIcon(venue)}
              eventHandlers={{ click: () => selectVenue(venue) }}
            >
              <Popup>
                <div>
                  <strong>
                    {VENUE_EMOJI[venue.kind]} {venue.name}
                  </strong>
                  <br />
                  {venue.area} · {venue.tagline}
                  <br />
                  Tap the venue card below for perks &amp; who&apos;s here.
                </div>
              </Popup>
            </Marker>
          ))}
          {/* Wild spawns — tapping one opens the challenge card. */}
          {wildSpawns.map(spawn => (
            <Marker
              key={spawn.id}
              position={[spawn.lat, spawn.lng]}
              icon={wildIcon(spawn.wild)}
              eventHandlers={{ click: () => setSelectedWild(spawn) }}
            />
          ))}
          {/* Refill stations — tapping one opens the station card. */}
          {REFILL_STATIONS.map(station => (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={stationIcon(station)}
              eventHandlers={{ click: () => setSelectedStation(station) }}
            >
              <Popup>
                <div>
                  <strong>🧪 {station.name}</strong>
                  <br />
                  Refill station · {station.kind ?? 'supplies'}
                  <br />
                  Tap the station card below to collect potions.
                </div>
              </Popup>
            </Marker>
          ))}
          {/* Joe's arena — the Impossible Challenger's stage, by the
              Observatory. Tapping it opens his card; the duel itself
              is a boss fight in the Battle Arena (no quiz — scrapped
              2026-11-12). */}
          {/* zIndexOffset keeps Joe's marker above the venue/wild/
              station markers (default 0) so the first tap is never
              blocked by a marker sitting on top of it — still below
              the player disc (1000). */}
          <Marker
            position={JOE_ARENA}
            icon={joeIcon()}
            zIndexOffset={900}
            eventHandlers={{ click: () => setShowJoe(true) }}
          >
            <Popup>
              <div>
                <strong>🎙️ Joe — Judge &amp; Announcer</strong>
                <br />
                The Impossible Challenger
                <br />
                Tap the card below to take him on.
              </div>
            </Popup>
          </Marker>
          {/* The player marker always stands at the player's position
              (GPS when known, home base otherwise) so the pair reads as
              player + navitar together, not a lone navitar. */}
          {/* zIndexOffset keeps the player disc on top of the companion
              circle even if the two ever overlap — the player is never
              hidden behind their own navitar. */}
          <Marker position={playerPos} icon={youIcon} zIndexOffset={1000}>
            <Popup>
              <div>
                <strong>You are here</strong>
              </div>
            </Popup>
          </Marker>
          {userNavitar && (
            <CompanionMarker
              playerPos={playerPos}
              navitar={userNavitar}
              checkedInVenue={checkedInVenue}
            />
          )}
        </MapContainer>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Demo venues — bars, parks &amp; beaches
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Demo venues only. The bars are fictional names; the park and beach are public places. Check
        in, meet someone, battle if you choose.
      </Typography>
      {DEMO_VENUES.map(venue => (
        <Paper
          key={venue.id}
          sx={{
            p: 2,
            mb: 1,
            cursor: 'pointer',
            border: selectedVenueId === venue.id ? '2px solid #2196f3' : '1px solid transparent',
          }}
          onClick={() => selectVenueFromList(venue)}
        >
          <Typography variant="subtitle1">
            {VENUE_EMOJI[venue.kind]} {venue.name} <Chip label="DEMO" size="small" sx={{ ml: 1 }} />
            <Chip label={venue.kind} size="small" sx={{ ml: 1 }} />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {venue.area} · {venue.tagline} ·{' '}
            {/* The count follows the same visibility rules as Who's
            Here — an invisible person must not leak through it (live
            nit 2026-11-13: Griffith Park read "3 people here" while
            only 2 render, because Rosa is invisible). */}
            {
              venue.people.filter(p =>
                personVisibleToPlayer(p, { businessContactIds, friendIds: loadFriends() })
              ).length
            }{' '}
            people here
            {checkedInVenueId === venue.id ? ' · You are checked in here' : ''}
          </Typography>
        </Paper>
      ))}

      {selectedVenue && (
        <Paper sx={{ p: 3, mt: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {VENUE_EMOJI[selectedVenue.kind]} {selectedVenue.name}{' '}
            <Chip label="DEMO" size="small" />
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {selectedVenue.area} · {selectedVenue.tagline} · {selectedVenue.hours}
          </Typography>

          {checkedInVenueId === selectedVenue.id ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                ✅ You&apos;re checked in at {selectedVenue.name}
              </Typography>
              <Button variant="outlined" onClick={checkOut}>
                Check out
              </Button>
            </Box>
          ) : userNavitar ? (
            <Box sx={{ mb: 2 }}>
              <Button variant="contained" onClick={() => checkIn(selectedVenue.id)}>
                Check in
              </Button>
            </Box>
          ) : (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                You need a Navitar before you can check in — it travels with you.
              </Typography>
              <Button component={RouterLink} to="/battle" variant="contained">
                Create your Navitar
              </Button>
            </Box>
          )}

          <Typography variant="subtitle1" gutterBottom>
            Perks
          </Typography>
          {selectedVenue.perks.map(perk => {
            const unlocked =
              perk.unlocksOn === 'checkin'
                ? checkedInVenueId === selectedVenue.id
                : venueWins.includes(selectedVenue.id);
            return (
              <Typography key={perk.text} variant="body2" color="text.secondary" paragraph>
                {unlocked ? '✅ ' : '🔒 '}
                {perk.text}
                {unlocked
                  ? ' — unlocked (demo, show this screen)'
                  : perk.unlocksOn === 'checkin'
                    ? ' — check in to unlock'
                    : ' — win a battle here to unlock'}
              </Typography>
            );
          })}

          {checkedInVenueId === selectedVenue.id && (
            <>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Your networking
              </Typography>
              <VenueNetworkingStrip />
            </>
          )}

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Who&apos;s here
          </Typography>
          {visiblePeople.length === 0 && (
            <Typography variant="body2" color="text.secondary" paragraph>
              Nobody else is visible here right now.
            </Typography>
          )}
          {visiblePeople.map(person => (
            <Paper
              key={person.id}
              sx={{
                p: 2,
                mb: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                border: meetPersonId === person.id ? '2px solid #2196f3' : '1px solid transparent',
              }}
              onClick={() => openMeet(person)}
            >
              <PersonThumb person={person} size={48} borderWidth={2} />
              <Box>
                <Typography variant="subtitle1">
                  {person.name} · {person.navitarName} (Lv. {person.navitarLevel} ·{' '}
                  {person.navitarElement})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {person.vibe}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                  <PersonStatusChip status={person.networkingStatus} />
                  {person.visibility === 'business' && (
                    <Chip label="Business contact" size="small" color="primary" />
                  )}
                  {/* Match context (Part 5): the strongest reason to
                      talk to this person. The chip never overrides
                      presence — a quiet person's intro stays blocked
                      in the meet card, and dating never chips for a
                      quiet person (getMatchReason enforces both). */}
                  {(() => {
                    const reason = getMatchReason(person);
                    return reason ? (
                      <Chip
                        label={reason.label}
                        size="small"
                        color="secondary"
                        data-testid={`match-chip-${person.id}`}
                        data-match-kind={reason.kind}
                      />
                    ) : null;
                  })()}
                </Box>
              </Box>
            </Paper>
          ))}

          {meetPerson && (
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'rgba(33,150,243,0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <PersonThumb person={meetPerson} size={72} borderWidth={3} />
                <Box>
                  <Typography variant="h6">Meet {meetPerson.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {meetPerson.vibe} · Their navitar: {meetPerson.navitarName} (Lv.{' '}
                    {meetPerson.navitarLevel} · {meetPerson.navitarElement})
                  </Typography>
                </Box>
              </Box>
              {meetPerson.networkingStatus === 'quiet' ? (
                // Quiet means no new intros: the icebreaker is not
                // offered at all. Battles are a different flow and
                // stay available below, exactly as for anyone else.
                <Typography variant="body1" gutterBottom>
                  🤫 {meetPerson.name} is keeping it quiet — no new intros right now, but thanks for
                  stopping by.
                </Typography>
              ) : (
                <>
                  <Typography variant="body1" gutterBottom>
                    {meetPerson.icebreakerQuestion}
                  </Typography>
                  {meetPerson.icebreakerAnswers.map((answer, idx) => (
                    <Button
                      key={answer.label}
                      variant={meetAnswerIdx === idx ? 'contained' : 'outlined'}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                      disabled={meetAnswerIdx !== null}
                      onClick={() => {
                        setMeetAnswerIdx(idx);
                        // Picking an answer means the player actually met
                        // this person — that is what makes them a friend
                        // (Profile reads this list). Only on an actual
                        // answer pick, not on opening the card.
                        recordMetFriend(meetPerson.id);
                        // The icebreaker exchange becomes the thread's
                        // first three messages (question, chosen answer,
                        // their reply) — the Messages page reads it from
                        // the same store. No-op when the thread exists.
                        seedPersonThread(meetPerson, answer.label, answer.reply);
                      }}
                    >
                      {answer.label}
                    </Button>
                  ))}
                </>
              )}
              {meetAnswerIdx === null && (
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => setShowAccept(true)}
                >
                  Challenge now — skip the icebreaker
                </Button>
              )}
              {meetAnswerIdx !== null && (
                <>
                  <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                    {meetPerson.name}: “{meetPerson.icebreakerAnswers[meetAnswerIdx].reply}”
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    sx={{ mr: 1 }}
                    onClick={() => setShowAccept(true)}
                  >
                    Challenge to a battle
                  </Button>
                  <Button variant="outlined" sx={{ mr: 1 }} onClick={() => setShowAccept(true)}>
                    Challenge now
                  </Button>
                  <Button variant="outlined" onClick={() => setMeetPersonId(null)}>
                    Maybe later
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/messages?thread=${personThreadId(meetPerson.id)}`)}
                  >
                    Continue in Messages →
                  </Button>
                </>
              )}
            </Paper>
          )}

          <Dialog open={showAccept} onClose={() => setShowAccept(false)}>
            <DialogTitle>They accepted!</DialogTitle>
            <DialogContent>
              <Typography variant="body1">
                {meetPerson?.name} accepted your challenge — {meetPerson?.navitarName} is ready. The
                battle is opt-in on both sides; a loss costs nothing.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowAccept(false)}>Not yet</Button>
              <Button variant="contained" onClick={acceptChallenge}>
                To the Battle Arena
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      )}

      {/* Wild spawn card — a direct challenge, no icebreaker. Same
          Dialog pattern as the venue accept dialog. */}
      <Dialog open={selectedWild !== null} onClose={() => setSelectedWild(null)}>
        {selectedWild && (
          <>
            <DialogTitle>🌿 Wild {selectedWild.wild.name} appeared!</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <NavitarArtImg
                  src={selectedWild.wild.imageUrl}
                  alt={`${selectedWild.wild.name} art`}
                  element={selectedWild.wild.element}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    border: `3px solid ${elementColor(selectedWild.wild.element)}`,
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography variant="h6">{selectedWild.wild.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lv. {selectedWild.wild.level} wild navitar
                  </Typography>
                  <Chip label={selectedWild.wild.element} size="small" sx={{ mt: 0.5 }} />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Type: {selectedWild.wild.element} · Fast move:{' '}
                {selectedWild.wild.skills[0] ?? 'Quick Attack'}
              </Typography>
              <Typography variant="body1">
                A wild navitar is roaming the map. Challenge it now — a win banks Lv. × 10 points,
                just like a venue duel, but no venue win is recorded.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedWild(null)}>Maybe later</Button>
              <Button variant="contained" color="secondary" onClick={() => setShowWildAccept(true)}>
                Challenge
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Wild accept dialog — mirrors the venue "They accepted!" dialog:
          the wild navitar accepted the challenge, and only the confirm
          button runs challengeWild (same '' venue id = no venue win). */}
      <Dialog
        open={showWildAccept && selectedWild !== null}
        onClose={() => setShowWildAccept(false)}
      >
        {selectedWild && (
          <>
            <DialogTitle>It accepted!</DialogTitle>
            <DialogContent>
              <Typography variant="body1">
                {selectedWild.wild.name} accepted your challenge — the wild navitar is ready to
                battle. A loss costs nothing.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowWildAccept(false)}>Not yet</Button>
              <Button variant="contained" onClick={challengeWild}>
                To the Battle Arena
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Refill station card — collect potions, then the station cools
          down for 5 minutes. The inventory counts are the live stash. */}
      <Dialog open={selectedStation !== null} onClose={() => setSelectedStation(null)}>
        {selectedStation && (
          <>
            <DialogTitle>
              🧪 {selectedStation.name} <Chip label="DEMO" size="small" sx={{ ml: 1 }} />
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedStation.blurb}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Your potions: {POTIONS.health.emoji} Health ×{potionCounts.health} ·{' '}
                {POTIONS.recharge.emoji} Recharge ×{potionCounts.recharge} · {POTIONS.power.emoji}{' '}
                Power ×{potionCounts.power}
              </Typography>
              {selectedStationRemainingMs > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Refills in {formatCooldownMs(selectedStationRemainingMs)}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Ready to collect — 2–3 potions, a random mix of the three kinds.
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedStation(null)}>Close</Button>
              <Button
                variant="contained"
                onClick={() => collectFromStation(selectedStation)}
                disabled={selectedStationRemainingMs > 0}
              >
                Collect potions
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Joe's arena card — the Impossible Challenger. Same Dialog
          pattern as the refill station card: one line in his voice,
          then the challenge is opt-in. The duel itself is a real boss
          FIGHT through the normal battle flow (the quiz is scrapped):
          this hands Joe over as a pending challenge, and the Battle
          page lands on the approve → START BATTLE steps with him
          pre-selected — nothing auto-starts here either. */}
      <Dialog open={showJoe} onClose={() => setShowJoe(false)}>
        <DialogTitle>🎙️ Joe — Judge &amp; Announcer</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            “{JOE_INTRO[0]}”
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No quiz — a straight fight. Joe&apos;s navitar is Lv. 30, the strongest in the arena,
            and beating him earns the title of Joe&apos;s Champion. Bring your best navitar; a loss
            costs nothing.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowJoe(false)}>Maybe later</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              setPendingChallenge(JOE_OPPONENT_ID, '');
              setShowJoe(false);
              navigate('/battle');
            }}
          >
            To the Battle Arena
          </Button>
        </DialogActions>
      </Dialog>

      <Typography variant="h6" gutterBottom>
        Portals
      </Typography>
      {portals.map((portal: RealmPortal) => (
        <Paper
          key={portal.id}
          sx={{
            p: 2,
            mb: 1,
            cursor: 'pointer',
            border: activePortal?.id === portal.id ? '2px solid #2196f3' : '1px solid transparent',
          }}
          onClick={() => selectPortalFromList(portal)}
        >
          <Typography variant="subtitle1">
            {PORTAL_EMOJI[portal.type] || '🌀'} {portal.name} — Level {portal.level}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {portal.type} portal · {portal.isActive ? 'Active' : 'Inactive'}
            {portal.specialFusion ? ` · Fuses into ${portal.specialFusion.fusionName}` : ''}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
};

// useRealm throws outside a RealmProvider, so the page wraps itself.
const RealmMap: React.FC = () => {
  return (
    <RealmProvider>
      <RealmMapInner />
    </RealmProvider>
  );
};

export default RealmMap;
