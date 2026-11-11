import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'class-validator';
import { HttpException } from '../exceptions/HttpException';
import { logger } from '../logging';

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    logger.error('Error:', {
        error: err,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query
    });

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
        return;
    }

    if (err instanceof HttpException) {
        res.status(err.status).json({
            status: 'error',
            message: err.message
        });
        return;
    }

    if (Array.isArray(err) && err[0] instanceof ValidationError) {
        const validationErrors = err.map((error: ValidationError) => ({
            property: error.property,
            constraints: error.constraints
        }));

        res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: validationErrors
        });
        return;
    }

    // Default error
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
} 