import React from 'react';
import { GoogleMap, Circle, useLoadScript } from '@react-google-maps/api';
import { useRealm } from '../contexts/RealmContext';
import { useLocation } from '../contexts/LocationContext';
import { Box, Typography, Paper } from '@mui/material';

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const getPortalColor = (type: string): string => {
  switch (type) {
    case 'ice': return '#00ffff';
    case 'fire': return '#ff4400';
    case 'nature': return '#00ff44';
    case 'shadow': return '#440044';
    case 'light': return '#ffff00';
    default: return '#ffffff';
  }
};

export const RealmMap: React.FC = () => {
  const { portals, setActivePortal } = useRealm();
  const { location } = useLocation();
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''
  });

  if (loadError) {
    return (
      <Paper sx={{ p: 2, m: 2 }}>
        <Typography color="error">
          Error loading maps
        </Typography>
      </Paper>
    );
  }

  if (!isLoaded) {
    return (
      <Paper sx={{ p: 2, m: 2 }}>
        <Typography>
          Loading maps...
        </Typography>
      </Paper>
    );
  }

  const center = location || {
    lat: 40.7128,
    lng: -74.0060
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Realm Portals
      </Typography>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={13}
        center={center}
      >
        {portals.map(portal => (
          <Circle
            key={portal.id}
            center={portal.position}
            radius={portal.radius}
            options={{
              fillColor: getPortalColor(portal.type),
              fillOpacity: 0.3,
              strokeColor: getPortalColor(portal.type),
              strokeOpacity: 0.8,
              strokeWeight: 2,
              clickable: true
            }}
            onClick={() => setActivePortal(portal)}
          />
        ))}
      </GoogleMap>
    </Box>
  );
}; 