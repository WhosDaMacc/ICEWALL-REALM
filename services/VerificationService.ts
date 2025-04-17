import { ethers } from 'ethers';
import { VerificationStatus } from '../types/user';

export class VerificationService {
    private verificationCodes: Map<string, { code: string; expires: number }> = new Map();
    private readonly CODE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

    async generateVerificationCode(email: string): Promise<string> {
        const code = this.generateRandomCode();
        const expires = Date.now() + this.CODE_EXPIRY;

        this.verificationCodes.set(email, { code, expires });
        return code;
    }

    async verifyEmailCode(email: string, code: string): Promise<boolean> {
        const stored = this.verificationCodes.get(email);
        if (!stored) return false;

        if (Date.now() > stored.expires) {
            this.verificationCodes.delete(email);
            return false;
        }

        const isValid = stored.code === code;
        if (isValid) {
            this.verificationCodes.delete(email);
        }

        return isValid;
    }

    async verifyWalletAddress(
        address: string,
        signature: string,
        message: string
    ): Promise<boolean> {
        try {
            const recoveredAddress = ethers.utils.verifyMessage(message, signature);
            return recoveredAddress.toLowerCase() === address.toLowerCase();
        } catch (error) {
            return false;
        }
    }

    async verifyNavitarOwnership(
        navitarId: number,
        ownerAddress: string
    ): Promise<boolean> {
        // Implementation for verifying Navitar ownership
        // This would typically involve checking the blockchain
        return true;
    }

    async verifyRealmAccess(
        realmId: string,
        userAddress: string
    ): Promise<boolean> {
        // Implementation for verifying realm access
        // This would typically involve checking permissions
        return true;
    }

    private generateRandomCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    private cleanupExpiredCodes(): void {
        const now = Date.now();
        for (const [email, data] of this.verificationCodes.entries()) {
            if (now > data.expires) {
                this.verificationCodes.delete(email);
            }
        }
    }
} 