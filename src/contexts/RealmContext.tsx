import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface RealmPortal {
  id: string;
  name: string;
  type:
    'ice' | 'fire' | 'nature' | 'shadow' | 'light' | 'quantum' | 'electric' | 'spiritual' | 'water';
  location: {
    lat: number;
    lng: number;
  };
  level: number;
  isActive: boolean;
  // Portal power as a 0–100 % (PortalDetails renders it as a progress bar
  // and gates entry on > 90). Seed data for now — no live feed yet.
  powerLevel: number;
  // Users currently checked in at this portal. 0 until a presence feed exists.
  activeUsers: number;
  nearbyPortals: string[];
  specialFusion: {
    partnerId: string;
    fusionName: string;
    energyCost: number;
  } | null;
  // Businesses attached to this portal (shown as markers in AR). Empty for
  // the demo portals — populated when a portal gets real businesses.
  businesses: { id: number; name: string }[];
  // Optional on-chain Realm fields (see contracts/RealmSystem.sol): the
  // human-readable place name and the arena radius in meters.
  locationName?: string;
  radius?: number;
}

// List view shaped like the on-chain Realm struct — what the older Home
// component renders (name, string location, business/event counts, active).
export interface RealmListItem {
  id: string;
  name: string;
  location: string;
  businesses: { id: number; name: string }[];
  eventIds: string[];
  active: boolean;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface RealmInteraction {
  user: string;
  timestamp: number;
  interactionType: string;
  data?: unknown;
  location?: unknown;
}

interface RealmContextType {
  portals: RealmPortal[];
  activePortal: RealmPortal | null;
  nearbyPortals: RealmPortal[];
  setActivePortal: (portal: RealmPortal | null) => void;
  addPortal: (portal: RealmPortal) => void;
  removePortal: (portalId: string) => void;
  updatePortal: (portal: RealmPortal) => void;
  refreshNearbyPortals: (currentLocation: { lat: number; lng: number }) => void;
  // Back-compat aliases used by ARView (written against the older context):
  // currentRealm is the active portal; loadRealm selects one by id.
  currentRealm: RealmPortal | null;
  loadRealm: (realmId: number | string) => void;
  interactions: RealmInteraction[];
  recordInteraction: (interactionType: string, data?: unknown, location?: unknown) => void;
  // Back-compat API used by components/Home.tsx (written against the
  // on-chain Realm shape): the portal list as realms, a createRealm that
  // matches contracts/RealmSystem.sol, and an isLoading flag (always false
  // in this local context — there is no async fetch here).
  realms: RealmListItem[];
  createRealm: (
    name: string,
    location: string,
    latitude: number,
    longitude: number,
    radius: number
  ) => Promise<void>;
  isLoading: boolean;
}

const initialPortals: RealmPortal[] = [
  {
    id: 'ice1',
    name: 'Frost Gate',
    type: 'ice',
    location: { lat: 40.7128, lng: -74.006 },
    level: 1,
    isActive: true,
    powerLevel: 75,
    activeUsers: 0,
    nearbyPortals: ['fire1'],
    specialFusion: {
      partnerId: 'nature1',
      fusionName: 'Frozen Garden',
      energyCost: 50,
    },
    businesses: [],
  },
  {
    id: 'fire1',
    name: 'Blaze Gate',
    type: 'fire',
    location: { lat: 40.7129, lng: -74.0061 },
    level: 1,
    isActive: true,
    powerLevel: 85,
    activeUsers: 0,
    nearbyPortals: ['ice1'],
    specialFusion: {
      partnerId: 'shadow1',
      fusionName: 'Shadow Flame',
      energyCost: 50,
    },
    businesses: [],
  },
];

const RealmContext = createContext<RealmContextType | undefined>(undefined);

export const RealmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [portals, setPortals] = useState<RealmPortal[]>(initialPortals);
  const [activePortal, setActivePortal] = useState<RealmPortal | null>(null);
  const [nearbyPortals, setNearbyPortals] = useState<RealmPortal[]>([]);
  const [interactions, setInteractions] = useState<RealmInteraction[]>([]);

  const loadRealm = (realmId: number | string) => {
    const found = portals.find(p => String(p.id) === String(realmId));
    if (found) setActivePortal(found);
  };

  const recordInteraction = (interactionType: string, data?: unknown, location?: unknown) => {
    setInteractions(prev => [
      ...prev,
      { user: 'you', timestamp: Date.now(), interactionType, data, location },
    ]);
  };

  // Realms list, shaped like the on-chain Realm struct, derived from portals.
  const realms: RealmListItem[] = portals.map(p => ({
    id: p.id,
    name: p.name,
    location: p.locationName ?? `${p.location.lat}, ${p.location.lng}`,
    businesses: p.businesses,
    eventIds: [],
    active: p.isActive,
    latitude: p.location.lat,
    longitude: p.location.lng,
    radius: p.radius ?? 0,
  }));

  const createRealm = async (
    name: string,
    location: string,
    latitude: number,
    longitude: number,
    radius: number
  ) => {
    const portal: RealmPortal = {
      id: `realm-${Date.now()}`,
      name,
      type: 'ice',
      location: { lat: latitude, lng: longitude },
      level: 1,
      isActive: true,
      powerLevel: 50,
      activeUsers: 0,
      nearbyPortals: [],
      specialFusion: null,
      businesses: [],
      locationName: location,
      radius,
    };
    setPortals(prev => [...prev, portal]);
  };

  const addPortal = (portal: RealmPortal) => {
    setPortals(prev => [...prev, portal]);
  };

  const removePortal = (portalId: string) => {
    setPortals(prev => prev.filter(p => p.id !== portalId));
  };

  const updatePortal = (portal: RealmPortal) => {
    setPortals(prev => prev.map(p => (p.id === portal.id ? portal : p)));
  };

  const refreshNearbyPortals = (currentLocation: { lat: number; lng: number }) => {
    const nearby = portals.filter(portal => {
      const distance = Math.sqrt(
        Math.pow(portal.location.lat - currentLocation.lat, 2) +
          Math.pow(portal.location.lng - currentLocation.lng, 2)
      );
      return distance <= 0.01; // Adjust this threshold as needed
    });
    setNearbyPortals(nearby);
  };

  return (
    <RealmContext.Provider
      value={{
        portals,
        activePortal,
        nearbyPortals,
        setActivePortal,
        addPortal,
        removePortal,
        updatePortal,
        refreshNearbyPortals,
        currentRealm: activePortal,
        loadRealm,
        interactions,
        recordInteraction,
        realms,
        createRealm,
        isLoading: false,
      }}
    >
      {children}
    </RealmContext.Provider>
  );
};

export const useRealm = () => {
  const context = useContext(RealmContext);
  if (context === undefined) {
    throw new Error('useRealm must be used within a RealmProvider');
  }
  return context;
};
