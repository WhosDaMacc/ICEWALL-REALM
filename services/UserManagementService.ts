import { ethers } from 'ethers';
import { UserProfile, AccountStatus, VerificationStatus } from '../types/user';

export class UserManagementService {
    private provider: ethers.providers.Provider;
    private contract: ethers.Contract;
    private emailService: EmailService;
    private verificationService: VerificationService;

    constructor(
        provider: ethers.providers.Provider,
        contractAddress: string,
        abi: any
    ) {
        this.provider = provider;
        this.contract = new ethers.Contract(contractAddress, abi, provider);
        this.emailService = new EmailService();
        this.verificationService = new VerificationService();
    }

    async createUserProfile(
        email: string,
        username: string,
        password: string,
        walletAddress: string
    ): Promise<UserProfile> {
        // Validate input
        if (!this.isValidEmail(email)) {
            throw new Error('Invalid email format');
        }
        if (!this.isValidUsername(username)) {
            throw new Error('Invalid username');
        }
        if (!this.isValidPassword(password)) {
            throw new Error('Password does not meet requirements');
        }

        // Create user profile
        const profile: UserProfile = {
            email,
            username,
            walletAddress,
            status: AccountStatus.PENDING_VERIFICATION,
            verificationStatus: VerificationStatus.UNVERIFIED,
            createdAt: new Date(),
            lastLogin: new Date(),
            navitarIds: [],
            reputation: 0
        };

        // Store profile in contract
        await this.contract.createUserProfile(
            email,
            username,
            walletAddress,
            await this.hashPassword(password)
        );

        // Send verification email
        await this.emailService.sendVerificationEmail(email);

        return profile;
    }

    async verifyEmail(email: string, verificationCode: string): Promise<boolean> {
        const isValid = await this.verificationService.verifyEmailCode(email, verificationCode);
        if (isValid) {
            await this.contract.updateUserStatus(email, AccountStatus.ACTIVE);
            return true;
        }
        return false;
    }

    async login(email: string, password: string): Promise<UserProfile> {
        const profile = await this.contract.getUserProfile(email);
        if (!profile) {
            throw new Error('User not found');
        }

        if (profile.status === AccountStatus.DISABLED) {
            throw new Error('Account is disabled');
        }

        const isValidPassword = await this.verifyPassword(password, profile.passwordHash);
        if (!isValidPassword) {
            throw new Error('Invalid password');
        }

        // Update last login
        await this.contract.updateLastLogin(email);

        return this.parseUserProfile(profile);
    }

    async updateProfile(
        email: string,
        updates: Partial<UserProfile>
    ): Promise<UserProfile> {
        const profile = await this.contract.getUserProfile(email);
        if (!profile) {
            throw new Error('User not found');
        }

        // Update profile in contract
        await this.contract.updateUserProfile(email, updates);

        return this.parseUserProfile(profile);
    }

    async disableAccount(email: string, reason: string): Promise<void> {
        await this.contract.disableAccount(email, reason);
        await this.emailService.sendAccountDisabledEmail(email, reason);
    }

    async enableAccount(email: string): Promise<void> {
        await this.contract.enableAccount(email);
        await this.emailService.sendAccountEnabledEmail(email);
    }

    async resetPassword(email: string): Promise<void> {
        const resetToken = await this.generateResetToken();
        await this.contract.setResetToken(email, resetToken);
        await this.emailService.sendPasswordResetEmail(email, resetToken);
    }

    async updatePassword(
        email: string,
        resetToken: string,
        newPassword: string
    ): Promise<void> {
        if (!this.isValidPassword(newPassword)) {
            throw new Error('Password does not meet requirements');
        }

        const isValidToken = await this.contract.verifyResetToken(email, resetToken);
        if (!isValidToken) {
            throw new Error('Invalid reset token');
        }

        await this.contract.updatePassword(
            email,
            await this.hashPassword(newPassword)
        );
    }

    private async hashPassword(password: string): Promise<string> {
        // Implement secure password hashing
        return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(password));
    }

    private async verifyPassword(
        password: string,
        hash: string
    ): Promise<boolean> {
        const passwordHash = await this.hashPassword(password);
        return passwordHash === hash;
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private isValidUsername(username: string): boolean {
        return username.length >= 3 && username.length <= 20;
    }

    private isValidPassword(password: string): boolean {
        return (
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password)
        );
    }

    private async generateResetToken(): Promise<string> {
        return ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(
                Math.random().toString() + Date.now().toString()
            )
        );
    }

    private parseUserProfile(rawProfile: any): UserProfile {
        return {
            email: rawProfile.email,
            username: rawProfile.username,
            walletAddress: rawProfile.walletAddress,
            status: rawProfile.status,
            verificationStatus: rawProfile.verificationStatus,
            createdAt: new Date(rawProfile.createdAt * 1000),
            lastLogin: new Date(rawProfile.lastLogin * 1000),
            navitarIds: rawProfile.navitarIds.map((id: any) => id.toNumber()),
            reputation: rawProfile.reputation.toNumber()
        };
    }
} 