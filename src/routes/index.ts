import express from 'express';
import { UserManagementService } from '../services/UserManagementService';
import { ARRealmManager } from '../services/ARRealmManager';
import { EmailService } from '../services/EmailService';
import { VerificationService } from '../services/VerificationService';
import { setupUserRoutes } from './user';
import { setupBusinessRoutes } from './business';
import { setupRealmRoutes } from './realm';
import { setupEventRoutes } from './event';
import { setupAuthRoutes } from './auth';

interface Services {
    userManagementService: UserManagementService;
    arRealmManager: ARRealmManager;
    emailService: EmailService;
    verificationService: VerificationService;
}

export function setupRoutes(app: express.Application, services: Services): void {
    // Health check route
    app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    // Setup route groups
    setupAuthRoutes(app, services);
    setupUserRoutes(app, services);
    setupBusinessRoutes(app, services);
    setupRealmRoutes(app, services);
    setupEventRoutes(app, services);

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });
} 