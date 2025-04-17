import { ethers } from 'ethers';
import { BusinessProfile, RealmSystem } from '../types/contracts';
import { ARRealmManager } from './ARRealmManager';

export interface IcebreakerGame {
    id: string;
    type: 'trivia' | 'scavenger' | 'quiz';
    title: string;
    description: string;
    questions: Question[];
    rewards: Reward[];
    participants: string[];
}

export interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number;
}

export interface Reward {
    type: 'token' | 'badge' | 'experience';
    amount: number;
    description: string;
}

export interface CommunityEvent {
    id: string;
    title: string;
    description: string;
    location: string;
    startTime: Date;
    endTime: Date;
    maxParticipants: number;
    currentParticipants: number;
    activities: string[];
}

export class SocialFeatures {
    private businessProfile: BusinessProfile;
    private realmSystem: RealmSystem;
    private arRealmManager: ARRealmManager;
    private activeGames: Map<string, IcebreakerGame> = new Map();
    private activeEvents: Map<string, CommunityEvent> = new Map();

    constructor(
        provider: ethers.providers.Provider,
        businessProfileAddress: string,
        realmSystemAddress: string,
        arRealmManager: ARRealmManager
    ) {
        this.businessProfile = new ethers.Contract(
            businessProfileAddress,
            BusinessProfile.abi,
            provider
        ) as BusinessProfile;
        this.realmSystem = new ethers.Contract(
            realmSystemAddress,
            RealmSystem.abi,
            provider
        ) as RealmSystem;
        this.arRealmManager = arRealmManager;
    }

    async createIcebreakerGame(
        realmId: string,
        type: 'trivia' | 'scavenger' | 'quiz',
        title: string,
        description: string,
        questions: Question[],
        rewards: Reward[]
    ): Promise<string> {
        const gameId = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(`${realmId}-${title}-${Date.now()}`)
        ).slice(0, 42);

        const game: IcebreakerGame = {
            id: gameId,
            type,
            title,
            description,
            questions,
            rewards,
            participants: []
        };

        this.activeGames.set(gameId, game);

        // Record the game creation in the realm
        await this.arRealmManager.recordInteraction(realmId, 'game_created', {
            gameId,
            type,
            title
        });

        return gameId;
    }

    async joinIcebreakerGame(gameId: string, participant: string): Promise<void> {
        const game = this.activeGames.get(gameId);
        if (!game) throw new Error('Game not found');

        if (!game.participants.includes(participant)) {
            game.participants.push(participant);
            this.activeGames.set(gameId, game);
        }
    }

    async submitAnswer(
        gameId: string,
        participant: string,
        questionId: string,
        answer: number
    ): Promise<boolean> {
        const game = this.activeGames.get(gameId);
        if (!game) throw new Error('Game not found');

        const question = game.questions.find(q => q.id === questionId);
        if (!question) throw new Error('Question not found');

        const isCorrect = question.correctAnswer === answer;
        
        if (isCorrect) {
            // Distribute rewards for correct answer
            await this.distributeRewards(gameId, participant, game.rewards);
        }

        return isCorrect;
    }

    private async distributeRewards(
        gameId: string,
        participant: string,
        rewards: Reward[]
    ): Promise<void> {
        for (const reward of rewards) {
            switch (reward.type) {
                case 'token':
                    // Implement token distribution logic
                    break;
                case 'badge':
                    // Implement badge distribution logic
                    break;
                case 'experience':
                    // Implement experience distribution logic
                    break;
            }
        }
    }

    async createCommunityEvent(
        realmId: string,
        title: string,
        description: string,
        location: string,
        startTime: Date,
        endTime: Date,
        maxParticipants: number,
        activities: string[]
    ): Promise<string> {
        const eventId = await this.arRealmManager.createEvent(
            realmId,
            title,
            description,
            startTime,
            endTime,
            maxParticipants
        );

        const event: CommunityEvent = {
            id: eventId,
            title,
            description,
            location,
            startTime,
            endTime,
            maxParticipants,
            currentParticipants: 0,
            activities
        };

        this.activeEvents.set(eventId, event);
        return eventId;
    }

    async joinCommunityEvent(eventId: string, participant: string): Promise<void> {
        const event = this.activeEvents.get(eventId);
        if (!event) throw new Error('Event not found');

        if (event.currentParticipants < event.maxParticipants) {
            event.currentParticipants++;
            this.activeEvents.set(eventId, event);
            await this.arRealmManager.joinEvent(eventId);
        } else {
            throw new Error('Event is full');
        }
    }

    async getActiveGames(realmId: string): Promise<IcebreakerGame[]> {
        return Array.from(this.activeGames.values())
            .filter(game => game.id.startsWith(realmId));
    }

    async getActiveEvents(realmId: string): Promise<CommunityEvent[]> {
        return Array.from(this.activeEvents.values())
            .filter(event => event.id.startsWith(realmId));
    }

    async getGameParticipants(gameId: string): Promise<string[]> {
        const game = this.activeGames.get(gameId);
        return game ? game.participants : [];
    }

    async getEventParticipants(eventId: string): Promise<string[]> {
        const event = this.activeEvents.get(eventId);
        if (!event) return [];

        const participants = await this.businessProfile.getEventParticipants(
            ethers.BigNumber.from(eventId)
        );
        return participants.map(p => p.toString());
    }
} 