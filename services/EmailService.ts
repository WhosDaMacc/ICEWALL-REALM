import nodemailer from 'nodemailer';
import { EmailTemplate } from '../types/email';

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async sendVerificationEmail(email: string): Promise<void> {
        const verificationCode = this.generateVerificationCode();
        const template = this.getEmailTemplate('verification', {
            code: verificationCode
        });

        await this.sendEmail({
            to: email,
            subject: 'Verify Your ICEWALL REALM Account',
            html: template
        });
    }

    async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
        const template = this.getEmailTemplate('password-reset', {
            resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
        });

        await this.sendEmail({
            to: email,
            subject: 'Reset Your ICEWALL REALM Password',
            html: template
        });
    }

    async sendAccountDisabledEmail(email: string, reason: string): Promise<void> {
        const template = this.getEmailTemplate('account-disabled', {
            reason
        });

        await this.sendEmail({
            to: email,
            subject: 'Your ICEWALL REALM Account Has Been Disabled',
            html: template
        });
    }

    async sendAccountEnabledEmail(email: string): Promise<void> {
        const template = this.getEmailTemplate('account-enabled');

        await this.sendEmail({
            to: email,
            subject: 'Your ICEWALL REALM Account Has Been Enabled',
            html: template
        });
    }

    async sendWelcomeEmail(email: string, username: string): Promise<void> {
        const template = this.getEmailTemplate('welcome', {
            username
        });

        await this.sendEmail({
            to: email,
            subject: 'Welcome to ICEWALL REALM!',
            html: template
        });
    }

    private async sendEmail(options: nodemailer.SendMailOptions): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_FROM,
                ...options
            });
        } catch (error) {
            console.error('Failed to send email:', error);
            throw error;
        }
    }

    private generateVerificationCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    private getEmailTemplate(type: string, data?: any): string {
        const templates: Record<string, EmailTemplate> = {
            verification: {
                subject: 'Verify Your Account',
                html: `
                    <h1>Welcome to ICEWALL REALM!</h1>
                    <p>Please verify your email address using the following code:</p>
                    <h2>${data.code}</h2>
                    <p>This code will expire in 24 hours.</p>
                `
            },
            'password-reset': {
                subject: 'Reset Your Password',
                html: `
                    <h1>Password Reset Request</h1>
                    <p>Click the link below to reset your password:</p>
                    <a href="${data.resetLink}">Reset Password</a>
                    <p>This link will expire in 1 hour.</p>
                `
            },
            'account-disabled': {
                subject: 'Account Disabled',
                html: `
                    <h1>Account Disabled</h1>
                    <p>Your account has been disabled for the following reason:</p>
                    <p>${data.reason}</p>
                    <p>If you believe this is a mistake, please contact support.</p>
                `
            },
            'account-enabled': {
                subject: 'Account Enabled',
                html: `
                    <h1>Account Enabled</h1>
                    <p>Your account has been re-enabled. You can now log in again.</p>
                `
            },
            welcome: {
                subject: 'Welcome to ICEWALL REALM',
                html: `
                    <h1>Welcome ${data.username}!</h1>
                    <p>Thank you for joining ICEWALL REALM. We're excited to have you on board!</p>
                    <p>Start your journey by creating your first Navitar and exploring the realms.</p>
                `
            }
        };

        return templates[type].html;
    }
} 