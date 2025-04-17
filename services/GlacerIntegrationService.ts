import { ethers } from 'ethers';
import { GlacerIceWallIntegration__factory } from '../typechain';
import { StorageNode, NavitarData } from '../types/glacer';

export class GlacerIntegrationService {
    private contract: ethers.Contract;
    private provider: ethers.providers.Provider;
    private signer: ethers.Signer;

    constructor(
        contractAddress: string,
        provider: ethers.providers.Provider,
        signer: ethers.Signer
    ) {
        this.provider = provider;
        this.signer = signer;
        this.contract = GlacerIceWallIntegration__factory.connect(
            contractAddress,
            signer
        );
    }

    /**
     * Register a new storage node in the GLACER network
     */
    async registerStorageNode(capacity: number): Promise<void> {
        try {
            const tx = await this.contract.registerStorageNode(capacity);
            await tx.wait();
        } catch (error) {
            console.error('Failed to register storage node:', error);
            throw error;
        }
    }

    /**
     * Store Navitar data in the quantum storage network
     */
    async storeNavitarData(
        navitarId: number,
        battleData: any,
        battlePower: number
    ): Promise<void> {
        try {
            // Generate quantum storage hash
            const quantumHash = await this.generateQuantumHash(battleData);
            
            const tx = await this.contract.storeNavitarData(
                navitarId,
                quantumHash,
                battlePower
            );
            await tx.wait();
        } catch (error) {
            console.error('Failed to store Navitar data:', error);
            throw error;
        }
    }

    /**
     * Create a new Navitar with quantum storage integration
     */
    async createNavitar(ownerAddress: string): Promise<number> {
        try {
            const tx = await this.contract.createNavitar(ownerAddress);
            const receipt = await tx.wait();
            
            // Parse event logs to get the new Navitar ID
            const event = receipt.events?.find(
                (e: any) => e.event === 'NavitarCreated'
            );
            return event?.args?.navitarId.toNumber();
        } catch (error) {
            console.error('Failed to create Navitar:', error);
            throw error;
        }
    }

    /**
     * Retrieve Navitar data from quantum storage
     */
    async getNavitarData(navitarId: number): Promise<NavitarData> {
        try {
            const data = await this.contract.getNavitarData(navitarId);
            return this.parseNavitarData(data);
        } catch (error) {
            console.error('Failed to get Navitar data:', error);
            throw error;
        }
    }

    /**
     * Calculate and distribute storage rewards to providers
     */
    async distributeStorageRewards(providerAddress: string): Promise<void> {
        try {
            const tx = await this.contract.distributeStorageRewards(providerAddress);
            await tx.wait();
        } catch (error) {
            console.error('Failed to distribute storage rewards:', error);
            throw error;
        }
    }

    /**
     * Update storage node reliability score
     */
    async updateNodeReliability(
        providerAddress: string,
        reliability: number
    ): Promise<void> {
        try {
            const tx = await this.contract.updateStorageNodeReliability(
                providerAddress,
                reliability
            );
            await tx.wait();
        } catch (error) {
            console.error('Failed to update node reliability:', error);
            throw error;
        }
    }

    /**
     * Generate quantum-resistant hash for data storage
     */
    private async generateQuantumHash(data: any): Promise<string> {
        // Implement quantum-resistant hashing algorithm
        // This is a placeholder for the actual quantum hashing implementation
        const serializedData = JSON.stringify(data);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(serializedData);
        
        // Use SHA-3 as a placeholder for quantum-resistant hash
        const hashBuffer = await crypto.subtle.digest('SHA-384', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Parse raw Navitar data from contract
     */
    private parseNavitarData(rawData: any): NavitarData {
        return {
            id: rawData.id.toNumber(),
            owner: rawData.owner,
            quantumStorageHash: rawData.quantumStorageHash,
            storageLevel: rawData.storageLevel.toNumber(),
            battlePower: rawData.battlePower.toNumber(),
            lastUpdate: new Date(rawData.lastUpdate.toNumber() * 1000)
        };
    }
} 