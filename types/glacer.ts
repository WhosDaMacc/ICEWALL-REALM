export interface StorageNode {
    provider: string;
    capacity: number;
    reliability: number;
    active: boolean;
}

export interface NavitarData {
    id: number;
    owner: string;
    quantumStorageHash: string;
    storageLevel: number;
    battlePower: number;
    lastUpdate: Date;
}

export interface StorageReward {
    provider: string;
    amount: number;
    timestamp: Date;
} 