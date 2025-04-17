import React, { createContext, useContext, useState, useCallback } from 'react';
import { useRealm } from './RealmContext';

interface Reward {
  id: string;
  type: 'daily' | 'achievement' | 'special' | 'rival';
  title: string;
  description: string;
  points: number;
  status: 'available' | 'claimed' | 'expired';
  expirationDate?: Date;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in meters
  };
}

interface RivalAvatar {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  lastSeen: {
    location: {
      latitude: number;
      longitude: number;
    };
    timestamp: Date;
  };
  status: 'active' | 'captured' | 'escaped';
  rewardPoints: number;
}

interface RewardContextType {
  rewards: Reward[];
  rivalAvatars: RivalAvatar[];
  availableRewards: Reward[];
  activeRivals: RivalAvatar[];
  claimReward: (rewardId: string) => void;
  updateRivalStatus: (rivalId: string, status: RivalAvatar['status']) => void;
  getNearbyRivals: (location: { latitude: number; longitude: number }, radius?: number) => RivalAvatar[];
  addRivalSighting: (rival: Omit<RivalAvatar, 'id' | 'status'>) => void;
  refreshRewards: () => void;
  getLocationRewards: (location: { latitude: number; longitude: number }) => Reward[];
}

const RewardContext = createContext<RewardContextType>({
  rewards: [],
  rivalAvatars: [],
  availableRewards: [],
  activeRivals: [],
  claimReward: () => {},
  updateRivalStatus: () => {},
  getNearbyRivals: () => [],
  addRivalSighting: () => {},
  refreshRewards: () => {},
  getLocationRewards: () => [],
});

export const useReward = () => useContext(RewardContext);

export const RewardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rivalAvatars, setRivalAvatars] = useState<RivalAvatar[]>([]);
  const { currentRealm } = useRealm();

  // Calculate distance between two points in meters
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }, []);

  const availableRewards = rewards.filter(reward => 
    reward.status === 'available' && 
    (!reward.expirationDate || new Date(reward.expirationDate) > new Date())
  );

  const activeRivals = rivalAvatars.filter(rival => 
    rival.status === 'active' && 
    new Date(rival.lastSeen.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
  );

  const claimReward = useCallback((rewardId: string) => {
    setRewards(prev => 
      prev.map(reward => 
        reward.id === rewardId 
          ? { ...reward, status: 'claimed' }
          : reward
      )
    );
  }, []);

  const updateRivalStatus = useCallback((rivalId: string, status: RivalAvatar['status']) => {
    setRivalAvatars(prev => 
      prev.map(rival => 
        rival.id === rivalId 
          ? { ...rival, status }
          : rival
      )
    );
  }, []);

  const getNearbyRivals = useCallback((location: { latitude: number; longitude: number }, radius: number = 1000) => {
    return activeRivals
      .filter(rival => {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          rival.lastSeen.location.latitude,
          rival.lastSeen.location.longitude
        );
        return distance <= radius;
      })
      .sort((a, b) => b.rewardPoints - a.rewardPoints); // Sort by reward points
  }, [activeRivals, calculateDistance]);

  const addRivalSighting = useCallback((rival: Omit<RivalAvatar, 'id' | 'status'>) => {
    const newRival: RivalAvatar = {
      ...rival,
      id: Date.now().toString(),
      status: 'active',
    };
    setRivalAvatars(prev => [...prev, newRival]);
  }, []);

  const getLocationRewards = useCallback((location: { latitude: number; longitude: number }) => {
    return availableRewards.filter(reward => 
      reward.location && 
      calculateDistance(
        location.latitude,
        location.longitude,
        reward.location.latitude,
        reward.location.longitude
      ) <= reward.location.radius
    );
  }, [availableRewards, calculateDistance]);

  const refreshRewards = useCallback(() => {
    // Generate new rewards based on realm activity
    if (currentRealm) {
      const newRewards: Reward[] = [
        {
          id: Date.now().toString(),
          type: 'daily',
          title: 'Daily Check-in',
          description: 'Check in to earn points',
          points: 100,
          status: 'available',
          expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        {
          id: (Date.now() + 1).toString(),
          type: 'achievement',
          title: 'Realm Explorer',
          description: 'Visit 5 different locations in the realm',
          points: 500,
          status: 'available',
        },
        // Add location-based rewards
        {
          id: (Date.now() + 2).toString(),
          type: 'special',
          title: 'Realm Center Visit',
          description: 'Visit the center of the realm',
          points: 200,
          status: 'available',
          location: {
            latitude: currentRealm.latitude,
            longitude: currentRealm.longitude,
            radius: 100, // 100 meters radius
          },
        },
      ];

      setRewards(prev => [...prev, ...newRewards]);
    }
  }, [currentRealm]);

  return (
    <RewardContext.Provider
      value={{
        rewards,
        rivalAvatars,
        availableRewards,
        activeRivals,
        claimReward,
        updateRivalStatus,
        getNearbyRivals,
        addRivalSighting,
        refreshRewards,
        getLocationRewards,
      }}
    >
      {children}
    </RewardContext.Provider>
  );
}; 