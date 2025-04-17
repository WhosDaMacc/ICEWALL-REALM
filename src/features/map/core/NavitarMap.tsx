import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Paper, 
  Chip, 
  Badge,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  List,
  ListItem,
  Divider,
  Button,
  Fab
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { GoogleMap, LoadScript, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { useLocation } from '../contexts/LocationContext';
import { useNavitar } from '../contexts/NavitarContext';
import MenuIcon from '@mui/icons-material/Menu';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import PortalIcon from '@mui/icons-material/Portal';
import MapIcon from '@mui/icons-material/Map';
import { useNavigate } from 'react-router-dom';

interface MapStyles {
  width: string;
  height: string;
}

interface MapLocation {
  lat: number;
  lng: number;
}

interface MapMarker {
  id: string;
  position: MapLocation;
  type: 'business' | 'hotspot' | 'wild_navitar' | 'user_navitar';
  title: string;
  description?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  reward?: number;
  icon?: string;
}

interface RealmPortal {
  id: string;
  position: MapLocation;
  name: string;
  type: 'ice' | 'fire' | 'nature' | 'cosmic';
  radius: number;
  activeUsers: number;
  powerLevel: number;
}

const mapStyles: MapStyles = {
  width: '100%',
  height: '100vh'
};

const MapOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  left: theme.spacing(2),
  right: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3],
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  zIndex: 1
}));

const NavigationMenu = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  left: theme.spacing(2),
  zIndex: 1
}));

const ARButton = styled(Fab)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(12),
  right: theme.spacing(2),
  zIndex: 1
}));

const MarkerInfo = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  maxWidth: 300,
  '& .MuiTypography-root': {
    marginBottom: theme.spacing(1)
  }
}));

const NavitarMap: React.FC = () => {
  const [center, setCenter] = useState<MapLocation>({ lat: 0, lng: 0 });
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | RealmPortal | null>(null);
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const { location } = useLocation();
  const { userNavitars } = useNavitar();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [realmPortals, setRealmPortals] = useState<RealmPortal[]>([]);
  const navigate = useNavigate();

  // Custom map style to match Pokémon GO aesthetic
  const mapOptions = {
    styles: [
      {
        featureType: 'landscape',
        elementType: 'all',
        stylers: [{ color: '#e4e4e4' }]
      },
      {
        featureType: 'water',
        elementType: 'all',
        stylers: [{ color: '#a3ccff' }]
      },
      {
        featureType: 'poi',
        elementType: 'all',
        stylers: [{ visibility: 'simplified' }]
      },
      {
        featureType: 'road',
        elementType: 'all',
        stylers: [{ color: '#ffffff' }]
      }
    ],
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: false
  };

  // Menu options for different categories
  const menuCategories = [
    {
      title: 'Battle',
      icon: <ViewInArIcon />,
      subItems: ['Arena Battles', 'Training Ground', 'Tournament']
    },
    {
      title: 'Social',
      icon: <PeopleIcon />,
      subItems: ['Friends', 'Teams', 'Chat']
    },
    {
      title: 'Marketplace',
      icon: <StorefrontIcon />,
      subItems: ['Shop', 'Trade', 'Auction House']
    },
    {
      title: 'Inventory',
      icon: <InventoryIcon />,
      subItems: ['Navitars', 'Items', 'Collections']
    },
    {
      title: 'Leaderboards',
      icon: <LeaderboardIcon />,
      subItems: ['Global Ranking', 'Local Ranking', 'Team Ranking']
    }
  ];

  useEffect(() => {
    // Get user's location
    if (location) {
      setCenter(location);
      setUserLocation(location);
    }
  }, [location]);

  useEffect(() => {
    // Simulate fetching nearby markers
    const fetchNearbyMarkers = async () => {
      // This would be replaced with actual API calls
      const mockMarkers: MapMarker[] = [
        {
          id: '1',
          position: { lat: center.lat + 0.001, lng: center.lng + 0.001 },
          type: 'business',
          title: 'Ice Cream Shop',
          description: 'Special Navitar battles available!',
          reward: 100
        },
        {
          id: '2',
          position: { lat: center.lat - 0.001, lng: center.lng - 0.001 },
          type: 'hotspot',
          title: 'Downtown Plaza',
          description: 'Popular gathering spot for Navitar trainers'
        },
        {
          id: '3',
          position: { lat: center.lat + 0.002, lng: center.lng - 0.002 },
          type: 'wild_navitar',
          title: 'Wild Frostbite Dragon',
          rarity: 'rare',
          description: 'A rare ice dragon appeared!'
        }
      ];

      setMarkers(mockMarkers);
    };

    if (center.lat !== 0 && center.lng !== 0) {
      fetchNearbyMarkers();
    }
  }, [center]);

  useEffect(() => {
    // Simulate fetching realm portals
    const mockPortals: RealmPortal[] = [
      {
        id: '1',
        position: { lat: center.lat + 0.003, lng: center.lng + 0.003 },
        name: 'Frozen Peaks',
        type: 'ice',
        radius: 100,
        activeUsers: 15,
        powerLevel: 8
      },
      {
        id: '2',
        position: { lat: center.lat - 0.002, lng: center.lng + 0.002 },
        name: 'Crystal Cave',
        type: 'ice',
        radius: 150,
        activeUsers: 23,
        powerLevel: 12
      }
    ];
    setRealmPortals(mockPortals);
  }, [center]);

  const getMarkerIcon = (type: string, rarity?: string) => {
    // Replace these with actual icon paths
    switch (type) {
      case 'business':
        return '/assets/markers/business.png';
      case 'hotspot':
        return '/assets/markers/hotspot.png';
      case 'wild_navitar':
        return `/assets/markers/navitar_${rarity || 'common'}.png`;
      case 'user_navitar':
        return '/assets/markers/user_navitar.png';
      default:
        return '/assets/markers/default.png';
    }
  };

  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleNavigate = (category: string, item: string) => {
    // Navigate to the selected feature
    navigate(`/${category.toLowerCase()}/${item.toLowerCase().replace(' ', '-')}`);
    handleMenuClose();
  };

  const handleEnterAR = () => {
    navigate('/ar-view');
  };

  const getPortalColor = (type: string) => {
    switch (type) {
      case 'ice': return '#81D4FA';
      case 'fire': return '#FF5722';
      case 'nature': return '#4CAF50';
      case 'cosmic': return '#9C27B0';
      default: return '#2196F3';
    }
  };

  const renderMarkerInfo = (marker: MapMarker) => {
    return (
      <MarkerInfo>
        <Typography variant="h6" color="primary">
          {marker.title}
        </Typography>
        {marker.rarity && (
          <Chip
            label={marker.rarity.toUpperCase()}
            color={
              marker.rarity === 'legendary' ? 'error' :
              marker.rarity === 'epic' ? 'secondary' :
              marker.rarity === 'rare' ? 'primary' : 'default'
            }
            size="small"
            sx={{ mb: 1 }}
          />
        )}
        <Typography variant="body2">
          {marker.description}
        </Typography>
        {marker.reward && (
          <Typography variant="body2" color="success.main">
            Reward: {marker.reward} points
          </Typography>
        )}
      </MarkerInfo>
    );
  };

  const renderPortalInfo = (portal: RealmPortal) => (
    <MarkerInfo>
      <Typography variant="h6" color="primary">
        {portal.name}
      </Typography>
      <Chip
        label={`${portal.type.toUpperCase()} REALM`}
        sx={{ backgroundColor: getPortalColor(portal.type), color: 'white', mb: 1 }}
      />
      <Typography variant="body2">
        Active Users: {portal.activeUsers}
      </Typography>
      <Typography variant="body2">
        Power Level: {portal.powerLevel}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 1 }}
        onClick={() => handleEnterAR()}
      >
        Enter Realm
      </Button>
    </MarkerInfo>
  );

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100vh' }}>
      <NavigationMenu>
        <IconButton
          size="large"
          onClick={handleDrawerToggle}
          sx={{ backgroundColor: 'white' }}
        >
          <MenuIcon />
        </IconButton>
      </NavigationMenu>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
      >
        <Box sx={{ width: 280 }}>
          <List>
            {menuCategories.map((category) => (
              <React.Fragment key={category.title}>
                <ListItem>
                  <ListItemIcon>{category.icon}</ListItemIcon>
                  <ListItemText primary={category.title} />
                </ListItem>
                <List component="div" disablePadding>
                  {category.subItems.map((item) => (
                    <ListItem
                      key={item}
                      button
                      sx={{ pl: 4 }}
                      onClick={() => handleNavigate(category.title, item)}
                    >
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Drawer>

      <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY">
        <GoogleMap
          mapContainerStyle={mapStyles}
          center={center}
          zoom={15}
          options={mapOptions}
          onLoad={map => {
            mapRef.current = map;
          }}
        >
          {/* User location marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                url: '/assets/markers/user.png',
                scaledSize: new window.google.maps.Size(40, 40)
              }}
            />
          )}

          {/* Other markers */}
          {markers.map(marker => (
            <Marker
              key={marker.id}
              position={marker.position}
              icon={{
                url: getMarkerIcon(marker.type, marker.rarity),
                scaledSize: new window.google.maps.Size(40, 40)
              }}
              onClick={() => handleMarkerClick(marker)}
            />
          ))}

          {/* Realm Portals */}
          {realmPortals.map(portal => (
            <React.Fragment key={portal.id}>
              <Circle
                center={portal.position}
                radius={portal.radius}
                options={{
                  fillColor: getPortalColor(portal.type),
                  fillOpacity: 0.2,
                  strokeColor: getPortalColor(portal.type),
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
              />
              <Marker
                position={portal.position}
                icon={{
                  url: `/assets/markers/portal_${portal.type}.png`,
                  scaledSize: new window.google.maps.Size(50, 50)
                }}
                onClick={() => setSelectedMarker(portal)}
              />
            </React.Fragment>
          ))}

          {/* Info windows */}
          {selectedMarker && (
            <InfoWindow
              position={selectedMarker.position}
              onCloseClick={() => setSelectedMarker(null)}
            >
              {'type' in selectedMarker
                ? renderPortalInfo(selectedMarker as RealmPortal)
                : renderMarkerInfo(selectedMarker as MapMarker)
              }
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>

      <ARButton
        color="primary"
        onClick={handleEnterAR}
      >
        <ViewInArIcon />
      </ARButton>

      <MapOverlay>
        <Box>
          <Typography variant="h6">
            Nearby: {markers.length} locations • {realmPortals.length} portals
          </Typography>
          <Typography variant="body2">
            {markers.filter(m => m.type === 'wild_navitar').length} wild Navitars
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Badge badgeContent={userNavitars?.length || 0} color="primary">
            <IconButton color="primary">
              <img src="/assets/icons/navitar.png" alt="Navitars" width="24" height="24" />
            </IconButton>
          </Badge>
          <Badge badgeContent={realmPortals.length} color="secondary">
            <IconButton color="primary">
              <PortalIcon />
            </IconButton>
          </Badge>
        </Box>
      </MapOverlay>
    </Box>
  );
};

export default NavitarMap; 