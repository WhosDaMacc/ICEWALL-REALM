import React, { createContext, useContext, useState, useCallback } from 'react';

interface Business {
  id: string;
  name: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
  };
  navitar?: {
    name: string;
    level: number;
    skills: string[];
    stats: {
      strength: number;
      defense: number;
      speed: number;
      stamina: number;
    };
  };
}

interface BusinessContextType {
  businesses: Business[];
  addBusiness: (business: Omit<Business, 'id'>) => void;
  updateBusinessNavitar: (businessId: string, navitar: Business['navitar']) => void;
  getBusinessById: (id: string) => Business | undefined;
}

const BusinessContext = createContext<BusinessContextType>({
  businesses: [],
  addBusiness: () => {},
  updateBusinessNavitar: () => {},
  getBusinessById: () => undefined,
});

export const useBusiness = () => useContext(BusinessContext);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);

  const addBusiness = useCallback((business: Omit<Business, 'id'>) => {
    const newBusiness: Business = {
      ...business,
      id: Date.now().toString(),
    };
    setBusinesses(prev => [...prev, newBusiness]);
  }, []);

  const updateBusinessNavitar = useCallback((businessId: string, navitar: Business['navitar']) => {
    setBusinesses(prev =>
      prev.map(business =>
        business.id === businessId
          ? { ...business, navitar }
          : business
      )
    );
  }, []);

  const getBusinessById = useCallback((id: string) => {
    return businesses.find(business => business.id === id);
  }, [businesses]);

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        addBusiness,
        updateBusinessNavitar,
        getBusinessById,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}; 