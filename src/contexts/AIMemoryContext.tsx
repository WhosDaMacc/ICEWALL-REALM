import React, { createContext, useContext, useState, useCallback } from 'react';

interface Memory {
  id: string;
  timestamp: number;
  type: 'interaction' | 'learning' | 'fact';
  content: string;
  context: {
    location?: { latitude: number; longitude: number };
    user?: string;
    avatarId?: string;
  };
  importance: number; // 0-1 scale
}

interface AIMemoryContextType {
  memories: Memory[];
  addMemory: (memory: Omit<Memory, 'id' | 'timestamp'>) => void;
  getRelevantMemories: (query: string, limit?: number) => Memory[];
  learnFromInteraction: (interaction: any) => void;
  shareMemory: (memoryId: string, targetAvatarId: string) => void;
  getAvatarMemories: (avatarId: string) => Memory[];
}

const AIMemoryContext = createContext<AIMemoryContextType>({
  memories: [],
  addMemory: () => {},
  getRelevantMemories: () => [],
  learnFromInteraction: () => {},
  shareMemory: () => {},
  getAvatarMemories: () => [],
});

export const useAIMemory = () => useContext(AIMemoryContext);

export const AIMemoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [memories, setMemories] = useState<Memory[]>([]);

  const addMemory = useCallback((memory: Omit<Memory, 'id' | 'timestamp'>) => {
    const newMemory: Memory = {
      ...memory,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    setMemories(prev => [...prev, newMemory]);
  }, []);

  const getRelevantMemories = useCallback((query: string, limit: number = 5) => {
    // Simple relevance scoring based on content matching
    const scoredMemories = memories.map(memory => ({
      memory,
      score: calculateRelevanceScore(memory.content, query),
    }));

    return scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.memory);
  }, [memories]);

  const learnFromInteraction = useCallback((interaction: any) => {
    // Extract key information from the interaction
    const learningPoints = extractLearningPoints(interaction);
    
    learningPoints.forEach(point => {
      addMemory({
        type: 'learning',
        content: point,
        context: {
          location: interaction.location,
          user: interaction.user,
          avatarId: interaction.avatarId,
        },
        importance: 0.7, // Default importance for learned information
      });
    });
  }, [addMemory]);

  const shareMemory = useCallback((memoryId: string, targetAvatarId: string) => {
    const memory = memories.find(m => m.id === memoryId);
    if (memory) {
      addMemory({
        ...memory,
        context: {
          ...memory.context,
          avatarId: targetAvatarId,
        },
        importance: memory.importance * 0.9, // Slightly reduce importance when shared
      });
    }
  }, [memories, addMemory]);

  const getAvatarMemories = useCallback((avatarId: string) => {
    return memories.filter(memory => memory.context.avatarId === avatarId);
  }, [memories]);

  // Helper functions
  const calculateRelevanceScore = (content: string, query: string): number => {
    const contentWords = content.toLowerCase().split(' ');
    const queryWords = query.toLowerCase().split(' ');
    const matches = queryWords.filter(word => contentWords.includes(word));
    return matches.length / queryWords.length;
  };

  const extractLearningPoints = (interaction: any): string[] => {
    // This is a simple implementation. You could enhance this with NLP
    const points: string[] = [];
    
    if (interaction.message) {
      // Extract key phrases or facts
      const sentences = interaction.message.split(/[.!?]+/);
      sentences.forEach(sentence => {
        if (sentence.length > 20) { // Simple heuristic for meaningful content
          points.push(sentence.trim());
        }
      });
    }

    return points;
  };

  return (
    <AIMemoryContext.Provider
      value={{
        memories,
        addMemory,
        getRelevantMemories,
        learnFromInteraction,
        shareMemory,
        getAvatarMemories,
      }}
    >
      {children}
    </AIMemoryContext.Provider>
  );
}; 