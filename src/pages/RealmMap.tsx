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

import React, { useEffect, useState } from 'react';
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
import { useNavitarFightClub } from '../contexts/NavitarFightClub';
import { useVenue } from '../contexts/VenueContext';
import { DEMO_VENUES, DemoVenue, VenueKind, VenuePerson } from '../data/venues';
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

const youIcon = L.divIcon({
  className: 'icewall-you-marker',
  html: '<div style="font-size:28px;line-height:1;text-shadow:0 2px 6px rgba(0,0,0,0.6);">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
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
// then the name map.
function companionIcon(navitar: { name: string; element: string; imageUrl?: string }) {
  const art = resolveNavitarArt(navitar.imageUrl, navitar.name);
  const color = elementColor(navitar.element);
  const inner = art
    ? `<img src="${art}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;">${elementEmoji(navitar.element)}</div>`;
  return L.divIcon({
    className: 'icewall-companion-marker',
    html:
      `<div style="width:48px;height:48px;border-radius:50%;border:3px solid ${color};` +
      `overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.6);background:#121212;">${inner}</div>` +
      `<div style="text-align:center;font-size:11px;font-weight:bold;color:#fff;` +
      `text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-top:2px;">${escapeHtml(navitar.name)}</div>`,
    iconSize: [48, 66],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
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

// Flies the map to the selected venue at a close zoom (~14) when a venue
// row or marker is tapped — the old behaviour left the map at whatever
// zoom it had (a scroll over the map can wheel-zoom it out to a
// continent view, and the zoom buttons only zoom, they don't re-center).
// resetSignal bumps when "Reset view" is clicked and flies back to the
// LA overview. Must live inside <MapContainer> (useMap).
function MapFlyTo({
  lat,
  lng,
  resetSignal,
}: {
  lat: number | null;
  lng: number | null;
  resetSignal: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (lat === null || lng === null) return;
    map.flyTo([lat, lng], 14, { duration: 0.8 });
  }, [map, lat, lng]);
  useEffect(() => {
    if (resetSignal === 0) return;
    map.flyTo(LA_CENTER, LA_ZOOM, { duration: 0.8 });
  }, [map, resetSignal]);
  return null;
}

function LocateButton({ onLocated }: { onLocated: (lat: number, lng: number) => void }) {
  const map = useMap();
  return (
    <Button
      variant="contained"
      color="primary"
      onClick={() => {
        if (!navigator.geolocation) {
          alert('Location is not supported by this browser.');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude, longitude } = pos.coords;
            onLocated(latitude, longitude);
            map.flyTo([latitude, longitude], 13);
          },
          () => alert('Could not get your location. Check location permission and try again.')
        );
      }}
    >
      📍 Find me
    </Button>
  );
}

const RealmMapInner: React.FC = () => {
  const { portals, activePortal, setActivePortal } = useRealm();
  const { userNavitar, points, addVenueOpponent } = useNavitarFightClub();
  const { checkedInVenueId, checkIn, checkOut, venueWins, setPendingChallenge } = useVenue();
  const navigate = useNavigate();
  const [you, setYou] = useState<[number, number] | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [meetPersonId, setMeetPersonId] = useState<string | null>(null);
  const [meetAnswerIdx, setMeetAnswerIdx] = useState<number | null>(null);
  const [showAccept, setShowAccept] = useState(false);
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
  // Bumps when "Reset view" is clicked; MapFlyTo flies back to LA.
  const [resetSignal, setResetSignal] = useState(0);
  // Companion panel collapse: the expanded panel can sit over a marker
  // area, so it collapses to a compact chip (name + HP mini-bar) that
  // can be tucked out of the way. Default is expanded, as before.
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const selectedVenue = DEMO_VENUES.find(v => v.id === selectedVenueId) ?? null;
  const meetPerson: VenuePerson | null =
    selectedVenue?.people.find(p => p.id === meetPersonId) ?? null;
  const checkedInVenue = DEMO_VENUES.find(v => v.id === checkedInVenueId) ?? null;
  // Layout changes that should repaint the map (venue card open/close,
  // check-in/out, meet open/close) — see MapAutoResize.
  const layoutKey = `${selectedVenueId ?? 'none'}|${checkedInVenueId ?? 'none'}|${meetPersonId ?? 'none'}`;

  const center: [number, number] = LA_CENTER;

  // The companion travels with the player: at the checked-in venue when
  // checked in, at the GPS position when known, otherwise at the map's
  // default center (home base). When checked in it sits slightly
  // northeast of the venue marker (~0.004 deg ≈ 5px at zoom 11, ~50px
  // at zoom 14): at the venue's exact coords it stacked under the venue
  // marker (and under the portal marker when the venue is near a
  // portal), so three icons read as one. The offset is small on
  // purpose — the companion is still visibly AT the venue.
  const companionPos: [number, number] = checkedInVenue
    ? [checkedInVenue.lat + 0.004, checkedInVenue.lng + 0.004]
    : (you ?? center);

  const selectVenue = (venue: DemoVenue) => {
    setSelectedVenueId(venue.id);
    setMeetPersonId(null);
    setMeetAnswerIdx(null);
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
          {DEMO_VENUES.length} demo venues
        </Typography>
      </Box>

      <Paper id="realm-map" sx={{ height: 480, overflow: 'hidden', mb: 3 }}>
        <MapContainer
          center={center}
          zoom={LA_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <MapAutoResize layoutKey={layoutKey} />
          <MapFlyTo
            lat={selectedVenue?.lat ?? null}
            lng={selectedVenue?.lng ?? null}
            resetSignal={resetSignal}
          />
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
            <LocateButton onLocated={(lat, lng) => setYou([lat, lng])} />
            <Button
              variant="outlined"
              size="small"
              onClick={() => setResetSignal(s => s + 1)}
              sx={{ bgcolor: 'rgba(18,18,18,0.85)' }}
            >
              Reset view
            </Button>
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
          {you && (
            <Marker position={you} icon={youIcon}>
              <Popup>
                <div>
                  <strong>You are here</strong>
                </div>
              </Popup>
            </Marker>
          )}
          {userNavitar && (
            <Marker position={companionPos} icon={companionIcon(userNavitar)}>
              <Popup>
                <div>
                  <strong>
                    {elementEmoji(userNavitar.element)} {userNavitar.name}
                  </strong>
                  <br />
                  Your companion · Lv. {userNavitar.level} · {userNavitar.element}
                  <br />
                  HP {userNavitar.hp}/{userNavitar.maxHp}
                  {checkedInVenue && (
                    <>
                      <br />
                      Checked in at {checkedInVenue.name}
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
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
            {venue.area} · {venue.tagline} · {venue.people.length} people here
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

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Who&apos;s here
          </Typography>
          {selectedVenue.people.map(person => (
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
                  onClick={() => setMeetAnswerIdx(idx)}
                >
                  {answer.label}
                </Button>
              ))}
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
                  <Button variant="outlined" onClick={() => setMeetPersonId(null)}>
                    Maybe later
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
          onClick={() => setActivePortal(portal)}
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
