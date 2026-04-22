import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry Error Monitoring.
 * Set SENTRY_DSN environment variable to enable in production.
 * When SENTRY_DSN is absent (local dev), Sentry runs in no-op mode.
 */
export function initSentry() {
    if (!process.env.SENTRY_DSN) {
        console.log('[Sentry] ⚠️  SENTRY_DSN not set — error tracking disabled');
        return;
    }

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        integrations: [
            nodeProfilingIntegration(),
        ],
        // Capture 100% of transactions in dev, 10% in prod
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Don't send health check pings to Sentry
        ignoreErrors: ['/health'],
    });

    console.log(`[Sentry] ✅ Initialized (env: ${process.env.NODE_ENV || 'development'})`);
}

export { Sentry };
