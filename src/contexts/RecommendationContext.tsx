import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAIMemory } from './AIMemoryContext';

interface Place {
  id: string;
  name: string;
  type: 'restaurant' | 'shop' | 'attraction' | 'event';
  location: {
    latitude: number;
    longitude: number;
  };
  description: string;
  rating?: number;
  priceRange?: '$' | '$$' | '$$$';
  tags: string[];
  distance: number; // in meters
}

interface RecommendationContextType {
  places: Place[];
  getNearbyPlaces: (location: { latitude: number; longitude: number }, radius?: number) => Place[];
  getRecommendations: (preferences: string[], location: { latitude: number; longitude: number }) => Place[];
  addPlace: (place: Omit<Place, 'id' | 'distance'>) => void;
  updatePlaceRating: (placeId: string, rating: number) => void;
  getPlaceDetails: (placeId: string) => Place | undefined;
}

const RecommendationContext = createContext<RecommendationContextType>({
  places: [],
  getNearbyPlaces: () => [],
  getRecommendations: () => [],
  addPlace: () => {},
  updatePlaceRating: () => {},
  getPlaceDetails: () => undefined,
});

export const useRecommendation = () => useContext(RecommendationContext);

export const RecommendationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const { memories, getRelevantMemories } = useAIMemory();

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

  const getNearbyPlaces = useCallback((location: { latitude: number; longitude: number }, radius: number = 1000) => {
    return places
      .map(place => ({
        ...place,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          place.location.latitude,
          place.location.longitude
        )
      }))
      .filter(place => place.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [places, calculateDistance]);

  const getRecommendations = useCallback((preferences: string[], location: { latitude: number; longitude: number }) => {
    const nearbyPlaces = getNearbyPlaces(location);
    
    // Get relevant memories about user preferences
    const preferenceMemories = getRelevantMemories(preferences.join(' '), 5);
    
    // Score places based on preferences and memories
    const scoredPlaces = nearbyPlaces.map(place => {
      let score = 0;
      
      // Match with preferences
      preferences.forEach(pref => {
        if (place.tags.includes(pref.toLowerCase())) {
          score += 2;
        }
      });
      
      // Check memories for relevant information
      preferenceMemories.forEach(memory => {
        if (memory.content.toLowerCase().includes(place.name.toLowerCase())) {
          score += 1;
        }
      });
      
      // Consider rating if available
      if (place.rating) {
        score += place.rating;
      }
      
      // Consider distance (closer is better)
      score += (1000 - Math.min(place.distance, 1000)) / 100;
      
      return { place, score };
    });
    
    return scoredPlaces
      .sort((a, b) => b.score - a.score)
      .map(item => item.place)
      .slice(0, 5); // Return top 5 recommendations
  }, [getNearbyPlaces, getRelevantMemories]);

  const addPlace = useCallback((place: Omit<Place, 'id' | 'distance'>) => {
    const newPlace: Place = {
      ...place,
      id: Date.now().toString(),
      distance: 0, // Will be calculated when needed
    };
    setPlaces(prev => [...prev, newPlace]);
  }, []);

  const updatePlaceRating = useCallback((placeId: string, rating: number) => {
    setPlaces(prev => 
      prev.map(place => 
        place.id === placeId 
          ? { ...place, rating: (place.rating || 0 + rating) / 2 }
          : place
      )
    );
  }, []);

  const getPlaceDetails = useCallback((placeId: string) => {
    return places.find(place => place.id === placeId);
  }, [places]);

  return (
    <RecommendationContext.Provider
      value={{
        places,
        getNearbyPlaces,
        getRecommendations,
        addPlace,
        updatePlaceRating,
        getPlaceDetails,
      }}
    >
      {children}
    </RecommendationContext.Provider>
  );
}; 