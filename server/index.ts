import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createConnection } from 'typeorm';
import { UserManagementService } from './services/UserManagementService';
import { ARRealmManager } from './services/ARRealmManager';
import { EmailService } from './services/EmailService';
import { VerificationService } from './services/VerificationService';
import { setupRoutes } from './routes';
import { setupMiddleware } from './middleware';
import { setupErrorHandling } from './error-handling';
import { setupLogging } from './logging';

const app = express();
const port = process.env.PORT || 3000;

async function startServer() {
    try {
        // Setup logging
        setupLogging();

        // Connect to database
        await createConnection({
            type: 'postgres',
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            entities: ['src/entities/**/*.ts'],
            migrations: ['src/database/migrations/**/*.ts'],
            synchronize: process.env.NODE_ENV === 'development',
            logging: process.env.NODE_ENV === 'development'
        });

        // Initialize services
        const userManagementService = new UserManagementService();
        const arRealmManager = new ARRealmManager();
        const emailService = new EmailService();
        const verificationService = new VerificationService();

        // Setup middleware
        setupMiddleware(app);

        // Setup routes
        setupRoutes(app, {
            userManagementService,
            arRealmManager,
            emailService,
            verificationService
        });

        // Setup error handling
        setupErrorHandling(app);

        // Start server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer(); 