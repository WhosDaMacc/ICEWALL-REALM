import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { json } from 'body-parser';
import { errorHandler } from '../error-handling';
import { setupAuthMiddleware } from './auth';
import { setupLoggingMiddleware } from './logging';

export function setupMiddleware(app: express.Application): void {
    // Security middleware
    app.use(helmet());
    app.use(cors({
        origin: process.env.FRONTEND_URL,
        credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX || '100')
    });
    app.use(limiter);

    // Body parsing
    app.use(json());

    // Logging middleware
    setupLoggingMiddleware(app);

    // Authentication middleware
    setupAuthMiddleware(app);

    // Error handling
    app.use(errorHandler);
} 