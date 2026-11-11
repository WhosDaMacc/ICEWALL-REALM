// Realm Map page — real interactive map built with Leaflet + OpenStreetMap.
// No API key, no billing. Tiles are (c) OpenStreetMap contributors.
//
// Portals come from RealmContext (useRealm). The demo portals live in New
// York; give a portal a real lat/lng when it is created and it shows up
// here automatically. The old Google-Maps component
// (src/components/RealmMap.tsx) is kept untouched — it needs
// @react-google-maps/api and a Google API key that this repo does not have.

import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, Paper, Button } from '@mui/material';
import { RealmProvider, useRealm, RealmPortal } from '../contexts/RealmContext';

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

function portalIcon(type: string) {
  return L.divIcon({
    className: 'icewall-portal-marker',
    html: `<div style="font-size:28px;line-height:1;text-shadow:0 2px 6px rgba(0,0,0,0.6);">${PORTAL_EMOJI[type] || '🌀'}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

const youIcon = L.divIcon({
  className: 'icewall-you-marker',
  html: '<div style="font-size:28px;line-height:1;text-shadow:0 2px 6px rgba(0,0,0,0.6);">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

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
  const [you, setYou] = useState<[number, number] | null>(null);

  const center: [number, number] =
    portals.length > 0 ? [portals[0].location.lat, portals[0].location.lng] : [34.117, -118.35];

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Realm Map
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Portals are where Navitars gather and battles happen. Tap a portal to see it — demo portals
        are in New York until real ones are placed.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {portals.length} portal{portals.length === 1 ? '' : 's'} on this map
        </Typography>
      </Box>

      <Paper sx={{ height: 480, overflow: 'hidden', mb: 3 }}>
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          {/* LocateButton must live inside MapContainer: its useMap() hook
              throws ("useLeafletContext() can only be used in a descendant
              of <MapContainer>") when rendered outside it, and that throw
              unmounted the whole app — the /realm black screen. */}
          <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 500 }}>
            <LocateButton onLocated={(lat, lng) => setYou([lat, lng])} />
          </div>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
          {you && (
            <Marker position={you} icon={youIcon}>
              <Popup>
                <div>
                  <strong>You are here</strong>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </Paper>

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
