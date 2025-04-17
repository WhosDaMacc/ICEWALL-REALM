import React, { createContext, useContext, useState, useCallback } from 'react';
import { useRealm } from './RealmContext';
import { useUser } from './UserContext';

interface User {
  id: string;
  name: string;
  interests: string[];
  profession: string;
  mutualConnections: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  status?: {
    message: string;
    timestamp: Date;
    isActive: boolean;
  };
}

interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  location: string;
  attendees: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface SecretMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  type: 'message' | 'nudge';
}

interface NetworkingContextType {
  nearbyUsers: User[];
  upcomingEvents: Event[];
  secretMessages: SecretMessage[];
  setStatus: (message: string) => void;
  sendSecretMessage: (to: string, content: string, type: 'message' | 'nudge') => void;
  markMessageAsRead: (messageId: string) => void;
  getNearbyUsers: (location: { latitude: number; longitude: number }, radius?: number) => User[];
  getUpcomingEvents: (location: { latitude: number; longitude: number }, radius?: number) => Event[];
  getUnreadMessages: () => SecretMessage[];
  refreshNetworking: () => void;
}

const NetworkingContext = createContext<NetworkingContextType>({
  nearbyUsers: [],
  upcomingEvents: [],
  secretMessages: [],
  setStatus: () => {},
  sendSecretMessage: () => {},
  markMessageAsRead: () => {},
  getNearbyUsers: () => [],
  getUpcomingEvents: () => [],
  getUnreadMessages: () => [],
  refreshNetworking: () => {},
});

export const useNetworking = () => useContext(NetworkingContext);

export const NetworkingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [secretMessages, setSecretMessages] = useState<SecretMessage[]>([]);
  const { currentRealm } = useRealm();
  const { userProfile } = useUser();

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

  const setStatus = useCallback((message: string) => {
    if (userProfile) {
      setNearbyUsers(prev => 
        prev.map(user => 
          user.id === userProfile.id
            ? { ...user, status: { message, timestamp: new Date(), isActive: true } }
            : user
        )
      );
    }
  }, [userProfile]);

  const sendSecretMessage = useCallback((to: string, content: string, type: 'message' | 'nudge') => {
    if (userProfile) {
      const newMessage: SecretMessage = {
        id: Date.now().toString(),
        from: userProfile.id,
        to,
        content,
        timestamp: new Date(),
        isRead: false,
        type,
      };
      setSecretMessages(prev => [...prev, newMessage]);
    }
  }, [userProfile]);

  const markMessageAsRead = useCallback((messageId: string) => {
    setSecretMessages(prev => 
      prev.map(message => 
        message.id === messageId
          ? { ...message, isRead: true }
          : message
      )
    );
  }, []);

  const getUnreadMessages = useCallback(() => {
    if (!userProfile) return [];
    return secretMessages.filter(
      message => message.to === userProfile.id && !message.isRead
    );
  }, [secretMessages, userProfile]);

  const getNearbyUsers = useCallback((location: { latitude: number; longitude: number }, radius: number = 1000) => {
    return nearbyUsers
      .filter(user => 
        user.location && 
        calculateDistance(
          location.latitude,
          location.longitude,
          user.location.latitude,
          user.location.longitude
        ) <= radius
      )
      .sort((a, b) => b.mutualConnections - a.mutualConnections); // Sort by mutual connections
  }, [nearbyUsers, calculateDistance]);

  const getUpcomingEvents = useCallback((location: { latitude: number; longitude: number }, radius: number = 2000) => {
    return upcomingEvents
      .filter(event => 
        calculateDistance(
          location.latitude,
          location.longitude,
          event.coordinates.latitude,
          event.coordinates.longitude
        ) <= radius
      )
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()); // Sort by start time
  }, [upcomingEvents, calculateDistance]);

  const refreshNetworking = useCallback(() => {
    if (currentRealm) {
      // Generate mock data for demonstration
      const mockUsers: User[] = [
        {
          id: '1',
          name: 'Alex Chen',
          interests: ['Web3', 'AR/VR', 'Blockchain'],
          profession: 'Blockchain Developer',
          mutualConnections: 3,
          location: {
            latitude: currentRealm.latitude + 0.0001,
            longitude: currentRealm.longitude + 0.0001,
          },
          status: {
            message: 'Looking to collaborate on Web3 projects',
            timestamp: new Date(),
            isActive: true,
          },
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          interests: ['AI', 'Machine Learning', 'Data Science'],
          profession: 'AI Researcher',
          mutualConnections: 2,
          location: {
            latitude: currentRealm.latitude - 0.0001,
            longitude: currentRealm.longitude - 0.0001,
          },
          status: {
            message: 'Open to discussing AI applications in AR',
            timestamp: new Date(),
            isActive: true,
          },
        },
      ];

      const mockEvents: Event[] = [
        {
          id: '1',
          title: 'Web3 Meetup',
          description: 'Join us for a discussion about the future of Web3 and blockchain technology.',
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          location: 'Realm Center',
          attendees: 15,
          coordinates: {
            latitude: currentRealm.latitude,
            longitude: currentRealm.longitude,
          },
        },
        {
          id: '2',
          title: 'AR Development Workshop',
          description: 'Hands-on workshop for building AR experiences with WebXR.',
          startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
          location: 'Innovation Hub',
          attendees: 8,
          coordinates: {
            latitude: currentRealm.latitude + 0.0002,
            longitude: currentRealm.longitude + 0.0002,
          },
        },
      ];

      setNearbyUsers(mockUsers);
      setUpcomingEvents(mockEvents);
    }
  }, [currentRealm]);

  return (
    <NetworkingContext.Provider
      value={{
        nearbyUsers,
        upcomingEvents,
        secretMessages,
        setStatus,
        sendSecretMessage,
        markMessageAsRead,
        getNearbyUsers,
        getUpcomingEvents,
        getUnreadMessages,
        refreshNetworking,
      }}
    >
      {children}
    </NetworkingContext.Provider>
  );
}; 