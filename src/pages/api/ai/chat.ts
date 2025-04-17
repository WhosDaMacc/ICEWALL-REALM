import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

interface ChatRequest {
  message: string;
  personality: string;
  avatarId: string;
  context?: {
    location?: { latitude: number; longitude: number };
    previousMessages?: string[];
    preferences?: string[];
    rewards?: Array<{
      id: string;
      type: string;
      title: string;
      status: string;
    }>;
    rivals?: Array<{
      name: string;
      rarity: string;
      lastSeen: {
        location: { latitude: number; longitude: number };
        timestamp: string;
      };
      rewardPoints: number;
    }>;
    networking?: {
      nearbyUsers: Array<{
        id: string;
        name: string;
        interests: string[];
        profession: string;
        mutualConnections: number;
      }>;
      events: Array<{
        id: string;
        title: string;
        description: string;
        startTime: string;
        location: string;
        attendees: number;
      }>;
    };
  };
}

interface ChatResponse {
  response: string;
  error?: string;
  learned?: string[];
  recommendations?: {
    places: Array<{
      name: string;
      type: string;
      description: string;
      distance: number;
    }>;
  };
  rewards?: {
    available: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      points: number;
    }>;
    claimed: Array<{
      id: string;
      type: string;
      title: string;
      points: number;
    }>;
  };
  rivals?: Array<{
    name: string;
    rarity: string;
    distance: number;
    rewardPoints: number;
  }>;
  networking?: {
    opportunities: Array<{
      type: 'user' | 'event';
      id: string;
      title: string;
      description: string;
      iceBreaker?: string;
      mutualInterests?: string[];
    }>;
  };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory storage for conversation history
const conversationHistory: Record<string, any[]> = {};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ response: '', error: 'Method not allowed' });
  }

  try {
    const { message, personality, avatarId, context } = req.body as ChatRequest;

    // Get conversation history for this avatar
    const history = conversationHistory[avatarId] || [];
    
    // Create system message with personality and context
    const systemMessage = {
      role: 'system',
      content: `You are an AI avatar with the following personality: ${personality}. 
      You are friendly, helpful, and engaging. Keep your responses concise and natural.
      You can see the user's location and context.
      You have memory of previous interactions and can learn from them.
      When you learn something new, mention it in your response.
      You can suggest places to visit based on the user's location and preferences.
      You can also inform users about available rewards and rival avatars in their area.
      You can identify networking opportunities and suggest ice breakers for nearby users.
      When suggesting places, include:
      - The name of the place
      - What type of place it is (restaurant, shop, attraction, etc.)
      - A brief description
      - How far it is from the user's current location
      When mentioning rewards, include:
      - The reward title
      - How to claim it
      - The points value
      When alerting about rivals, include:
      - The rival's name and rarity
      - Their last known location
      - The reward points for capturing them
      When suggesting networking opportunities, include:
      - The person's name and profession
      - Mutual interests or connections
      - A natural ice breaker question or topic
      When mentioning events, include:
      - The event title and description
      - Start time and location
      - Number of attendees
      Format your recommendations in a friendly, conversational way.`
    };

    // Add context from previous messages
    const contextMessages = history.slice(-5).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add location and preferences context
    const locationContext = context?.location 
      ? `The user is currently at latitude ${context.location.latitude}, longitude ${context.location.longitude}.`
      : '';
    
    const preferencesContext = context?.preferences?.length
      ? `The user's preferences include: ${context.preferences.join(', ')}.`
      : '';

    // Add rewards context
    const rewardsContext = context?.rewards?.length
      ? `Available rewards: ${context.rewards
          .filter(r => r.status === 'available')
          .map(r => `${r.title} (${r.type})`)
          .join(', ')}.`
      : '';

    // Add rivals context
    const rivalsContext = context?.rivals?.length
      ? `Nearby rival avatars: ${context.rivals
          .map(r => `${r.name} (${r.rarity}) - ${r.rewardPoints} points`)
          .join(', ')}.`
      : '';

    // Add networking context
    const networkingContext = context?.networking
      ? `Networking opportunities: ${
          context.networking.nearbyUsers.length
            ? `Nearby users: ${context.networking.nearbyUsers
                .map(u => `${u.name} (${u.profession}) - ${u.mutualConnections} mutual connections`)
                .join(', ')}.`
            : ''
        } ${
          context.networking.events.length
            ? `Upcoming events: ${context.networking.events
                .map(e => `${e.title} - ${e.attendees} attendees`)
                .join(', ')}.`
            : ''
        }`
      : '';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        systemMessage,
        ...contextMessages,
        { 
          role: 'user', 
          content: `${locationContext} ${preferencesContext} ${rewardsContext} ${rivalsContext} ${networkingContext} ${message}` 
        }
      ],
      temperature: 0.7,
      max_tokens: 250,
    });

    const response = completion.choices[0].message.content || '';

    // Extract learning points from the response
    const learned = extractLearningPoints(response);

    // Extract recommendations from the response
    const recommendations = extractRecommendations(response);

    // Extract rewards from the response
    const rewards = extractRewards(response, context?.rewards || []);

    // Extract rivals from the response
    const rivals = extractRivals(response, context?.rivals || [], context?.location);

    // Extract networking opportunities from the response
    const networking = extractNetworking(response, context?.networking);

    // Update conversation history
    conversationHistory[avatarId] = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: response }
    ].slice(-10); // Keep last 10 messages

    res.status(200).json({ 
      response,
      learned: learned.length > 0 ? learned : undefined,
      recommendations: recommendations.places.length > 0 ? recommendations : undefined,
      rewards: rewards.available.length > 0 ? rewards : undefined,
      rivals: rivals.length > 0 ? rivals : undefined,
      networking: networking.opportunities.length > 0 ? networking : undefined
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      response: '', 
      error: 'Failed to process AI chat request' 
    });
  }
}

function extractLearningPoints(response: string): string[] {
  const points: string[] = [];
  const sentences = response.split(/[.!?]+/);
  
  sentences.forEach((sentence: string) => {
    if (
      sentence.includes('I learned') ||
      sentence.includes('I now know') ||
      sentence.includes('I understand') ||
      sentence.includes('I remember')
    ) {
      points.push(sentence.trim());
    }
  });

  return points;
}

function extractRecommendations(response: string): { places: Array<{ name: string; type: string; description: string; distance: number }> } {
  const places: Array<{ name: string; type: string; description: string; distance: number }> = [];
  
  // Look for patterns like "I recommend [place name]" or "You should check out [place name]"
  const recommendationPatterns = [
    /I recommend (.*?)(?:,|\.|$)/g,
    /You should check out (.*?)(?:,|\.|$)/g,
    /How about visiting (.*?)(?:,|\.|$)/g,
  ];

  recommendationPatterns.forEach(pattern => {
    const matches = response.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        // Extract place details from the recommendation
        const placeText = match[1].trim();
        const distanceMatch = placeText.match(/(\d+)\s*(?:meters|m|km|kilometers)/i);
        const distance = distanceMatch ? parseInt(distanceMatch[1]) * (distanceMatch[0].toLowerCase().includes('km') ? 1000 : 1) : 0;

        places.push({
          name: placeText.split(',')[0].trim(),
          type: extractPlaceType(placeText),
          description: placeText,
          distance,
        });
      }
    }
  });

  return { places };
}

function extractRewards(response: string, availableRewards: any[]): { available: any[]; claimed: any[] } {
  const available: any[] = [];
  const claimed: any[] = [];

  // Look for patterns like "You can claim [reward]" or "Don't forget to [reward action]"
  const rewardPatterns = [
    /You can claim (.*?)(?:,|\.|$)/g,
    /Don't forget to (.*?)(?:,|\.|$)/g,
    /You should (.*?)(?:,|\.|$)/g,
  ];

  rewardPatterns.forEach(pattern => {
    const matches = response.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const rewardText = match[1].trim();
        const matchingReward = availableRewards.find(r => 
          rewardText.toLowerCase().includes(r.title.toLowerCase())
        );
        if (matchingReward) {
          if (matchingReward.status === 'available') {
            available.push(matchingReward);
          } else if (matchingReward.status === 'claimed') {
            claimed.push(matchingReward);
          }
        }
      }
    }
  });

  return { available, claimed };
}

function extractRivals(response: string, nearbyRivals: any[], userLocation?: { latitude: number; longitude: number }): any[] {
  const rivals: any[] = [];
  
  // Look for patterns like "I spotted [rival name]" or "There's a [rarity] rival nearby"
  const rivalPatterns = [
    /I spotted (.*?)(?:,|\.|$)/g,
    /There's a (.*?)(?:,|\.|$)/g,
    /Watch out for (.*?)(?:,|\.|$)/g,
  ];

  rivalPatterns.forEach(pattern => {
    const matches = response.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const rivalText = match[1].trim();
        const matchingRival = nearbyRivals.find(r => 
          rivalText.toLowerCase().includes(r.name.toLowerCase())
        );
        if (matchingRival && userLocation) {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            matchingRival.lastSeen.location.latitude,
            matchingRival.lastSeen.location.longitude
          );
          rivals.push({
            ...matchingRival,
            distance
          });
        }
      }
    }
  });

  return rivals;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
}

function extractPlaceType(text: string): string {
  const typePatterns = [
    { pattern: /restaurant|cafe|bar|pub/i, type: 'restaurant' },
    { pattern: /shop|store|boutique/i, type: 'shop' },
    { pattern: /museum|gallery|exhibit/i, type: 'attraction' },
    { pattern: /park|garden|square/i, type: 'attraction' },
    { pattern: /event|concert|show|performance/i, type: 'event' },
  ];

  for (const { pattern, type } of typePatterns) {
    if (pattern.test(text)) {
      return type;
    }
  }

  return 'place';
}

function extractNetworking(response: string, networkingContext?: any): { opportunities: Array<{ type: 'user' | 'event'; id: string; title: string; description: string; iceBreaker?: string; mutualInterests?: string[] }> } {
  const opportunities: Array<{ type: 'user' | 'event'; id: string; title: string; description: string; iceBreaker?: string; mutualInterests?: string[] }> = [];
  
  // Look for patterns like "I noticed [person]" or "There's an event [event name]"
  const networkingPatterns = [
    /I noticed (.*?)(?:,|\.|$)/g,
    /There's an event (.*?)(?:,|\.|$)/g,
    /You might want to meet (.*?)(?:,|\.|$)/g,
  ];

  networkingPatterns.forEach(pattern => {
    const matches = response.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const text = match[1].trim();
        
        // Check if it's a user mention
        const matchingUser = networkingContext?.nearbyUsers.find((u: any) => 
          text.toLowerCase().includes(u.name.toLowerCase())
        );
        
        if (matchingUser) {
          opportunities.push({
            type: 'user',
            id: matchingUser.id,
            title: matchingUser.name,
            description: `${matchingUser.profession} with ${matchingUser.mutualConnections} mutual connections`,
            iceBreaker: generateIceBreaker(matchingUser),
            mutualInterests: matchingUser.interests,
          });
        }

        // Check if it's an event mention
        const matchingEvent = networkingContext?.events.find((e: any) => 
          text.toLowerCase().includes(e.title.toLowerCase())
        );
        
        if (matchingEvent) {
          opportunities.push({
            type: 'event',
            id: matchingEvent.id,
            title: matchingEvent.title,
            description: `${matchingEvent.description} - ${matchingEvent.attendees} attendees`,
          });
        }
      }
    }
  });

  return { opportunities };
}

function generateIceBreaker(user: any): string {
  const iceBreakers = [
    `I noticed you're interested in ${user.interests[0]}. What got you into that?`,
    `As a ${user.profession}, what's the most interesting project you've worked on recently?`,
    `I see we have ${user.mutualConnections} mutual connections. How do you know them?`,
    `What's your favorite thing about being a ${user.profession}?`,
    `I'm curious about your interest in ${user.interests[0]}. Any recommendations for someone new to it?`,
  ];
  
  return iceBreakers[Math.floor(Math.random() * iceBreakers.length)];
} 