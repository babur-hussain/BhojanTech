import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import * as Sentry from '@sentry/node';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let code = 'UNKNOWN_ERROR';

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.errorCode || 'APP_ERROR';
        // Report 5xx operational errors to Sentry
        if (statusCode >= 500) Sentry.captureException(err);
    } else if (err.name === 'ValidationError' || err.name === 'CastError') {
        // Mongoose errors — never report to Sentry (client mistake)
        statusCode = 400;
        message = err.message;
        code = 'DATABASE_VALIDATION_ERROR';
    } else {
        // Unknown / programmer error — always report
        Sentry.captureException(err);
    }

    // Log non-operational (unhandled) errors
    if (!(err instanceof AppError) || !err.isOperational) {
        logger.error(`Error 💥: ${err.message}`, { stack: err.stack, path: req.path, method: req.method });
    } else if (statusCode >= 500) {
        logger.error(`Operational Error 💥: ${err.message}`, { path: req.path, method: req.method });
    }

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message
        }
    });
};

