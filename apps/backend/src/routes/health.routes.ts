import express from 'express';
import mongoose from 'mongoose';
import { redis } from '../config/redis';
import { s3Client } from '../config/s3';
import { ListBucketsCommand } from '@aws-sdk/client-s3';

const router: express.Router = express.Router();

router.get('/', async (req, res) => {
    const status: any = {
        timestamp: new Date().toISOString(),
        status: 'ok',
        services: {
            mongodb: 'unknown',
            redis: 'unknown',
            s3: 'unknown'
        }
    };

    let hasError = false;

    // Check MongoDB
    try {
        const state = mongoose.connection.readyState;
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        if (state === 1) {
            status.services.mongodb = 'connected';
        } else {
            status.services.mongodb = 'disconnected';
            hasError = true;
        }
    } catch (err) {
        status.services.mongodb = 'error';
        hasError = true;
    }

    // Check Redis
    try {
        const ping = await redis.ping();
        if (ping === 'PONG') {
            status.services.redis = 'connected';
        } else {
            status.services.redis = 'disconnected';
            hasError = true;
        }
    } catch (err) {
        status.services.redis = 'error';
        hasError = true;
    }

    // Check S3 (just check if client is instantiated and we can build a command)
    // Usually we'd check if we can list buckets, but that requires broad permissions.
    // We'll just verify the AWS config is somewhat present.
    try {
        if (process.env.AWS_ACCESS_KEY_ID) {
            status.services.s3 = 'configured';
        } else {
            status.services.s3 = 'missing_credentials';
        }
    } catch (err) {
        status.services.s3 = 'error';
    }

    if (hasError) {
        status.status = 'degraded';
        res.status(503).json(status);
    } else {
        res.status(200).json(status);
    }
});

export default router;
