export interface EmailTemplate {
    subject: string;
    html: string;
}

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    from?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: EmailAttachment[];
}

export interface EmailAttachment {
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
}

export interface EmailVerification {
    email: string;
    code: string;
    expiresAt: Date;
}

export interface PasswordReset {
    email: string;
    token: string;
    expiresAt: Date;
}

export interface NotificationPreferences {
    email: boolean;
    push: boolean;
    frequency: 'instant' | 'daily' | 'weekly';
    categories: {
        battles: boolean;
        achievements: boolean;
        social: boolean;
        updates: boolean;
    };
} 