import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Navitar {
  id: string;
  name: string;
  type: 'ice' | 'fire' | 'nature' | 'shadow' | 'light';
  level: number;
  health: number;
  energy: number;
  moves: Move[];
  personality: string;
  image: string;
}

export interface Move {
  name: string;
  type: 'ice' | 'fire' | 'nature' | 'shadow' | 'light';
  damage: number;
  energyCost: number;
  cooldown: number;
  description: string;
}

interface NavitarContextType {
  selectedNavitar: Navitar | null;
  setSelectedNavitar: (navitar: Navitar | null) => void;
  navitars: Navitar[];
  addNavitar: (navitar: Navitar) => void;
  removeNavitar: (id: string) => void;
  updateNavitar: (id: string, updates: Partial<Navitar>) => void;
}

const NavitarContext = createContext<NavitarContextType | undefined>(undefined);

export const NavitarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedNavitar, setSelectedNavitar] = useState<Navitar | null>(null);
  const [navitars, setNavitars] = useState<Navitar[]>([]);

  const addNavitar = (navitar: Navitar) => {
    setNavitars(prev => [...prev, navitar]);
  };

  const removeNavitar = (id: string) => {
    setNavitars(prev => prev.filter(n => n.id !== id));
    if (selectedNavitar?.id === id) {
      setSelectedNavitar(null);
    }
  };

  const updateNavitar = (id: string, updates: Partial<Navitar>) => {
    setNavitars(prev => prev.map(n => 
      n.id === id ? { ...n, ...updates } : n
    ));
    if (selectedNavitar?.id === id) {
      setSelectedNavitar(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  return (
    <NavitarContext.Provider value={{
      selectedNavitar,
      setSelectedNavitar,
      navitars,
      addNavitar,
      removeNavitar,
      updateNavitar
    }}>
      {children}
    </NavitarContext.Provider>
  );
};

export const useNavitar = () => {
  const context = useContext(NavitarContext);
  if (context === undefined) {
    throw new Error('useNavitar must be used within a NavitarProvider');
  }
  return context;
}; 