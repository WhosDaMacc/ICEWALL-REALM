export enum AccountStatus {
    PENDING_VERIFICATION = 'PENDING_VERIFICATION',
    ACTIVE = 'ACTIVE',
    DISABLED = 'DISABLED',
    SUSPENDED = 'SUSPENDED'
}

export enum VerificationStatus {
    UNVERIFIED = 'UNVERIFIED',
    EMAIL_VERIFIED = 'EMAIL_VERIFIED',
    WALLET_VERIFIED = 'WALLET_VERIFIED',
    FULLY_VERIFIED = 'FULLY_VERIFIED'
}

export interface UserProfile {
    email: string;
    username: string;
    walletAddress: string;
    status: AccountStatus;
    verificationStatus: VerificationStatus;
    createdAt: Date;
    lastLogin: Date;
    navitarIds: number[];
    reputation: number;
}

export interface UserPreferences {
    emailNotifications: boolean;
    pushNotifications: boolean;
    theme: 'light' | 'dark';
    language: string;
    privacySettings: {
        showEmail: boolean;
        showWallet: boolean;
        showNavitars: boolean;
    };
}

export interface UserStats {
    battlesWon: number;
    battlesLost: number;
    realmsCreated: number;
    realmsJoined: number;
    totalExperience: number;
    achievements: string[];
}

export interface UserSession {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    deviceInfo: {
        type: string;
        os: string;
        browser: string;
        ip: string;
    };
} 