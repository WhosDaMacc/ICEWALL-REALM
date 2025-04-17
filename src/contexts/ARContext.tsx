import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWeb3 } from './Web3Context';
import { useRealm } from './RealmContext';

interface ARContextType {
  isARActive: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  error: string | null;
  startAR: () => Promise<void>;
  stopAR: () => void;
  handleInteraction: (type: string, data: any) => Promise<void>;
  arObjects: any[];
  addARObject: (object: any) => void;
  removeARObject: (id: string) => void;
  updateARObject: (id: string, updates: any) => void;
}

const ARContext = createContext<ARContextType>({
  isARActive: false,
  currentLocation: null,
  error: null,
  startAR: async () => {},
  stopAR: () => {},
  handleInteraction: async () => {},
  arObjects: [],
  addARObject: () => {},
  removeARObject: () => {},
  updateARObject: () => {},
});

export const useAR = () => useContext(ARContext);

export const ARProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isConnected, account } = useWeb3();
  const { recordInteraction } = useRealm();
  const [isARActive, setIsARActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arObjects, setARObjects] = useState<any[]>([]);
  const [watchId, setWatchId] = useState<number | null>(null);

  const startAR = useCallback(async () => {
    try {
      if (!isConnected) {
        throw new Error('Please connect your wallet first');
      }

      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      const id = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          setError(`Geolocation error: ${err.message}`);
          stopAR();
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );

      setWatchId(id);
      setIsARActive(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start AR');
      setIsARActive(false);
    }
  }, [isConnected]);

  const stopAR = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsARActive(false);
    setCurrentLocation(null);
    setError(null);
    setARObjects([]);
  }, [watchId]);

  const handleInteraction = useCallback(async (type: string, data: any) => {
    try {
      if (!isConnected || !account) {
        throw new Error('Please connect your wallet first');
      }

      if (!currentLocation) {
        throw new Error('Location not available');
      }

      await recordInteraction(type, {
        ...data,
        location: currentLocation,
        timestamp: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record interaction');
    }
  }, [isConnected, account, currentLocation, recordInteraction]);

  const addARObject = useCallback((object: any) => {
    setARObjects((prev) => [...prev, { ...object, id: Date.now().toString() }]);
  }, []);

  const removeARObject = useCallback((id: string) => {
    setARObjects((prev) => prev.filter((obj) => obj.id !== id));
  }, []);

  const updateARObject = useCallback((id: string, updates: any) => {
    setARObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, ...updates } : obj))
    );
  }, []);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <ARContext.Provider
      value={{
        isARActive,
        currentLocation,
        error,
        startAR,
        stopAR,
        handleInteraction,
        arObjects,
        addARObject,
        removeARObject,
        updateARObject,
      }}
    >
      {children}
    </ARContext.Provider>
  );
}; 