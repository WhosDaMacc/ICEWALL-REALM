import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface RealmPortal {
  id: string;
  name: string;
  type: 'ice' | 'fire' | 'nature' | 'shadow' | 'light';
  location: {
    lat: number;
    lng: number;
  };
  level: number;
  isActive: boolean;
  nearbyPortals: string[];
  specialFusion: {
    partnerId: string;
    fusionName: string;
    energyCost: number;
  } | null;
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
}

const initialPortals: RealmPortal[] = [
  {
    id: 'ice1',
    name: 'Frost Gate',
    type: 'ice',
    location: { lat: 40.7128, lng: -74.0060 },
    level: 1,
    isActive: true,
    nearbyPortals: ['fire1'],
    specialFusion: {
      partnerId: 'nature1',
      fusionName: 'Frozen Garden',
      energyCost: 50
    }
  },
  {
    id: 'fire1',
    name: 'Blaze Gate',
    type: 'fire',
    location: { lat: 40.7129, lng: -74.0061 },
    level: 1,
    isActive: true,
    nearbyPortals: ['ice1'],
    specialFusion: {
      partnerId: 'shadow1',
      fusionName: 'Shadow Flame',
      energyCost: 50
    }
  }
];

const RealmContext = createContext<RealmContextType | undefined>(undefined);

export const RealmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [portals, setPortals] = useState<RealmPortal[]>(initialPortals);
  const [activePortal, setActivePortal] = useState<RealmPortal | null>(null);
  const [nearbyPortals, setNearbyPortals] = useState<RealmPortal[]>([]);

  const addPortal = (portal: RealmPortal) => {
    setPortals(prev => [...prev, portal]);
  };

  const removePortal = (portalId: string) => {
    setPortals(prev => prev.filter(p => p.id !== portalId));
  };

  const updatePortal = (portal: RealmPortal) => {
    setPortals(prev => prev.map(p => p.id === portal.id ? portal : p));
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
    <RealmContext.Provider value={{
      portals,
      activePortal,
      nearbyPortals,
      setActivePortal,
      addPortal,
      removePortal,
      updatePortal,
      refreshNearbyPortals
    }}>
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